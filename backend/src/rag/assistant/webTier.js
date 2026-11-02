import { env } from "../../core/env.js";
import { buildUserPrompt, buildWebSystemPrompt } from "./prompts.js";
import { getWebSearchProvider } from "./providers.js";
import { parseJsonObject } from "./triage.js";

const MAX_WEB_SOURCES = 6;

const isValidNumber = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_WEB_SOURCES;

const normalizeUrl = (url) =>
  String(url ?? "")
    .replace(/[#?].*$/, "")
    .replace(/\/+$/, "");

/*
 * Tang tra web (B1-d): mo hinh tu tra web roi tra JSON {answer, sources}. CHI giu nguon co URL nam
 * trong tap URL ma cong cu tim kiem THAT SU tra ve/mo (seenUrls) -- nguon mo hinh tu bia bi loai,
 * marker cua no bi guard.js xoa. Khong con nguon hop le nao --> null, noi goi chuyen sang tang
 * kien thuc chung. Loi mang/het gio cung tra null (khong lam hong luot hoi).
 */
export async function runWebTier({ question, history, tripContext, countryName, detailed, usage }) {
  const provider = getWebSearchProvider();
  if (!provider) return null;
  try {
    const result = await provider.search({
      instructions: buildWebSystemPrompt({ countryName, detailed }),
      input: buildUserPrompt({ question, history, tripContext }),
      allowedDomains: env.ASSISTANT_WEB_DOMAINS,
      maxOutputTokens: env.ASSISTANT_MAX_OUTPUT_TOKENS * 2,
      timeoutMs: env.ASSISTANT_WEB_TIMEOUT_MS,
    });
    usage.add(result.usage);
    const parsed = parseJsonObject(result.text);
    if (typeof parsed?.answer !== "string" || !parsed.answer.trim()) return null;
    const seen = new Set([...result.seenUrls].map(normalizeUrl));
    const sources = (Array.isArray(parsed.sources) ? parsed.sources : [])
      .filter((source) => isValidNumber(source?.n) && seen.has(normalizeUrl(source.url)))
      .slice(0, MAX_WEB_SOURCES);
    if (sources.length === 0) return null;
    return { answer: parsed.answer, sources };
  } catch (error) {
    console.error("[assistant] tra web loi:", String(error?.message ?? error).slice(0, 200));
    return null;
  }
}
