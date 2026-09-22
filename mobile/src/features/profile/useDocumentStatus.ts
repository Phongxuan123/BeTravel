import { useEffect, useState } from 'react';
import { getJSON, setJSON, StorageKeys } from '@/lib/storage';

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
  const [status, setStatus] = useState<DocumentStatusMap>(DEFAULT_STATUS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getJSON<DocumentStatusMap>(StorageKeys.documentStatus).then((saved) => {
      if (saved) setStatus(saved);
      setLoaded(true);
    });
  }, []);

  const setDocument = async (key: DocumentKey, patch: { added: boolean; note: string }) => {
    const next = { ...status, [key]: patch };
    setStatus(next);
    await setJSON(StorageKeys.documentStatus, next);
  };

  return { status, loaded, setDocument };
}
