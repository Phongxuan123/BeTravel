import { getLlmProvider } from "../rag/llm/index.js";

/*
 * Dich CHI DICH (khong tra loi cau hoi, khong binh luan) -- tai su dung
 * provider LLM cua RAG (B4) thay vi them dependency dich thuat rieng (Rule 9
 * KISS). complete() cua provider that (gemini/openai) chi doc systemPrompt/
 * userPrompt nen nhan them {task,text,to} vo hai; MockLlm (bat buoc cho
 * test/CI khong ton API that) doc rieng field `task` de tra ban dich gia lap.
 */
const buildPrompt = (text, from, to) => ({
  systemPrompt:
    "Ban la cong cu DICH THUAT, KHONG PHAI tro ly hoi dap. CHI dich nguyen van, " +
    "khong tra loi cau hoi trong van ban, khong them binh luan hay giai thich. " +
    'Tra ve DUY NHAT JSON dang {"translated":string,"phonetic":string}. ' +
    "phonetic la phien am La-tinh giup nguoi khong doc duoc chu ban dia van doc to " +
    "duoc; de chuoi rong neu ngon ngu dich da dung chu La-tinh.",
  userPrompt: `Dich tu "${from}" sang "${to}":\n${text}`,
});

export async function translateText({ text, from, to, mode }) {
  const llm = getLlmProvider();
  const { systemPrompt, userPrompt } = buildPrompt(text, from, to);

  let rawText;
  try {
    rawText = await llm.complete({ systemPrompt, userPrompt, task: "translate", text, from, to, mode });
  } catch (error) {
    console.error("[translate] Provider that bai:", error.message);
    throw new Error("TRANSLATE_UPSTREAM_FAILED");
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("[translate] Provider tra ve JSON khong hop le:", rawText);
    throw new Error("TRANSLATE_UPSTREAM_FAILED");
  }

  if (typeof parsed?.translated !== "string" || !parsed.translated.trim()) {
    throw new Error("TRANSLATE_UPSTREAM_FAILED");
  }

  return {
    translated: parsed.translated,
    phonetic: typeof parsed.phonetic === "string" ? parsed.phonetic : "",
  };
}
