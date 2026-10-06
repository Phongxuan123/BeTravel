import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

/*
 * Tu liet ke file *.test.js roi goi `node --test` voi duong dan cu the.
 * Truyen glob "test/**\/*.test.js" cho node --test khong chay duoc tren Windows
 * (npm chay qua cmd, glob bi doi thanh "test\**\*.test.js" va bi coi la ten
 * file that --> "Could not find"). Liet ke bang fs thi chay giong nhau moi OS.
 */
const TEST_DIR = "test";

const testFiles = readdirSync(TEST_DIR, { recursive: true })
  .map(String)
  .filter((file) => file.endsWith(".test.js"))
  .map((file) => path.join(TEST_DIR, file))
  .sort();

if (testFiles.length === 0) {
  console.error(`[X] Khong tim thay file *.test.js trong ${TEST_DIR}/`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", "--test-concurrency=2", ...testFiles], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
