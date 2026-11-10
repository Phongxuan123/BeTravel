import { env } from "../../core/env.js";
import { AssistantKind, SourceTier } from "../../core/constants.js";
import { retrieve, retrieveArticlesBySlug } from "../retrieval.js";
import { getArticleIndex } from "./articleIndex.js";
import { guardAnswer } from "./guard.js";
import { buildAnswerSystemPrompt, buildUserPrompt } from "./prompts.js";
import { getAnswerProvider, getWebSearchProvider } from "./providers.js";
import { extractAnswer } from "./modelOutput.js";
import { detectLanguage, triageMessage } from "./triage.js";
import { runWebTier } from "./webTier.js";

/*
 * Pipeline tro ly ban 2 (docs/AI_V2_PLAN.md, CLAUDE.md Phan 4.2):
 *   phan loai --> (tu choi | hoi lai) hoac
 *   kho da kiem chung (published + isCurrent, xac minh lai) --> tra web --> kien thuc chung
 *   --> hau kiem bang code --> gan nhan tang nguon theo NGUON THAT da dung.
 * Ham nay KHONG ghi DB va KHONG tru quota: service lo phan do; script danh gia goi thang ham nay.
 */
const MAX_CHUNK_CHARS = 1200;

const FALLBACK_TEXT = {
  [AssistantKind.REFUSE_SCOPE]: {
    vi: "Trợ lý chỉ hỗ trợ các câu hỏi liên quan đến chuyến đi: luật, thủ tục, an toàn và sự cố.",
    en: "This assistant only helps with trip-related questions: laws, procedures, safety and incidents.",
  },
  [AssistantKind.REFUSE_HARM]: {
    vi: "Trợ lý không thể giúp việc này. Nếu bạn gặp khó khăn, hãy liên hệ cơ quan chức năng để được hướng dẫn hợp pháp.",
    en: "The assistant can't help with that. Please contact the relevant authority for lawful options.",
  },
  empty: {
    vi: "Chưa soạn được câu trả lời phù hợp. Bạn thử hỏi lại cụ thể hơn nhé.",
    en: "Couldn't prepare a suitable answer. Please try asking more specifically.",
  },
};

const pick = (texts, language) => texts[language] ?? texts.vi;

// Cong don token cua moi lan goi mo hinh trong mot luot de ghi chi phi (ai_events).
const createUsage = () => {
  const total = { inputTokens: 0, outputTokens: 0 };
  return {
    total,
    add: (usage) => {
      total.inputTokens += usage?.inputTokens ?? 0;
      total.outputTokens += usage?.outputTokens ?? 0;
    },
  };
};

// Gop cac chunk cung mot bai/van ban thanh MOT nguon [n] -- tranh hai so [1], [2] tro cung mot trang.
const groupChunksBySource = (chunks) => {
  const groups = new Map();
  for (const chunk of chunks) {
    const key = `${chunk.articleSlug || chunk.title}|${chunk.officialUrl ?? ""}`;
    const group = groups.get(key) ?? { ...chunkToCitation(chunk), texts: [] };
    const heading = chunk.heading ? `${chunk.heading}: ` : "";
    group.texts.push(`${heading}${chunk.text.slice(0, MAX_CHUNK_CHARS)}`);
    groups.set(key, group);
  }
  return [...groups.values()];
};

const toSourceBlocks = (groups) =>
  groups
    .map((group, index) => `[${index + 1}] ${group.title}\n${group.texts.join("\n")}`)
    .join("\n\n");

const chunkToCitation = (chunk) => ({
  title: chunk.title,
  url: chunk.officialUrl ?? "",
  authority: chunk.authority ?? "",
  articleSlug: chunk.articleSlug ?? "",
});

// Loi truy hoi khong lam hong luot hoi: ha xuong tang sau (web / kien thuc chung).
async function safely(label, task, fallback) {
  try {
    return await task();
  } catch (error) {
    console.error(`[assistant] ${label} loi:`, String(error?.message ?? error).slice(0, 200));
    return fallback;
  }
}

const NO_EVIDENCE = { passed: false, chunks: [], topScore: 0 };

/*
 * Hai duong vao kho, chay song song: (1) bai mo hinh chon tu muc luc, (2) tim theo tu khoa.
 * Bai duoc chon dung truoc; chunk trung bo bot; tong so chunk giu trong RAG_TOP_K.
 */
async function retrieveEvidence({ question, countryCode, keywords, articleSlugs }) {
  const [picked, lexical] = await Promise.all([
    safely(
      "truy hoi theo bai",
      () => retrieveArticlesBySlug({ countryCode, articleSlugs }),
      NO_EVIDENCE,
    ),
    safely("truy hoi", () => retrieve({ question, countryCode, keywords }), NO_EVIDENCE),
  ]);
  const passedLists = [picked, lexical].filter((result) => result.passed);
  if (passedLists.length === 0) return lexical;
  const seen = new Set();
  const chunks = passedLists
    .flatMap((result) => result.chunks)
    .filter((chunk) => !seen.has(chunk.chunkId) && seen.add(chunk.chunkId))
    .slice(0, env.RAG_TOP_K);
  return { passed: true, chunks, topScore: lexical.topScore ?? 0 };
}

async function generate({
  tier,
  question,
  history,
  tripContext,
  country,
  detailed,
  emergencyNumber,
  groups,
  usage,
  language,
}) {
  const raw = await getAnswerProvider().complete({
    systemPrompt: buildAnswerSystemPrompt({
      countryName: country.name,
      tier,
      detailed,
      emergencyNumber,
      language,
    }),
    userPrompt: buildUserPrompt({
      question,
      history,
      tripContext,
      sourceBlocks: groups.length ? toSourceBlocks(groups) : "",
    }),
    chunks: groups,
    question,
    maxOutputTokens: env.ASSISTANT_MAX_OUTPUT_TOKENS * (detailed ? 2 : 1),
    timeoutMs: env.ASSISTANT_TIMEOUT_MS,
    onUsage: usage.add,
  });
  return extractAnswer(raw);
}

// Dau ra rong / hong han: thu lai mot lan truoc khi bao "chua soan duoc".
async function generateWithRetry(params) {
  const first = await generate(params);
  return first.trim() ? first : generate(params);
}

// Chon tang nguon va soan cau tra loi tho (chua hau kiem). sources: danh sach nguon theo so [n].
async function composeAnswer(params) {
  const { question, country, usage, keywords, articleSlugs } = params;
  const retrieval = await retrieveEvidence({
    question,
    countryCode: country.code,
    keywords,
    articleSlugs,
  });
  if (retrieval.passed) {
    const groups = groupChunksBySource(retrieval.chunks);
    const answer = await generateWithRetry({ ...params, tier: SourceTier.OFFICIAL, groups });
    const sources = groups.map(({ texts: _texts, ...citation }) => citation);
    return { tier: SourceTier.OFFICIAL, answer, sources, retrieval };
  }
  const web = await runWebTier({ ...params, countryName: country.name, usage });
  if (web) {
    const sources = [];
    for (const source of web.sources)
      sources[source.n - 1] = {
        title: source.title ?? "",
        url: source.url,
        authority: "",
        articleSlug: "",
      };
    return { tier: SourceTier.WEB, answer: web.answer, sources, retrieval, webSearch: true };
  }
  const answer = await generateWithRetry({ ...params, tier: SourceTier.GENERAL, groups: [] });
  return {
    tier: SourceTier.GENERAL,
    answer,
    sources: [],
    retrieval,
    webSearch: getWebSearchProvider() !== null,
  };
}

const refusalOrClarify = (triage, language) => ({
  kind: triage.kind,
  content: triage.reply || pick(FALLBACK_TEXT[triage.kind] ?? FALLBACK_TEXT.empty, language),
  sourceTier: null,
  citations: [],
  clarifyOptions: triage.options,
  emergencyNumber: null,
});

/**
 * @returns {Promise<{kind, content, sourceTier, citations, clarifyOptions, emergencyNumber,
 *   meta:{question, chunkIds, topScore, usage, violations, webSearch}}>}
 */
export async function answerQuestion({
  message,
  history = [],
  country,
  tripContext = null,
  detailed = false,
}) {
  const usage = createUsage();
  const articleIndex = await safely("muc luc cam nang", () => getArticleIndex(country.code), null);
  const triage = await triageMessage({ message, history, articleIndex });
  const language = triage.language ?? detectLanguage(message);
  const baseMeta = {
    question: triage.question,
    chunkIds: [],
    topScore: 0,
    usage: usage.total,
    violations: [],
    webSearch: false,
  };

  if (triage.kind !== AssistantKind.ANSWER && triage.kind !== AssistantKind.EMERGENCY) {
    // Cau hoi lai / tu choi cung qua hau kiem: khong de con so khong nguon lot ra.
    const result = refusalOrClarify(triage, language);
    result.content = guardAnswer({
      answer: result.content,
      allowedNumbers: new Set(),
      language,
    }).text;
    return { ...result, meta: baseMeta };
  }

  const isEmergency = triage.kind === AssistantKind.EMERGENCY;
  const emergencyNumber = isEmergency
    ? country.emergencyNumbers?.police || country.emergencyNumbers?.ambulance || null
    : null;
  const composed = await composeAnswer({
    question: triage.question,
    history,
    tripContext,
    country,
    detailed,
    emergencyNumber,
    usage,
    keywords: triage.keywords,
    articleSlugs: triage.articleSlugs,
    language,
  });
  const allowedNumbers = new Set(
    composed.sources.map((source, index) => (source ? index + 1 : null)).filter(Boolean),
  );
  const guarded = guardAnswer({ answer: composed.answer, allowedNumbers, language });
  const citations = guarded.usedOriginalNumbers.map((original, index) => ({
    n: index + 1,
    ...composed.sources[original - 1],
  }));

  return {
    kind: triage.kind,
    content: guarded.text || pick(FALLBACK_TEXT.empty, language),
    // Nhan do CODE gan: tang co nguon ma khong trich nguon nao thi ha xuong kien thuc chung.
    sourceTier: citations.length ? composed.tier : SourceTier.GENERAL,
    citations,
    clarifyOptions: [],
    emergencyNumber,
    meta: {
      ...baseMeta,
      chunkIds: composed.retrieval?.chunks?.map((chunk) => chunk.chunkId) ?? [],
      topScore: composed.retrieval?.topScore ?? 0,
      violations: guarded.violations,
      webSearch: Boolean(composed.webSearch),
    },
  };
}
