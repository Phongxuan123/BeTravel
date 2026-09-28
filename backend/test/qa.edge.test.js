import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * Pha 4 dot QA (docs/07_QA_BugHunt.md). PHAN 7 (edge case, gom 7.1 "gui rac vao
 * moi route POST/PATCH") bi thieu noi dung --> kich ban TU DE XUAT: quet TU DONG
 * moi route ghi tu router.stack (giong rbac.sweep), gui payload rac + NoSQL
 * injection, yeu cau KHONG route nao tra 5xx hay lo stack.
 */

let app;
const routers = {};

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  const load = async (name) => (await import(`../src/routes/${name}.routes.js`)).default;
  Object.assign(routers, {
    "/api/admin": await load("admin"),
    "/api/users/trips": await load("trips"),
    "/api/users/incident-progress": await load("incidentProgress"),
    "/api/users/favorites": await load("favorites"),
    "/api/users/preferences": await load("preferences"),
    "/api/chat": await load("chat"),
    "/api/feedback": await load("feedback"),
    "/api/translate": await load("translate"),
    "/api/auth": await load("auth"),
  });
});
after(stopTestDb);

const WRITE_METHODS = new Set(["post", "put", "patch", "delete"]);
const BAD_ID = "000000000000000000000000";
// /auth/google* goi Google that de xac minh credential -- khong gui ra ngoai trong test.
const SKIPPED = new Set(["/api/auth/google", "/api/auth/google/link"]);

function writeRoutes() {
  return Object.entries(routers).flatMap(([prefix, router]) =>
    router.stack
      .filter((layer) => layer.route)
      .flatMap((layer) =>
        Object.keys(layer.route.methods)
          .filter((method) => WRITE_METHODS.has(method))
          .map((method) => ({ method, path: `${prefix}${layer.route.path}` })),
      )
      .filter(({ path }) => !SKIPPED.has(path)),
  );
}

const deep = (depth) => (depth === 0 ? "day" : { a: deep(depth - 1) });
const PAYLOADS = [
  { label: "mang", body: [] },
  { label: "object rong", body: {} },
  { label: "sai kieu", body: { countryCode: 123, title: false, steps: "abc", ids: "x", rows: {} } },
  {
    label: "nosql",
    body: { identifier: { $gt: "" }, password: { $ne: null }, countryCode: { $ne: "KR" } },
  },
  { label: "long sau", body: deep(200) },
  {
    label: "so qua lon",
    body: { radiusM: 1e308, order: Number.MAX_SAFE_INTEGER * 10, completedSteps: [-1, 1e9] },
  },
  { label: "chuoi dai", body: { title: "x".repeat(100_000), question: "y".repeat(100_000) } },
];
const IDS = [BAD_ID, "khong-phai-id", "%24ne"];

test("Pha 4: moi route ghi nhan payload rac/injection deu tra 4xx, khong 5xx, khong lo stack", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const routes = writeRoutes();
  assert.ok(routes.length >= 40, `chi quet duoc ${routes.length} route ghi`);

  const failures = [];
  for (const { method, path } of routes) {
    for (const id of IDS) {
      const url = path.replace(/:[A-Za-z]+/g, id);
      for (const { label, body } of PAYLOADS) {
        const res = await request(app)
          [method](url)
          .set("Authorization", `Bearer ${admin.accessToken}`)
          .send(body);
        const leaked = JSON.stringify(res.body).includes("    at ");
        if (res.status >= 500 || leaked)
          failures.push(`${method.toUpperCase()} ${url} [${label}] -> ${res.status}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("Pha 4: NoSQL injection qua query string khong bypass bo loc cong khai", async () => {
  for (const url of [
    "/api/legal/articles?country[$ne]=XX",
    "/api/legal/search?q[$gt]=&country=KR",
    "/api/alerts/applicable?country=KR&lat[$gt]=0",
    "/api/support-locations?country[$regex]=.*",
  ]) {
    const res = await request(app).get(url);
    assert.ok(res.status < 500, `${url} -> ${res.status}`);
    assert.ok(res.status === 400 || (res.body.ok && res.body.data.length === 0), url);
  }
});
