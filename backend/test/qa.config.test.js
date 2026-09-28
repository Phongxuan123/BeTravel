import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { startTestDb, stopTestDb } from "./setup.js";

/*
 * Dot QA-5 (docs/07_QA_BugHunt.md, M16-M17): cau hinh, khoi dong, trien khai,
 * ve sinh repo. Khong doc gia tri trong backend/.env that -- chi dung cau hinh
 * gia truyen truc tiep vao parseEnv.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, "..");
let parseEnv;

before(async () => {
  await startTestDb();
  ({ parseEnv } = await import("../src/core/env.js"));
});
after(stopTestDb);

const FAKE_SECRET = "gia-tri-gia-chi-dung-trong-test-000000000";
const base = {
  MONGODB_URI: "mongodb://127.0.0.1:1/qa",
  JWT_ACCESS_SECRET: FAKE_SECRET,
};

test("INV-16.1 production tu choi provider mock, thieu API key, JWT secret ngan", () => {
  const prod = {
    ...base,
    NODE_ENV: "production",
    LLM_PROVIDER: "gemini",
    EMBEDDING_PROVIDER: "gemini",
    GEMINI_API_KEY: "khoa-gia",
  };
  assert.equal(parseEnv(prod).success, true);

  const broken = [
    { ...prod, LLM_PROVIDER: undefined },
    { ...prod, EMBEDDING_PROVIDER: "mock" },
    { ...prod, GEMINI_API_KEY: "" },
    { ...prod, EMBEDDING_PROVIDER: "openai" },
    { ...prod, JWT_ACCESS_SECRET: "ngan-hon-32-ky-tu-nhung-du-16" },
    { ...prod, MONGODB_URI: undefined },
  ];
  for (const config of broken) {
    assert.equal(parseEnv(config).success, false, JSON.stringify(Object.keys(config)));
  }
});

test("INV-16.1 dev/test van chay duoc voi provider mock mac dinh", () => {
  assert.equal(parseEnv({ ...base, NODE_ENV: "development" }).success, true);
  assert.equal(parseEnv({ ...base, NODE_ENV: "test" }).success, true);
});

test("INV-16.2 moi bien process.env duoc doc trong src/scripts deu co trong .env.example", () => {
  const read = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return read(full);
      return full.endsWith(".js") ? [fs.readFileSync(full, "utf8")] : [];
    });
  const sources = [
    ...read(path.join(backendDir, "src")),
    ...read(path.join(backendDir, "scripts")),
  ];
  const envSource = fs.readFileSync(path.join(backendDir, "src/core/env.js"), "utf8");
  const schemaKeys = [...envSource.matchAll(/^ {2}([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]);
  const directKeys = sources.flatMap((s) =>
    [...s.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]),
  );
  const example = fs.readFileSync(path.join(backendDir, ".env.example"), "utf8");
  const documented = new Set([...example.matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]));
  // Doi chung: regex phai bat duoc bien that, neu khong test xanh vo nghia.
  assert.ok(
    schemaKeys.includes("RAG_MIN_TOP_SCORE") && schemaKeys.length > 30,
    "khong doc duoc schema env",
  );
  assert.ok(documented.has("MONGODB_URI"), "khong doc duoc .env.example");
  const missing = [...new Set([...schemaKeys, ...directKeys])].filter(
    (key) => !documented.has(key) && key !== "NODE_ENV",
  );
  assert.deepEqual(missing, []);
});

test("H-16.a cac module server.js import (ngoai app.js) nap duoc, khong loi duong dan", async () => {
  // BUG-H01: config/db.js tung import sai duong dan -- test chi import app.js nen khong bat.
  const db = await import("../src/config/db.js");
  const jobs = await import("../src/rag/jobs/index.js");
  const worker = await import("../src/services/job.service.js");
  assert.equal(typeof db.default, "function");
  assert.equal(typeof jobs.registerRagJobHandlers, "function");
  assert.equal(typeof worker.startJobWorker, "function");
  const server = fs.readFileSync(path.join(backendDir, "src/server.js"), "utf8");
  for (const specifier of [...server.matchAll(/from "(\.[^"]+)"/g)].map((m) => m[1])) {
    assert.ok(fs.existsSync(path.join(backendDir, "src", specifier)), specifier);
  }
});

test("INV-16.3 render.yaml khop script package.json va health check", () => {
  const render = fs.readFileSync(path.join(backendDir, "render.yaml"), "utf8");
  const pkg = JSON.parse(fs.readFileSync(path.join(backendDir, "package.json"), "utf8"));
  const startCommand = render.match(/startCommand:\s*(.+)/)?.[1].trim();
  assert.ok(startCommand, "render.yaml thieu startCommand");
  const script = startCommand.match(/npm (?:run )?(\S+)/)?.[1];
  assert.ok(script === "start" ? pkg.scripts.start : pkg.scripts[script], startCommand);
  assert.match(render, /healthCheckPath:\s*\/api\/health/);
  assert.doesNotMatch(
    render,
    /value:\s*["']?[A-Za-z0-9_-]{24,}/,
    "render.yaml khong duoc chua secret",
  );
});
