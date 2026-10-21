import { indexAuLaw } from "../../services/auLawIndex.service.js";

/*
 * Handler cho job 'index_au_law': đưa điều luật liên bang Úc của một đạo luật vào RAG
 * (services/auLawIndex.service.js). Idempotent: index lại chỉ thay chunk cũ sau khi embed xong,
 * nên worker bị gián đoạn rồi chạy lại cũng an toàn. Luật lớn chạy lâu vì gói embedding miễn phí
 * giới hạn 100 lượt/phút (embedding provider tự chờ khi 429); lease của job có heartbeat.
 */
export async function indexAuLawHandler({ titleId }) {
  await indexAuLaw(titleId);
}
