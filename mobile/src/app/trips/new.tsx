import { useMemo, useReducer, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Info, ArrowRight } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { StepProgress } from '@/components/ui/StepProgress';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { DateRangeCalendar, type DateRange } from '@/components/common/DateRangeCalendar';
import { colors } from '@/lib/theme';
import { createTrip, fetchCountries } from '@/lib/data';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth';
import { now } from '@/lib/date';
import { formatFullDate, formatWeekday, tripDurationDays } from '@/lib/format';

type State = {
  countryCode: string | null;
  range: DateRange;
  locationAlerts: boolean;
  regulationAlerts: boolean;
};

type Action =
  | { type: 'SET_COUNTRY'; code: string }
  | { type: 'SET_RANGE'; range: DateRange }
  | { type: 'TOGGLE_LOCATION' }
  | { type: 'TOGGLE_REGULATION' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_COUNTRY':
      return { ...state, countryCode: action.code };
    case 'SET_RANGE':
      return { ...state, range: action.range };
    case 'TOGGLE_LOCATION':
      return { ...state, locationAlerts: !state.locationAlerts };
    case 'TOGGLE_REGULATION':
      return { ...state, regulationAlerts: !state.regulationAlerts };
  }
}

function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function TripWizardScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState(() => Math.min(Math.max(Number(params.step) || 1, 1), 4));
  const [state, dispatch] = useReducer(reducer, {
    countryCode: null,
    range: { start: null, end: null },
    locationAlerts: true,
    regulationAlerts: true,
  });
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(() => now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isGuest } = useAuth();
  const queryClient = useQueryClient();

  const goStep = (n: number) => setStep(Math.min(Math.max(n, 1), 4));

  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });
  const countries = useMemo(() => countriesQuery.data?.data ?? [], [countriesQuery.data]);

  const country = countries.find((c) => c.code === state.countryCode);

  const filteredCountries = useMemo(() => {
    const q = stripDiacritics(query);
    return countries.filter((c) => stripDiacritics(c.name).includes(q));
  }, [query, countries]);

  const canContinue =
    (step === 1 && !!state.countryCode) ||
    (step === 2 && !!state.range.start && !!state.range.end) ||
    step === 3 ||
    step === 4;

  const onContinue = async () => {
    if (step < 4) {
      goStep(step + 1);
      return;
    }
    if (!state.countryCode || !state.range.start || !state.range.end) return;

    // Chuyen di thuoc ve mot user dang nhap (backend co /api/users/trips
    // yeu cau authenticateToken) -- khach chua dang nhap khong tao duoc,
    // dieu huong sang dang nhap thay vi de loi 401 lot ra khong ro rang.
    if (isGuest) {
      // Dieu huong ve buoc 1 (khong phai buoc 4) vi state cua wizard nam trong
      // useReducer cuc bo -- sau vong dang nhap se la MOT instance man hinh
      // moi, khong con giu duoc lua chon quoc gia/ngay cu.
      router.push(`/login?next=${encodeURIComponent('/trips/new?step=1')}` as never);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await createTrip({ countryCode: state.countryCode, startDate: state.range.start, endDate: state.range.end });
      // Home/Trips van dang mo trong tab bar (khong remount khi quay lai) --
      // phai tu tay bao React Query cache ['trips'] da cu, khong thi man
      // hinh cu se khong bao gio thay chuyen di vua tao.
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      router.replace('/');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Không thể tạo chuyến đi. Kiểm tra kết nối mạng và thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <PageHeader
        title="Tạo chuyến đi"
        right={<Text className="text-sm font-body-semibold text-muted">Bước {step}/4</Text>}
        onBack={() => (step > 1 ? goStep(step - 1) : router.back())}
      />
      <View className="px-[18px] pt-4">
        <StepProgress total={4} current={step} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}>
        {step === 1 && (
          <View className="px-[18px] pt-5">
            <Text className="font-display text-ink" style={{ fontSize: 26 }}>
              Bạn sẽ đến đâu?
            </Text>
            <Text className="mt-1 text-[15px] text-muted">Chúng tôi sẽ tải cẩm nang pháp luật của quốc gia đó.</Text>

            <View className="mt-5 h-14 flex-row items-center rounded-md border border-line bg-[#F9FBFD] px-4">
              <Search size={20} color={colors.subtle} />
              <TextInput
                className="ml-2.5 flex-1 text-base text-ink"
                placeholder="Tìm quốc gia..."
                placeholderTextColor={colors.subtle}
                value={query}
                onChangeText={setQuery}
              />
            </View>

            <Text className="mt-5 text-[13px] font-body-semibold text-muted">Phổ biến:</Text>
            <View className="mt-2 flex-row" style={{ gap: 8 }}>
              {['JP', 'KR', 'TH'].map((code) => {
                const c = countries.find((x) => x.code === code);
                if (!c) return null;
                const active = state.countryCode === code;
                const comingSoon = c.status === 'coming_soon';
                return (
                  <Pressable
                    key={code}
                    disabled={comingSoon}
                    onPress={() => dispatch({ type: 'SET_COUNTRY', code })}
                    className={`rounded-full px-3 py-2 ${active ? 'bg-primary-soft' : 'bg-[#F0F4F9]'} ${comingSoon ? 'opacity-50' : ''}`}
                  >
                    <Text className={`text-sm font-body-semibold ${active ? 'text-primary-strong' : 'text-ink'}`}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mb-3 mt-6 text-[11px] font-body-bold uppercase tracking-wider text-muted">TẤT CẢ QUỐC GIA</Text>
            <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
              {filteredCountries.map((c) => {
                const selected = state.countryCode === c.code;
                const comingSoon = c.status === 'coming_soon';
                return (
                  <Pressable
                    key={c.code}
                    disabled={comingSoon}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: comingSoon }}
                    onPress={() => dispatch({ type: 'SET_COUNTRY', code: c.code })}
                    className={`h-[70px] flex-row items-center rounded-lg border px-4 ${
                      selected ? 'border-[1.5px] border-primary bg-[#F4F8FF]' : 'border-line bg-surface'
                    } ${comingSoon ? 'opacity-50' : ''}`}
                  >
                    <CountryFlag code={c.code} width={40} height={30} />
                    <View className="ml-3 flex-1">
                      <Text className="text-[18px] font-body-bold text-ink">{c.name}</Text>
                      {comingSoon ? (
                        <Text className="text-sm text-muted">Sắp ra mắt — chưa có cẩm nang pháp luật</Text>
                      ) : (
                        <Text className="text-sm text-muted">
                          {c.region} · {c.regulationsCount} quy định
                        </Text>
                      )}
                    </View>
                    {comingSoon ? (
                      <Badge label="Sắp ra mắt" tone="neutral" />
                    ) : (
                      <View
                        className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
                          selected ? 'border-primary bg-primary' : 'border-[#C9D6EE]'
                        }`}
                      >
                        {selected && <View className="h-2.5 w-2.5 rounded-full bg-white" />}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 2 && (
          <View className="pt-5">
            <View className="px-[18px]">
              <Text className="font-display text-ink" style={{ fontSize: 26 }}>
                Bạn đi khi nào?
              </Text>
              <Text className="mt-1 text-[15px] text-muted">Chạm vào ngày đi, sau đó chọn ngày về.</Text>

              <View className="mt-5 flex-row" style={{ gap: 10 }}>
                <DateBox label="Ngày đi" value={state.range.start} />
                <DateBox label="Ngày về" value={state.range.end} />
              </View>
            </View>

            <View className="mt-5">
              <DateRangeCalendar month={month} onMonthChange={setMonth} value={state.range} onChange={(r) => dispatch({ type: 'SET_RANGE', range: r })} today={now()} />
            </View>

            <View className="mt-4 flex-row items-center justify-between px-[18px]">
              <Text className="text-[15px] font-body-bold text-[#3B4A63]">
                {state.range.start && state.range.end
                  ? `Chuyến đi ${tripDurationDays(state.range.start, state.range.end)} ngày`
                  : 'Chọn ngày đi và ngày về'}
              </Text>
              <Pressable onPress={() => dispatch({ type: 'SET_RANGE', range: { start: null, end: null } })}>
                <Text className="text-[15px] font-body-bold text-primary" numberOfLines={1}>
                  Đặt lại
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="px-[18px] pt-5">
            <Text className="font-display text-ink" style={{ fontSize: 26 }}>
              Bật hỗ trợ theo vị trí
            </Text>
            <Text className="mt-1 text-[15px] text-muted">Bạn có thể tắt các thông báo này bất cứ lúc nào trong Cài đặt.</Text>

            <View className="mt-6 rounded-lg border border-line bg-surface">
              <View className="flex-row items-center justify-between px-4 py-4">
                <View className="flex-1 pr-3">
                  <Text className="text-[15px] font-body-bold text-ink">Cảnh báo theo vị trí</Text>
                  <Text className="mt-1 text-sm text-muted">Nhận cảnh báo an ninh khi bạn ở gần khu vực rủi ro.</Text>
                </View>
                <Switch value={state.locationAlerts} onValueChange={() => dispatch({ type: 'TOGGLE_LOCATION' })} accessibilityLabel="Cảnh báo theo vị trí" />
              </View>
              <View className="h-px bg-line" />
              <View className="flex-row items-center justify-between px-4 py-4">
                <View className="flex-1 pr-3">
                  <Text className="text-[15px] font-body-bold text-ink">Thông báo khi quy định thay đổi</Text>
                  <Text className="mt-1 text-sm text-muted">Cập nhật ngay khi cẩm nang pháp luật của quốc gia này thay đổi.</Text>
                </View>
                <Switch value={state.regulationAlerts} onValueChange={() => dispatch({ type: 'TOGGLE_REGULATION' })} accessibilityLabel="Thông báo khi quy định thay đổi" />
              </View>
            </View>

            <View className="mt-4 flex-row items-start gap-2 rounded-md bg-[#F0F5FD] p-3">
              <Info size={18} color={colors.primary} />
              <Text className="flex-1 text-sm text-[#3B4A63]">Chúng tôi chỉ dùng vị trí để cảnh báo — không chia sẻ với bên thứ ba.</Text>
            </View>
          </View>
        )}

        {step === 4 && country && state.range.start && state.range.end && (
          <View className="px-[18px] pt-5">
            <Text className="font-display text-ink" style={{ fontSize: 26 }}>
              Xác nhận chuyến đi
            </Text>

            <View className="mt-5 rounded-lg border border-line bg-surface p-[18px]">
              <View className="flex-row items-center">
                <CountryFlag code={country.code} width={56} height={40} />
                <View className="ml-3 flex-1">
                  <Text className="text-[22px] font-body-bold text-ink">{country.name}</Text>
                  <Text className="text-sm text-muted">
                    {country.region} · {country.language}
                  </Text>
                </View>
                <Pressable onPress={() => goStep(1)}>
                  <Text className="text-[15px] font-body-bold text-primary">Sửa</Text>
                </Pressable>
              </View>
              <View className="my-4 h-px bg-line" />
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-[13px] text-muted">Ngày đi</Text>
                  <Text className="mt-1 text-xl font-body-bold text-ink">{formatFullDate(state.range.start)}</Text>
                  <Text className="mt-0.5 text-sm capitalize text-muted">{formatWeekday(state.range.start)}</Text>
                </View>
                <ArrowRight size={20} color="#9DBBEE" />
                <View className="items-end">
                  <Text className="text-[13px] text-muted">Ngày về</Text>
                  <Text className="mt-1 text-xl font-body-bold text-ink">{formatFullDate(state.range.end)}</Text>
                  <Text className="mt-0.5 text-sm capitalize text-muted">{formatWeekday(state.range.end)}</Text>
                </View>
              </View>
              <View className="mt-2 flex-row justify-end">
                <Pressable onPress={() => goStep(2)}>
                  <Text className="text-[15px] font-body-bold text-primary">Sửa</Text>
                </Pressable>
              </View>
              <View className="mt-3 flex-row" style={{ gap: 8 }}>
                <Badge label={`${tripDurationDays(state.range.start, state.range.end)} ngày`} tone="info" />
                <Badge label="Sẽ là chuyến đi chính" tone="success" />
              </View>
            </View>

            <Text className="mb-3 mt-6 text-base font-body-bold text-ink">Bạn sẽ nhận được</Text>
            <View style={{ gap: 12 }}>
              {[
                `Cẩm nang pháp luật ${country.name} (${country.regulationsCount} quy định)`,
                'Cảnh báo pháp lý theo vị trí trong suốt chuyến đi',
                `Số khẩn cấp & đại sứ quán Việt Nam tại ${country.name}`,
              ].map((line) => (
                <View key={line} className="flex-row items-center" style={{ gap: 10 }}>
                  <View className="h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-success-soft">
                    <Text style={{ color: colors.success }}>✓</Text>
                  </View>
                  <Text className="flex-1 text-base text-[#3B4A63]">{line}</Text>
                </View>
              ))}
            </View>

            <View className="mt-4 flex-row items-start gap-2 rounded-md bg-[#F0F5FD] p-3">
              <Info size={18} color={colors.primary} />
              <Text className="flex-1 text-sm text-[#3B4A63]">Bạn có thể chỉnh sửa, chuyển quốc gia hoặc tạo thêm chuyến đi bất cứ lúc nào.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <BottomActionBar>
        <View className="flex-1">
          {error && (
            <View className="mb-2 rounded-md bg-danger-tint p-3">
              <Text className="text-sm text-danger">{error}</Text>
            </View>
          )}
          <Button label={step === 4 ? 'Xác nhận chuyến đi' : 'Tiếp tục →'} onPress={onContinue} disabled={!canContinue} loading={submitting} />
          {step === 4 && (
            <Pressable className="mt-2 items-center py-1" onPress={() => router.push('/trips')}>
              <Text className="text-[15px] font-body-semibold text-muted">Xem tất cả chuyến đi</Text>
            </Pressable>
          )}
        </View>
      </BottomActionBar>
    </View>
  );
}

function DateBox({ label, value }: { label: string; value: string | null }) {
  return (
    <View className={`h-[70px] flex-1 justify-center rounded-lg border px-4 ${value ? 'border-primary bg-[#F4F8FF]' : 'border-line bg-surface'}`}>
      <Text className="text-[13px] text-muted">{label}</Text>
      <Text className="mt-0.5 text-xl font-body-bold text-ink">{value ? formatFullDate(value).slice(0, 5) : '--/--'}</Text>
    </View>
  );
}
