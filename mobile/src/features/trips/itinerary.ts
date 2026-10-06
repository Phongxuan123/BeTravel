import type { Trip, TripStop } from '@/lib/data';
import { now } from '@/lib/date';

export function tripStops(trip: Trip): TripStop[] {
  return trip.stops?.length ? trip.stops : [{ countryCode: trip.countryCode,
    destinationCity: trip.destinationCity, destinationDetail: trip.destinationDetail,
    startDate: trip.startDate }];
}

export function localDate(date = now()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function activeStop(trip: Trip, day = localDate()): TripStop {
  const stops = tripStops(trip);
  return [...stops].reverse().find((stop) => stop.startDate <= day) ?? stops[0];
}

// Một ngày thuộc một chặng; không tự sắp xếp vì sẽ làm thay đổi thứ tự người dùng chọn.
export function itineraryError(stops: TripStop[], start: string, end: string): string | null {
  if (!stops.length || stops.length > 20) return 'Cần từ 1 đến 20 chặng.';
  if (stops[0].startDate !== start) return 'Chặng đầu phải bắt đầu vào ngày đi.';
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const date = new Date(`${stop.startDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stop.startDate) || !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== stop.startDate || stop.startDate > end ||
      (i > 0 && stop.startDate <= stops[i - 1].startDate)) return `Ngày chặng ${i + 1} không hợp lệ hoặc chồng lịch.`;
    if (!stop.countryCode || !stop.destinationCity.trim()) return `Chọn quốc gia và thành phố cho chặng ${i + 1}.`;
  }
  return null;
}
