import type { Trip } from '../schemas';

export const trips: Trip[] = [
  { __mock: true, id: 't1', countryCode: 'JP', startDate: '2026-09-18', endDate: '2026-09-28', isCurrent: true },
  { __mock: true, id: 't2', countryCode: 'SG', startDate: '2026-12-12', endDate: '2026-12-18', isCurrent: false },
  { __mock: true, id: 't3', countryCode: 'TH', startDate: '2026-04-02', endDate: '2026-04-09', isCurrent: false },
];
