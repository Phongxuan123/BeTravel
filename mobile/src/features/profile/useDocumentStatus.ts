import { useUserStorage } from '@/lib/useUserStorage';
import { StorageKeys } from '@/lib/storage';

export type DocumentKey = 'passport' | 'visa' | 'insurance';
export type DocumentStatusMap = Record<DocumentKey, { added: boolean; note: string }>;

const DEFAULT_STATUS: DocumentStatusMap = {
  passport: { added: false, note: '' },
  visa: { added: false, note: '' },
  insurance: { added: false, note: '' },
};

// Chỉ lưu TRẠNG THÁI (đã thêm hay chưa + ghi chú số hồ sơ) — KHÔNG lưu ảnh giấy tờ,
// đúng theo spec §7 Q11: dữ liệu nhạy cảm, không lưu ảnh ở MVP.
export function useDocumentStatus() {
  const { value: status, loaded, update } = useUserStorage<DocumentStatusMap>(StorageKeys.documentStatus, DEFAULT_STATUS);
  const setDocument = (key: DocumentKey, patch: { added: boolean; note: string }) =>
    update((current) => ({ ...current, [key]: patch }));

  return { status, loaded, setDocument };
}
