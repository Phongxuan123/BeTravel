import { Alert, Linking } from 'react-native';

/*
 * Mo trinh goi dien / link ngoai dung mot cach cho moi man hinh (INV-08.6,
 * INV-13.7 cua docs/07_QA_BugHunt.md). Linking.openURL tu choi (reject) khi thiet
 * bi khong co ung dung xu ly (tablet, simulator) -- khong bat thi thanh loi
 * khong duoc xu ly, nguoi dung bam nut ma khong co phan hoi nao.
 */

// Giu "+" dau so quoc te, bo moi ky tu trinh bay ma trinh goi khong hieu.
export function toTelUrl(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').trim().replace(/[\s().-]/g, '');
  return digits ? `tel:${digits}` : null;
}

export async function openPhone(phone: string | null | undefined): Promise<boolean> {
  const url = toTelUrl(phone);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Không gọi được', `Vui lòng gọi trực tiếp số ${phone?.trim()}.`);
    return false;
  }
}

export async function openUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Không mở được liên kết', 'Vui lòng thử lại sau.');
    return false;
  }
}
