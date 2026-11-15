import type { AssistantKind, AssistantMetrics, AssistantSourceTier } from './types';
import type { DistributionItem } from '../components/ui/DistributionBar';
import { KIND_LABEL, KIND_TONE, TIER_LABEL, TIER_TONE } from './labels';

// Dinh dang so lieu dung chung Dashboard + trang Tro ly AI (locale vi-VN).
export const formatVnd = (value: number) => `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} đ`;
export const formatCount = (value: number) => value.toLocaleString('vi-VN');
export const formatSeconds = (ms: number) => `${(ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} s`;
export const formatPercent = (rate: number) =>
  `${(rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

const TIER_ORDER: AssistantSourceTier[] = ['official', 'web', 'general'];
const KIND_ORDER: AssistantKind[] = ['answer', 'emergency', 'clarify', 'refuse_scope', 'refuse_harm'];

// Phan bo tang nguon / loai cau tra loi --> du lieu cho DistributionBar.
export const tierDistribution = (breakdown: AssistantMetrics['breakdown']): DistributionItem[] =>
  TIER_ORDER.map((tier) => ({ key: tier, label: TIER_LABEL[tier], value: breakdown.sourceTier[tier], tone: TIER_TONE[tier] }));

export const kindDistribution = (breakdown: AssistantMetrics['breakdown']): DistributionItem[] =>
  KIND_ORDER.map((kind) => ({ key: kind, label: KIND_LABEL[kind], value: breakdown.kind[kind], tone: KIND_TONE[kind] }));
