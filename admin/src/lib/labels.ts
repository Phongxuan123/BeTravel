import type { AssistantKind, AssistantSourceTier, ContentStatus } from './types';

/*
 * Nhan tieng Viet + tone mau dung chung cho Dashboard, trang Tro ly AI va cac badge trang thai.
 * Gom mot cho de hai man hinh trinh bay cung mot cach goi ten (Rule 3 DRY).
 */
export type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'brand';

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Bản nháp',
  pending_review: 'Chờ duyệt',
  published: 'Đã xuất bản',
  superseded: 'Đã thay thế',
  archived: 'Lưu trữ',
};

export const CONTENT_STATUS_TONE: Record<ContentStatus, Tone> = {
  draft: 'neutral',
  pending_review: 'warn',
  published: 'success',
  superseded: 'brand',
  archived: 'neutral',
};

export const KIND_LABEL: Record<AssistantKind, string> = {
  answer: 'Trả lời',
  emergency: 'Khẩn cấp',
  clarify: 'Hỏi lại',
  refuse_scope: 'Ngoài phạm vi',
  refuse_harm: 'Từ chối (nguy hại)',
};

export const KIND_TONE: Record<AssistantKind, Tone> = {
  answer: 'success',
  emergency: 'danger',
  clarify: 'brand',
  refuse_scope: 'neutral',
  refuse_harm: 'warn',
};

export const TIER_LABEL: Record<AssistantSourceTier, string> = {
  official: 'Nguồn chính thức',
  web: 'Tra cứu web',
  general: 'Kiến thức chung',
};

export const TIER_TONE: Record<AssistantSourceTier, Tone> = {
  official: 'success',
  web: 'brand',
  general: 'warn',
};
