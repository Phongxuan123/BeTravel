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

// countries.status: active = hien thi cho nguoi dung, coming_soon = da co du lieu nhung chua mo.
export const CountryStatus = Object.freeze({
  ACTIVE: "active",
  COMING_SOON: "coming_soon",
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

// Ly do chat tra ve fallback thay vi cau tra loi that (B4, xem rag/guard.js).
export const FallbackReason = Object.freeze({
  // Retrieval khong dat nguong TRUOC KHI goi LLM (rag/retrieval.js).
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  // LLM da tra loi nhung hau kiem bang code phat hien vi pham (rag/guard.js).
  GUARD_REJECTED: "GUARD_REJECTED",
  // Provider loi (mang, parse JSON that bai...) -- khong phai loi nghiep vu.
  PROVIDER_ERROR: "PROVIDER_ERROR",
});

export const ChatRole = Object.freeze({
  USER: "user",
  ASSISTANT: "assistant",
});
