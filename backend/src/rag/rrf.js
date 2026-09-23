/*
 * Reciprocal Rank Fusion tu cai (K=60 la gia tri chuan trong tai lieu IR) --
 * KHONG dung $rankFusion vi can MongoDB 8.0, khong chac co tren Atlas M0
 * (docs/03_Contracts_v2.md muc 6.1). Hop nhat nhieu danh sach xep hang (vector,
 * tu khoa, focusArticleId) thanh MOT thu tu duy nhat de dua vao prompt.
 *
 * Luu y: fusedScore CHI dung de SAP XEP ngu canh dua vao prompt, KHONG dung
 * de quyet dinh nguong INSUFFICIENT_EVIDENCE -- nguong ap len score GOC cua
 * vector search (xem retrieval.js).
 */
export function rrf(lists, K = 60) {
  const acc = new Map();

  for (const { items, weight } of lists) {
    items.forEach((chunk, i) => {
      const id = String(chunk._id);
      const add = weight / (K + i + 1);
      const prev = acc.get(id);
      if (prev) prev.fused += add;
      else acc.set(id, { chunk, fused: add });
    });
  }

  return [...acc.values()]
    .sort((a, b) => b.fused - a.fused)
    .map(({ chunk, fused }) => ({ ...chunk, fusedScore: fused }));
}
