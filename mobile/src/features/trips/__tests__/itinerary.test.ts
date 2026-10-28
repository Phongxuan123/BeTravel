import { activeStop, itineraryError, pickCurrentTrip, tripStops } from '../itinerary';
import type { Trip } from '@/lib/data';

const trip: Trip = { id: 'trip', countryCode: 'KR', destinationCity: 'Seoul', startDate: '2026-10-01',
  endDate: '2026-10-10', isCurrent: true, locationAlerts: false, regulationAlerts: true,
  stops: [{ countryCode: 'KR', destinationCity: 'Seoul', startDate: '2026-10-01' },
    { countryCode: 'JP', destinationCity: 'Osaka', startDate: '2026-10-05' }] };

test('ngày chuyển nước thuộc chặng mới và chuyến cũ vẫn đọc được', () => {
  expect(activeStop(trip, '2026-10-04').countryCode).toBe('KR');
  expect(activeStop(trip, '2026-10-05').countryCode).toBe('JP');
  expect(tripStops({ ...trip, stops: undefined })).toHaveLength(1);
});
test('không nhận ngày không tồn tại, trùng lịch hoặc ngoài chuyến đi', () => {
  expect(itineraryError(trip.stops!, trip.startDate, trip.endDate)).toBeNull();
  for (const date of ['2026-10-01', '2026-10-11', '2026-02-30', '']) {
    expect(itineraryError([trip.stops![0], { ...trip.stops![1], startDate: date }], trip.startDate, trip.endDate)).not.toBeNull();
  }
});

// BUG-17: Home và CountryProvider dùng chung một cách chọn chuyến.
test('pickCurrentTrip ưu tiên chuyến đang diễn ra hơn chuyến tương lai dù cờ isCurrent', () => {
  const ongoing = { ...trip, id: 'dang-di', isCurrent: false };
  const future = { ...trip, id: 'tuong-lai', startDate: '2026-12-01', endDate: '2026-12-10', isCurrent: true };
  expect(pickCurrentTrip([future, ongoing], new Date('2026-10-03T00:00:00'))?.id).toBe('dang-di');
  expect(pickCurrentTrip([future], new Date('2026-10-03T00:00:00'))?.id).toBe('tuong-lai');
  expect(pickCurrentTrip([])).toBeUndefined();
});
