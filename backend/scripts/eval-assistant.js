/*
 * Chay bo 50 cau danh gia (eval/au-v2/questions.json) qua pipeline tro ly ban 2 voi mo hinh THAT
 * (ton tien APIZ) va DB that (chi doc). Khong ghi hoi thoai, khong tru quota nguoi dung.
 * Dung: node scripts/eval-assistant.js [--limit 10] [--only Q01,Q05] [--delay-ms 12000]
 * --delay-ms: nghi giua cac cau -- Gemini goi mien phi gioi han so yeu cau/phut, chay lien tuc bi 429.
 * Ket qua: docs/local/eval/au-v2-<thoi diem>.json + .md (thu muc local, khong commit).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import { AssistantKind } from "../src/core/constants.js";
import Country from "../src/models/Country.js";
import { answerQuestion } from "../src/rag/assistant/answer.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_FILE = path.join(ROOT, "..", "eval", "au-v2", "questions.json");
const OUT_DIR = path.join(ROOT, "..", "..", "docs", "local", "eval");
const REFUSAL_KINDS = new Set([AssistantKind.REFUSE_SCOPE, AssistantKind.REFUSE_HARM]);

const argValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
};

async function runOne(item, country, answered) {
  const previous = item.followUpOf ? answered.get(item.followUpOf) : null;
  const history = previous
    ? [
        { role: "user", content: previous.question },
        { role: "assistant", content: previous.content },
      ]
    : [];
  const startedAt = Date.now();
  try {
    const result = await answerQuestion({ message: item.question, history, country });
    return { ...result, latencyMs: Date.now() - startedAt, error: null };
  } catch (error) {
    return {
      kind: null,
      content: "",
      citations: [],
      latencyMs: Date.now() - startedAt,
      error: error.message,
    };
  }
}

function summarize(rows) {
  const shouldAnswer = rows.filter((row) => !row.expected.startsWith("refuse"));
  const wrongRefusals = shouldAnswer.filter((row) => REFUSAL_KINDS.has(row.kind));
  const latencies = rows.map((row) => row.latencyMs);
  const byTier = {};
  for (const row of rows)
    byTier[row.sourceTier ?? "none"] = (byTier[row.sourceTier ?? "none"] ?? 0) + 1;
  return {
    total: rows.length,
    behaviorMatch: rows.filter((row) => row.kind === row.expected).length,
    wrongRefusalRate: shouldAnswer.length ? wrongRefusals.length / shouldAnswer.length : 0,
    errors: rows.filter((row) => row.error).length,
    guardViolations: rows.reduce((sum, row) => sum + row.violations, 0),
    byTier,
    latencyP50Ms: percentile(latencies, 50),
    latencyP90Ms: percentile(latencies, 90),
    tokens: rows.reduce(
      (sum, row) => ({ input: sum.input + row.inputTokens, output: sum.output + row.outputTokens }),
      { input: 0, output: 0 },
    ),
  };
}

const toMarkdown = (summary, rows) =>
  [
    `# Danh gia tro ly AI ban 2 -- ${new Date().toISOString()}`,
    "",
    "```json",
    JSON.stringify({ ...summary, model: env.ASSISTANT_MODEL || env.LLM_MODEL }, null, 2),
    "```",
    "",
    ...rows.flatMap((row) => [
      `## ${row.id} [${row.category}] mong doi=${row.expected} -> ${row.kind} / ${row.sourceTier} (${row.latencyMs} ms)`,
      `**Hoi:** ${row.question}`,
      "",
      row.error ? `LOI: ${row.error}` : row.content,
      "",
      ...row.citations.map((c) => `[${c.n}] ${c.title} -- ${c.url}`),
      `*mustCover:* ${row.mustCover.join("; ")}`,
      "",
    ]),
  ].join("\n");

const run = async () => {
  const { questions } = JSON.parse(readFileSync(QUESTIONS_FILE, "utf8"));
  const only = argValue("--only")?.split(",");
  const limit = Number(argValue("--limit") ?? questions.length);
  const selected = questions.filter((q) => !only || only.includes(q.id)).slice(0, limit);

  await mongoose.connect(env.MONGODB_URI);
  const country = await Country.findOne({ code: "AU" }).lean();
  const answered = new Map();
  const rows = [];
  const delayMs = Number(argValue("--delay-ms") ?? 0);
  for (const [index, item] of selected.entries()) {
    if (index > 0 && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const result = await runOne(item, country, answered);
    answered.set(item.id, { question: item.question, content: result.content });
    rows.push({
      id: item.id,
      category: item.category,
      question: item.question,
      expected: item.behavior,
      mustCover: item.mustCover,
      kind: result.kind,
      sourceTier: result.sourceTier ?? null,
      content: result.content,
      citations: result.citations ?? [],
      clarifyOptions: result.clarifyOptions ?? [],
      emergencyNumber: result.emergencyNumber ?? null,
      latencyMs: result.latencyMs,
      error: result.error,
      violations: result.meta?.violations?.length ?? 0,
      inputTokens: result.meta?.usage?.inputTokens ?? 0,
      outputTokens: result.meta?.usage?.outputTokens ?? 0,
    });
    console.log(
      `${item.id} ${item.behavior} -> ${result.kind}/${result.sourceTier ?? "-"} ${result.latencyMs}ms`,
    );
  }
  await mongoose.disconnect();

  const summary = summarize(rows);
  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    path.join(OUT_DIR, `au-v2-${stamp}.json`),
    JSON.stringify({ summary, rows }, null, 2),
  );
  writeFileSync(path.join(OUT_DIR, `au-v2-${stamp}.md`), toMarkdown(summary, rows));
  console.log(JSON.stringify(summary, null, 2));
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
