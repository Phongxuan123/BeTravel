import { env } from "../../core/env.js";
import { AssistantKind } from "../../core/constants.js";
import { TRIAGE_SYSTEM_PROMPT, buildUserPrompt } from "./prompts.js";
import { getTriageProvider } from "./providers.js";
import { parseRewriteJson } from "../queryRewrite.js";

const TRIAGE_MAX_OUTPUT_TOKENS = 400;
const MAX_OPTIONS = 4;
const MAX_OPTION_LENGTH = 60;
const MAX_ARTICLES = 3;

const INTENT_TO_KIND = Object.freeze({
  answer: AssistantKind.ANSWER,
  emergency: AssistantKind.EMERGENCY,
  clarify: AssistantKind.CLARIFY,
  out_of_scope: AssistantKind.REFUSE_SCOPE,
  harmful: AssistantKind.REFUSE_HARM,
});

// Lay object JSON dau tien trong van ban (mo hinh co the boc them chu hoac ```json).
export const parseJsonObject = (rawText) => {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(rawText.slice(start, end + 1));
  } catch {
    return null;
  }
};

const toOptions = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim().slice(0, MAX_OPTION_LENGTH))
    .slice(0, MAX_OPTIONS);

// Chi giu slug co that trong muc luc: mo hinh bia slug thi bo, khong de lot xuong truy hoi.
const toArticleSlugs = (value, knownSlugs) =>
  [...new Set(Array.isArray(value) ? value : [])]
    .filter((slug) => typeof slug === "string" && knownSlugs?.has(slug))
    .slice(0, MAX_ARTICLES);

// Phat hien ngon ngu tho: co dau tieng Viet --> vi, con lai la chu Latin khong dau --> en.
export const detectLanguage = (text) =>
  /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i.test(text) ? "vi" : "en";

/*
 * Buoc phu (mo hinh re): phan loai + viet lai cau hoi noi tiep thanh cau tu dung duoc.
 * Loi mo hinh KHONG lam hong luot hoi: coi nhu cau hoi binh thuong, giu nguyen van ban goc --
 * nguyen tac ban 2 la khong tu choi sai (R6).
 */
export async function triageMessage({ message, history, articleIndex = null }) {
  const fallback = {
    kind: AssistantKind.ANSWER,
    question: message,
    reply: "",
    options: [],
    articleSlugs: [],
  };
  try {
    const raw = await getTriageProvider().complete({
      systemPrompt: TRIAGE_SYSTEM_PROMPT,
      userPrompt: buildUserPrompt({ question: message, history, articleIndex: articleIndex?.text }),
      chunks: [],
      question: message,
      maxOutputTokens: TRIAGE_MAX_OUTPUT_TOKENS,
      timeoutMs: env.ASSISTANT_TIMEOUT_MS,
    });
    const parsed = parseJsonObject(raw);
    const kind = INTENT_TO_KIND[parsed?.intent];
    if (!kind) return fallback;
    const question = typeof parsed.question === "string" && parsed.question.trim();
    return {
      kind,
      question: question || message,
      reply: typeof parsed.reply === "string" ? parsed.reply.trim() : "",
      options: kind === AssistantKind.CLARIFY ? toOptions(parsed.options) : [],
      // Tu khoa tim kiem lay luon o buoc nay, bo mot lan goi mo hinh rieng (giam do tre, G3).
      keywords: parsed.keywords
        ? (parseRewriteJson(JSON.stringify(parsed.keywords)) ?? undefined)
        : undefined,
      articleSlugs: toArticleSlugs(parsed.articles, articleIndex?.slugs),
    };
  } catch (error) {
    console.error(
      "[assistant] phan loai cau hoi loi:",
      String(error?.message ?? error).slice(0, 200),
    );
    return fallback;
  }
}
