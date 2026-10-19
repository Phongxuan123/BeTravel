import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import User from "../src/models/User.js";
import ChatSession from "../src/models/ChatSession.js";
import ChatMessage from "../src/models/ChatMessage.js";
import AiEvent from "../src/models/AiEvent.js";
import * as chatService from "../src/services/chat.service.js";
import { __setLlmProviderForTest } from "../src/rag/llm/index.js";
import { createGeminiLlmProvider } from "../src/rag/llm/gemini.llm.js";

/*
 * Đánh giá AI THẬT (Atlas + Gemini) theo bộ câu trong test/golden/*.live.json. KHÔNG chạy trong CI:
 * tốn lượt gọi Gemini và cần dữ liệu đã index. Dùng:
 *   npm run evaluate-ai -- test/golden/au.live.json [--model gemini-3.5-flash-lite] [--pause-ms 3000]
 * Tạo user/phiên tạm rồi dọn lại, không sửa dữ liệu nội dung. Kết quả: từng ca đạt/không đạt kèm
 * lý do; thoát mã 1 nếu dưới ngưỡng. Kiểm bằng regex và trích dẫn chỉ là kiểm tra tự động, vẫn cần
 * người đọc câu trả lời (docs/AI_KNOWLEDGE_BASE.md mục 3).
 */
const PASS_RATE_MIN = 0.8;
const STRICT_KINDS = new Set(["trap", "scope", "emergency"]);
const ANSWER_KINDS = new Set(["fact", "scenario"]);
const args = process.argv.slice(2);
const flagValue = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const goldenPath = args.find((arg) => !arg.startsWith("--") && arg.endsWith(".json"));
if (!goldenPath) {
  console.log("Thiếu đường dẫn file golden, ví dụ test/golden/au.live.json");
  process.exit(2);
}
const pauseMs = Number(flagValue("--pause-ms", 3000));
const model = flagValue("--model", null);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { countryCode, cases } = JSON.parse(fs.readFileSync(path.resolve(goldenPath), "utf8"));

// Trả về danh sách lý do không đạt (rỗng = đạt).
function judge(testCase, message) {
  const failures = [];
  const text = message.text ?? "";
  const expectedFallback = testCase.expectFallback ?? null;
  if (testCase.expectRoute && message.route !== testCase.expectRoute) {
    failures.push(`route=${message.route}, mong ${testCase.expectRoute}`);
  }
  if (expectedFallback && message.fallbackReason !== expectedFallback) {
    failures.push(`fallback=${message.fallbackReason}, mong ${expectedFallback}`);
  }
  if (ANSWER_KINDS.has(testCase.kind)) {
    if (message.fallbackReason) failures.push(`bị fallback ${message.fallbackReason}`);
    if (message.citations.length === 0) failures.push("không có trích dẫn");
  }
  if (testCase.expectCitationTitle) {
    const titles = message.citations.map((citation) => citation.title);
    if (!titles.includes(testCase.expectCitationTitle)) {
      failures.push(
        `thiếu trích dẫn "${testCase.expectCitationTitle}" (có: ${titles.join("; ") || "không"})`,
      );
    }
  }
  for (const pattern of testCase.answerMustMatch ?? []) {
    if (!new RegExp(pattern, "iu").test(text)) failures.push(`thiếu mẫu /${pattern}/`);
  }
  for (const pattern of testCase.answerMustNotMatch ?? []) {
    if (new RegExp(pattern, "iu").test(text)) failures.push(`lọt mẫu cấm /${pattern}/`);
  }
  return failures;
}

await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 2 });
if (model) __setLlmProviderForTest(createGeminiLlmProvider({ apiKey: env.GEMINI_API_KEY, model }));

const stamp = Date.now();
const user = await User.create({
  username: `tmp_eval_${stamp}`,
  fullName: "Eval tam",
  email: `tmp_eval_${stamp}@example.test`,
  password: "khong-dung-toi-".repeat(2),
  role: "user",
});
const session = await ChatSession.create({ userId: user._id, countryCode });

const results = [];
try {
  for (const testCase of cases) {
    const startedAt = Date.now();
    let failures;
    try {
      const { message } = await chatService.sendMessage({
        userId: user._id,
        sessionId: session._id,
        question: testCase.question,
      });
      failures = judge(testCase, message);
    } catch (error) {
      failures = [`lỗi: ${String(error?.message).slice(0, 100)}`];
    }
    results.push({ id: testCase.id, kind: testCase.kind, failures });
    const mark = failures.length ? "[X]" : "[v]";
    const detail = failures.length ? ` -- ${failures.join(" | ")}` : "";
    console.log(`${mark} ${testCase.id} (${Date.now() - startedAt}ms)${detail}`);
    await sleep(pauseMs);
  }
} finally {
  await ChatMessage.deleteMany({ sessionId: session._id });
  await ChatSession.deleteMany({ _id: session._id });
  await AiEvent.deleteMany({ userId: user._id });
  await User.deleteMany({ _id: user._id });
  await mongoose.disconnect();
}

const passed = results.filter((result) => result.failures.length === 0).length;
const strictFailed = results.filter(
  (result) => STRICT_KINDS.has(result.kind) && result.failures.length > 0,
);
const rate = passed / results.length;
console.log(
  `\nĐạt ${passed}/${results.length} (${Math.round(rate * 100)}%), model ${model ?? env.LLM_MODEL}`,
);
if (strictFailed.length) {
  console.log(`Câu bẫy/phạm vi/khẩn cấp không đạt: ${strictFailed.map((r) => r.id).join(", ")}`);
}
process.exit(rate >= PASS_RATE_MIN && strictFailed.length === 0 ? 0 : 1);
