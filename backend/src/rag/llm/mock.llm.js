/*
 * MockLlm -- BAT BUOC (CLAUDE.md muc 4.1), khong co no golden test/CI phai
 * goi API that. Tat dinh: chi trich dan CHINH XAC cac chunk da duoc truyen
 * vao (khong bao gio bia marker), nen luon vuot qua guard.js o dieu kien
 * binh thuong -- dung de kiem tra PHAN CON LAI cua pipeline (retrieval,
 * threshold, citations) hoat dong dung, khong phai kiem tra guard.
 *
 * Uu tien chunk kind:'penalty' khi cau hoi nhac "phat"/"muc phat" -- cau hoi
 * ve muc phat la loai pho bien nhat (docs/00_..., Phan C.5).
 */
const URGENT_KEYWORDS = ["bị bắt", "bị giữ", "tai nạn", "mất hộ chiếu", "mất giấy tờ", "khẩn cấp"];

function pickChunks(chunks, question) {
  const lowerQuestion = question.toLowerCase();
  const asksAboutPenalty = /phạt|mức phạt|phat|xu phat/i.test(lowerQuestion);

  const penaltyChunks = chunks.filter((c) => c.kind === "penalty");
  const preferred = asksAboutPenalty && penaltyChunks.length > 0 ? penaltyChunks : chunks;

  return preferred.slice(0, 3);
}

export function createMockLlmProvider() {
  return {
    provider: "mock",
    model: "mock-llm",
    async complete({ chunks, question }) {
      if (!chunks || chunks.length === 0) {
        return JSON.stringify({
          answer: "",
          usedSources: [],
          confidence: "low",
          needsOfficialHelp: false,
        });
      }

      const used = pickChunks(chunks, question);
      const sentences = used.map((c) => `${c.text.trim()} [${c.marker}]`);
      const needsOfficialHelp = URGENT_KEYWORDS.some((kw) => question.toLowerCase().includes(kw));

      return JSON.stringify({
        answer: sentences.join(" "),
        usedSources: used.map((c) => c.marker),
        confidence: "high",
        needsOfficialHelp,
      });
    },
  };
}

/*
 * Bien the CO CHU DICH bia du lieu -- CHI dung trong test guard.js. Sinh
 * marker [S9] khong ton tai trong tap truy hoi VA mot con so tien khong
 * nguon, de chung minh guard THAT SU chan duoc (khong ai biet guardrail co
 * chay neu khong co test nay -- xem docs/03_Contracts_v2.md muc 8).
 */
export function createHallucinatingMockLlmProvider() {
  return {
    provider: "mock",
    model: "mock-llm-hallucinating",
    async complete() {
      return JSON.stringify({
        answer: "Bạn sẽ bị phạt 500.000 KRW nếu vi phạm điều này [S9].",
        usedSources: ["S9"],
        confidence: "high",
        needsOfficialHelp: false,
      });
    },
  };
}

// Alias theo dung ten trong docs/02_ClaudeCode_Batch_Prompts_v2.md ("MockLlm.hallucinating()").
createMockLlmProvider.hallucinating = createHallucinatingMockLlmProvider;
