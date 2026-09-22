import { Pressable, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export type DateRange = { start: string | null; end: string | null };

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Lưới ngày tháng, tuần bắt đầu Thứ Hai (spec mục 6.5 bước 2). Chọn ngày đi rồi ngày về;
// chạm ngày < ngày đi sẽ đặt lại ngày đi (không cho ngày về nhỏ hơn ngày đi).
export function DateRangeCalendar({
  month,
  onMonthChange,
  value,
  onChange,
  today,
}: {
  month: Date;
  onMonthChange: (next: Date) => void;
  value: DateRange;
  onChange: (next: DateRange) => void;
  today: Date;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Thứ Hai
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStart = startOfDay(today);

  const handlePress = (day: number) => {
    const iso = toISO(year, monthIndex, day);
    const date = startOfDay(new Date(iso));
    if (date < todayStart) return;

    if (!value.start || (value.start && value.end)) {
      onChange({ start: iso, end: null });
      return;
    }
    if (iso < value.start) {
      onChange({ start: iso, end: null });
      return;
    }
    onChange({ start: value.start, end: iso });
  };

  return (
    <View>
      <View className="flex-row items-center justify-between px-[18px]">
        <Pressable
          accessibilityLabel="Tháng trước"
          onPress={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          className="h-11 w-11 items-center justify-center rounded-md border border-line"
        >
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
        <Text className="text-lg font-body-bold text-ink">
          Tháng {monthIndex + 1}, {year}
        </Text>
        <Pressable
          accessibilityLabel="Tháng sau"
          onPress={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          className="h-11 w-11 items-center justify-center rounded-md border border-line"
        >
          <ChevronRight size={20} color={colors.ink} />
        </Pressable>
      </View>

      <View className="mt-4 flex-row px-[18px]">
        {WEEKDAY_LABELS.map((w, i) => (
          <Text
            key={w}
            className="flex-1 text-center text-[13px] font-body-bold"
            style={{ color: i === 6 ? colors.danger : colors.muted }}
          >
            {w}
          </Text>
        ))}
      </View>

      <View className="flex-row flex-wrap px-[18px]">
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={{ width: `${100 / 7}%`, height: 52 }} />;
          const iso = toISO(year, monthIndex, day);
          const isPast = startOfDay(new Date(iso)) < todayStart;
          const isStart = iso === value.start;
          const isEnd = iso === value.end;
          const inRange = !!value.start && !!value.end && iso > value.start && iso < value.end;

          return (
            <View key={i} style={{ width: `${100 / 7}%`, height: 52 }} className="items-center justify-center">
              {inRange && <View className="absolute h-11 w-full bg-primary-soft" />}
              {isStart && value.end && <View className="absolute right-0 h-11 w-1/2 bg-primary-soft" />}
              {isEnd && <View className="absolute left-0 h-11 w-1/2 bg-primary-soft" />}
              <Pressable
                disabled={isPast}
                accessibilityRole="button"
                accessibilityLabel={iso}
                onPress={() => handlePress(day)}
                className={`h-11 w-11 items-center justify-center rounded-full ${isStart || isEnd ? 'bg-primary' : ''}`}
              >
                <Text
                  className={`text-[17px] ${isStart || isEnd ? 'font-body-bold text-white' : 'font-body-semibold'}`}
                  style={!isStart && !isEnd ? { color: isPast ? '#B8C3D4' : inRange ? colors.primaryStrong : colors.ink } : undefined}
                >
                  {day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View className="mt-3 flex-row items-center px-[18px]" style={{ gap: 16 }}>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <View className="h-2.5 w-2.5 rounded-full bg-primary" />
          <Text className="text-[13px] text-muted">Ngày đi / về</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <View className="h-2.5 w-2.5 rounded-sm bg-primary-soft" />
          <Text className="text-[13px] text-muted">Trong chuyến đi</Text>
        </View>
      </View>
    </View>
  );
}
