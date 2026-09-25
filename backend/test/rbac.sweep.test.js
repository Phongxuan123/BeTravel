import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

let app;
let adminRouter;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ default: adminRouter } = await import("../src/routes/admin.routes.js"));
});

after(stopTestDb);
beforeEach(clearTestDb);

const auth = (token) => `Bearer ${token}`;

// ID gia hop le ve MẶT DINH DANG (24 hex) -- RBAC middleware chay TRUOC moi
// logic doc DB nen khong bao gio thuc su cham toi validate/truy van voi id nay.
const DUMMY_ID = "000000000000000000000000";

/*
 * Duyet TOAN BO route dang ky trong admin.routes.js bang cach doc thang
 * `router.stack` cua Express (khong hardcode danh sach tay) -- dung theo
 * PROMPT B9 muc 2: "Test tu dong DUYET DANH SACH ROUTE va assert, khong
 * kiem thu cong". Them route moi vao admin.routes.js se TU DONG duoc quet,
 * khong can nho cap nhat test nay.
 */
function extractAdminRoutes(router) {
  const routes = [];
  for (const layer of router.stack) {
    if (!layer.route) continue;
    const methods = Object.keys(layer.route.methods);
    const path = layer.route.path.replace(/:[a-zA-Z]+/g, DUMMY_ID);
    for (const method of methods) {
      routes.push({ method, path: `/api/admin${path}` });
    }
  }
  return routes;
}

test("MOI route /api/admin/* deu bi chan boi requireRole('admin') -- quet tu dong tu router.stack", async () => {
  const routes = extractAdminRoutes(adminRouter);
  assert.ok(routes.length >= 40, "phai quet duoc it nhat 40 route (dau hieu router.stack doc dung)");

  const { accessToken: userToken } = await registerAndLogin(app, { role: "user" });

  for (const { method, path } of routes) {
    const noAuthRes = await request(app)[method](path);
    assert.equal(noAuthRes.status, 401, `${method.toUpperCase()} ${path} (khong token) phai tra 401`);
    assert.equal(noAuthRes.body.error.code, "UNAUTHORIZED", `${method.toUpperCase()} ${path} sai ma loi khi khong token`);

    const nonAdminRes = await request(app)[method](path).set("Authorization", auth(userToken));
    assert.equal(nonAdminRes.status, 403, `${method.toUpperCase()} ${path} (user thuong) phai tra 403`);
    assert.equal(nonAdminRes.body.error.code, "FORBIDDEN", `${method.toUpperCase()} ${path} sai ma loi khi khong phai admin`);
  }
});
