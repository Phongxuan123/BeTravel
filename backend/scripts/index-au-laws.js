import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import {
  indexAuLaw,
  purgeAuLaw,
  listIndexedAuLaws,
  curatedAuTitleIds,
} from "../src/services/auLawIndex.service.js";
import { AU_LAW_TOPICS } from "../src/core/auLawTopics.js";

/*
 * Đưa điều luật liên bang Úc (31 luật tuyển chọn) vào RAG để Be.Travel AI trả lời có trích dẫn.
 * Tốn lượt gọi embedding (mỗi luật hàng trăm đến hàng nghìn chunk), nên LUÔN chỉ định luật cần làm:
 *   npm run index-au-laws -- --list                  liệt kê luật đã index
 *   npm run index-au-laws -- C1946A00045             index (hoặc index lại) một luật
 *   npm run index-au-laws -- --topic xuat-nhap-canh  index mọi luật của một mục
 *   npm run index-au-laws -- --remove C1946A00045    xoá chunk của một luật
 * Index lại luật đã có là an toàn: embed xong mới thay chunk cũ. Cần EMBEDDING_PROVIDER=gemini.
 */
const args = process.argv.slice(2);
const flagValue = (name) => args[args.indexOf(name) + 1];

const resolveTargets = () => {
  if (args.includes("--topic")) {
    const topic = AU_LAW_TOPICS.find(({ slug }) => slug === flagValue("--topic"));
    if (!topic) throw new Error(`Không có mục "${flagValue("--topic")}"`);
    return topic.titleIds;
  }
  const ids = args.filter((arg) => !arg.startsWith("--"));
  const unknown = ids.filter((id) => !curatedAuTitleIds().includes(id));
  if (unknown.length) throw new Error(`Không thuộc danh sách tuyển chọn: ${unknown.join(", ")}`);
  return ids;
};

await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 2 });
let failed = 0;
try {
  if (args.includes("--list")) {
    const rows = await listIndexedAuLaws();
    for (const row of rows) {
      console.log(`${row.titleId}  ${String(row.chunks).padStart(5)} chunk  ${row.lawName}`);
    }
    console.log(`[v] ${rows.length} luật đã index`);
  } else if (args.includes("--remove")) {
    const result = await purgeAuLaw(flagValue("--remove"));
    console.log(`[v] ${result.titleId}: đã xoá ${result.deleted} chunk`);
  } else {
    const targets = resolveTargets();
    if (targets.length === 0) throw new Error("Chưa chỉ định luật. Xem hướng dẫn đầu file.");
    for (const titleId of targets) {
      const startedAt = Date.now();
      try {
        const done = await indexAuLaw(titleId);
        const seconds = Math.round((Date.now() - startedAt) / 1000);
        console.log(
          `[v] ${titleId}: ${done.chunks} chunk, thay ${done.replaced} (${seconds}s) ${done.lawName}`,
        );
      } catch (error) {
        failed += 1;
        console.log(`[X] ${titleId}: ${error?.message?.slice(0, 160)}`);
      }
    }
  }
} catch (error) {
  failed += 1;
  console.log(`[X] ${error.message}`);
}
await mongoose.disconnect();
process.exit(failed > 0 ? 1 : 0);
