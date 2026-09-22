import type { QuickPhrase } from '../schemas';

export const quickPhrases: QuickPhrase[] = [
  { __mock: true, id: 'qp1', countryCode: 'JP', vi: 'Tôi cần giúp đỡ', translated: '助けてください', phonetic: 'Tasukete kudasai' },
  { __mock: true, id: 'qp2', countryCode: 'JP', vi: 'Làm ơn gọi cảnh sát', translated: '警察を呼んでください', phonetic: 'Keisatsu o yonde kudasai' },
  { __mock: true, id: 'qp3', countryCode: 'JP', vi: 'Tôi bị mất hộ chiếu', translated: 'パスポートを紛失しました', phonetic: 'Pasupōto o funshitsu shimashita' },
  { __mock: true, id: 'qp4', countryCode: 'JP', vi: 'Tôi cần bác sĩ', translated: '医者が必要です', phonetic: 'Isha ga hitsuyō desu' },
];

export function getQuickPhrasesByCountry(countryCode: string) {
  return quickPhrases.filter((p) => p.countryCode === countryCode);
}
