import type { Trip } from '../schemas';

export const trips: Trip[] = [
  { __mock: true, id: 't1', countryCode: 'JP', destinationCity: 'Tokyo', destinationDetail: 'Shinjuku', startDate: '2026-09-18', endDate: '2026-09-28', locationAlerts: true, regulationAlerts: true, isCurrent: true },
  { __mock: true, id: 't2', countryCode: 'SG', destinationCity: 'Singapore', destinationDetail: 'Marina Bay', startDate: '2026-12-12', endDate: '2026-12-18', locationAlerts: true, regulationAlerts: true, isCurrent: false },
  { __mock: true, id: 't3', countryCode: 'TH', destinationCity: 'Bangkok', destinationDetail: 'Sukhumvit', startDate: '2026-04-02', endDate: '2026-04-09', locationAlerts: true, regulationAlerts: true, isCurrent: false },
];
