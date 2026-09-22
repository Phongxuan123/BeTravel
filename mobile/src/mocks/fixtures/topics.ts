import type { Topic } from '../schemas';

export const topics: Topic[] = [
  { __mock: true, key: 'entry', countryCode: 'JP', label: 'Nhập cảnh', iconKey: 'entry', count: 18 },
  { __mock: true, key: 'traffic', countryCode: 'JP', label: 'Giao thông', iconKey: 'traffic', count: 24 },
  { __mock: true, key: 'public', countryCode: 'JP', label: 'Nơi công cộng', iconKey: 'public', count: 31 },
  { __mock: true, key: 'documents', countryCode: 'JP', label: 'Giấy tờ', iconKey: 'documents', count: 15 },
  { __mock: true, key: 'fines', countryCode: 'JP', label: 'Tiền phạt', iconKey: 'fines', count: 22 },
  { __mock: true, key: 'security', countryCode: 'JP', label: 'An ninh', iconKey: 'security', count: 18 },
];

export function getTopicsByCountry(countryCode: string): Topic[] {
  return topics.filter((t) => t.countryCode === countryCode);
}
