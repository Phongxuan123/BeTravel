/*
 * Cac enum trang thai/nghiep vu dung chung nhieu noi -- dat mot cho duy nhat
 * de tranh magic string rai rac (Rule 6). Doi gia tri o day se anh huong toan
 * bo model/validator/service dung no.
 */

// Vong doi noi dung phap ly: draft -> pending_review -> published -> superseded/archived.
export const ContentStatus = Object.freeze({
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  PUBLISHED: "published",
  SUPERSEDED: "superseded",
  ARCHIVED: "archived",
});

export const ContentStatusValues = Object.values(ContentStatus);

export const KeyPointSeverity = Object.freeze({
  NORMAL: "normal",
  CRIMINAL: "criminal",
});

export const RiskLevel = Object.freeze({
  INFO: "info",
  WARN: "warn",
  DANGER: "danger",
});

export const SourceKind = Object.freeze({
  GOV: "gov",
  // Trang tong hop / dich vu tu nhan -- so lieu can doi chieu lai voi nguon
  // GOV cung bai truoc khi publish (xem docs/06_Legal_Content_Seed_KR.md).
  SECONDARY: "secondary",
  NEWS: "news",
  LEGAL_TEXT: "legal_text",
  EMBASSY: "embassy",
  OTHER: "other",
});

// countries.status: active = hien thi cho nguoi dung, coming_soon = da co du lieu nhung chua mo,
// hidden = an han khoi API cong khai (giu du lieu de mo lai ma khong phai nhap lai).
export const CountryStatus = Object.freeze({
  ACTIVE: "active",
  COMING_SOON: "coming_soon",
  HIDDEN: "hidden",
});

export const JobStatus = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
});

// Ten job -- worker that (B4) doc field nay de chon handler.
export const JobName = Object.freeze({
  REINDEX_ARTICLE: "reindex_article",
  PURGE_CHUNKS: "purge_chunks",
  // Index điều luật liên bang Úc vào RAG (rag/jobs/indexAuLaw.job.js).
  INDEX_AU_LAW: "index_au_law",
});

export const IndexStateStatus = Object.freeze({
  NOT_INDEXED: "not_indexed",
  QUEUED: "queued",
  INDEXING: "indexing",
  INDEXED: "indexed",
  FAILED: "failed",
});

// Vai tro nguoi dung -- dung lai tu User.js de tranh import vong, khong doi gia tri.
export const UserRole = Object.freeze({
  USER: "user",
  ADMIN: "admin",
});

// Ly do AI tra ve fallback thay vi cau tra loi that (ghi vao ai_events, dung cho thong ke admin).
export const FallbackReason = Object.freeze({
  // Retrieval khong dat nguong TRUOC KHI goi LLM (rag/retrieval.js).
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  // LLM da tra loi nhung hau kiem bang code phat hien vi pham.
  GUARD_REJECTED: "GUARD_REJECTED",
  // Provider loi (mang, parse JSON that bai...) -- khong phai loi nghiep vu.
  PROVIDER_ERROR: "PROVIDER_ERROR",
  // Câu hỏi ngoài phạm vi pháp lý + an toàn du lịch.
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
});

// Loai vung nguy co hien tren ban do (RiskZone). Them loai moi = them o day,
// validator va model tu dong theo.
export const RiskZoneCategory = Object.freeze({
  ROAD_CRASH: "road_crash",
  WRONG_WAY_DRIVING: "wrong_way_driving",
  THEFT: "theft",
});

// Trợ lý AI bản 2 (docs/AI_V2_PLAN.md): loại câu trả lời mà giao diện hiển thị khác nhau.
export const AssistantKind = Object.freeze({
  ANSWER: "answer",
  EMERGENCY: "emergency",
  CLARIFY: "clarify",
  REFUSE_SCOPE: "refuse_scope",
  REFUSE_HARM: "refuse_harm",
});

// Tầng nguồn của câu trả lời -- do CODE gán theo nguồn thật đã dùng, không do LLM tự khai.
export const SourceTier = Object.freeze({
  OFFICIAL: "official",
  WEB: "web",
  GENERAL: "general",
});

export const AssistantRole = Object.freeze({ USER: "user", ASSISTANT: "assistant" });
