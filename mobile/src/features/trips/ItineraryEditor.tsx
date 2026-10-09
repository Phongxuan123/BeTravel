import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { DateRangeCalendar } from '@/components/common/DateRangeCalendar';
import { now } from '@/lib/date';
import { formatDateIfComplete } from '@/lib/format';
import type { TripStop, Country } from '@/lib/data';

// Thứ tự chặng có ý nghĩa nghiệp vụ, chỉ xóa/thêm, không tự sort theo ngày.
export function ItineraryEditor({ stops, countries, onChange }: {
  stops: TripStop[]; countries: Country[]; onChange: (stops: TripStop[]) => void;
}) {
  const [month, setMonth] = useState(now());
  const [calendarIndex, setCalendarIndex] = useState<number | null>(null);
  const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
  const patch = (index: number, values: Partial<TripStop>) => onChange(stops.map((stop, i) => i === index ? { ...stop, ...values } : stop));
  return <View className="mt-5 px-[18px]" style={{ gap: 12 }}>
    <Text className="text-lg font-body-bold text-ink">Các nước và ngày chuyển chặng</Text>
    <Text className="text-sm text-muted">Chặng đầu dùng ngày đi. Ngày chuyển nước thuộc chặng mới; chặng cuối kết thúc vào ngày về.</Text>
    {stops.map((stop, index) => <View key={index} className="rounded-lg border border-line bg-surface p-4" style={{ gap: 10 }}>
      <Text className="font-body-bold text-ink">Chặng {index + 1}: {countryName(stop.countryCode)}</Text>
      {index === 0 ? <Text className="text-sm text-muted">{stop.destinationCity} · từ {formatDateIfComplete(stop.startDate)}</Text> : <>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {countries.filter((c) => c.status !== 'coming_soon' || c.code === stop.countryCode).map((c) => <Pressable key={c.code}
            accessibilityLabel={`Chặng ${index + 1} chọn ${c.name}`} accessibilityState={{ selected: c.code === stop.countryCode }}
            onPress={() => patch(index, { countryCode: c.code, destinationCity: '', destinationDetail: '' })}
            className={`rounded-full px-3 py-2 ${c.code === stop.countryCode ? 'bg-primary' : 'bg-primary-soft'}`}>
            <Text className={c.code === stop.countryCode ? 'text-white' : 'text-primary'}>{c.name}</Text>
          </Pressable>)}
        </View>
        <TextInput accessibilityLabel={`Thành phố chặng ${index + 1}`} value={stop.destinationCity}
          onChangeText={(destinationCity) => patch(index, { destinationCity })} placeholder="Thành phố / khu vực"
          maxLength={100} className="rounded-md border border-line px-3 py-3 text-ink" />
        <TextInput accessibilityLabel={`Địa điểm chặng ${index + 1}`} value={stop.destinationDetail ?? ''}
          onChangeText={(destinationDetail) => patch(index, { destinationDetail })} placeholder="Địa điểm cụ thể (tùy chọn)"
          maxLength={200} className="rounded-md border border-line px-3 py-3 text-ink" />
        <Pressable onPress={() => setCalendarIndex(calendarIndex === index ? null : index)}>
          <Text className="text-primary">Ngày tới: {stop.startDate ? formatDateIfComplete(stop.startDate) : 'Chọn ngày'}</Text>
        </Pressable>
        {calendarIndex === index && <DateRangeCalendar month={month} onMonthChange={setMonth}
          value={{ start: null, end: null }} today={new Date(0)}
          onChange={(range) => { if (range.start) patch(index, { startDate: range.start }); setCalendarIndex(null); }} />}
        <TextInput accessibilityLabel={`Ngày bắt đầu chặng ${index + 1}`} value={stop.startDate}
          placeholder="YYYY-MM-DD" maxLength={10} onChangeText={(startDate) => patch(index, { startDate })}
          className="rounded-md border border-line px-3 py-3 text-ink" />
        <Pressable accessibilityLabel={`Xóa chặng ${index + 1}`} onPress={() => { onChange(stops.filter((_, i) => i !== index)); setCalendarIndex(null); }}>
          <Text className="text-danger">Xóa chặng</Text>
        </Pressable>
      </>}
    </View>)}
    {stops.length < 20 && <Pressable accessibilityLabel="Thêm chặng hoặc quốc gia" onPress={() => onChange([...stops,
      { countryCode: countries.find((c) => c.status !== 'coming_soon' && c.code !== stops[stops.length - 1]?.countryCode)?.code ?? stops[0].countryCode,
        destinationCity: '', startDate: '' }])} className="rounded-md bg-primary-soft p-3">
      <Text className="text-center font-body-bold text-primary">Thêm chặng / quốc gia</Text>
    </Pressable>}
  </View>;
}
