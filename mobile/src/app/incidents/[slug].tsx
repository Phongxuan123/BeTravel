import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Bookmark, Info, Phone, Languages, MapPin } from 'lucide-react-native';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeaderBare } from '@/components/common/PageHeader';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchIncident } from '@/lib/data';

export default function IncidentDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { country } = useCountry();
  const [saved, setSaved] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const incidentQuery = useQuery({ queryKey: ['incident', slug], queryFn: () => fetchIncident(slug) });
  const incident = incidentQuery.data?.data;

  if (incidentQuery.isError || (!incidentQuery.isLoading && !incident)) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-bg px-8">
        <Text className="text-center text-base font-body-bold text-ink">Không tải được hướng dẫn này</Text>
        <Pressable onPress={() => router.back()}>
          <Text className="font-body-bold text-primary">Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  if (!incident) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">Đang tải…</Text>
      </View>
    );
  }

  const checked = (stepIdx: number, label: string, fallback: boolean) => checklist[`${stepIdx}-${label}`] ?? fallback;
  const toggle = (stepIdx: number, label: string, fallback: boolean) =>
    setChecklist((prev) => ({ ...prev, [`${stepIdx}-${label}`]: !checked(stepIdx, label, fallback) }));

  return (
    <View className="flex-1 bg-bg">
      <PageHeaderBare
        left={<IconButton accessibilityLabel="Quay lại" variant="soft" icon={<ChevronLeft size={20} color={colors.ink} />} onPress={() => router.back()} />}
        right={
          <IconButton
            accessibilityLabel={saved ? 'Bỏ lưu' : 'Lưu sự cố'}
            variant={saved ? 'warning' : 'outline'}
            icon={<Bookmark size={18} color={saved ? colors.warning : colors.muted} fill={saved ? colors.warning : 'none'} />}
            onPress={() => setSaved((v) => !v)}
          />
        }
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
        <View className="flex-row" style={{ gap: 8 }}>
          {incident.urgent && <Badge label="Khẩn cấp" tone="danger" />}
          <Badge label={`${incident.steps.length} bước`} tone="neutral" />
          <Badge label={country?.name ?? ''} tone="neutral" />
        </View>
        <Text className="mt-3 font-display text-ink" style={{ fontSize: 26 }}>
          {incident.title}
        </Text>

        <View className="mt-4 flex-row items-start gap-2 rounded-lg bg-primary-soft p-4">
          <Info size={18} color={colors.primaryStrong} />
          <Text className="flex-1 text-base leading-6 text-ink">{incident.reassurance}</Text>
        </View>

        <View className="mt-6">
          {incident.steps.map((step, i) => (
            <View key={step.title} className="flex-row" style={{ gap: 14 }}>
              <View className="items-center">
                <View className={`h-10 w-10 items-center justify-center rounded-full ${i === 0 ? 'bg-primary' : 'bg-primary-soft'}`}>
                  <Text className={`text-sm font-body-bold ${i === 0 ? 'text-white' : 'text-primary-strong'}`}>{i + 1}</Text>
                </View>
                {i < incident.steps.length - 1 && <View className="w-0.5 flex-1 bg-[#D6E2F5]" style={{ minHeight: 24 }} />}
              </View>
              <View className="flex-1 pb-6">
                <Text className="text-[19px] font-body-bold text-ink">{step.title}</Text>
                {step.body.length > 0 && (
                  <View className="mt-2 rounded-lg border border-line bg-surface p-3.5" style={{ gap: 6 }}>
                    {step.body.map((line, li) => (
                      <Text key={li} className="text-[15px] leading-6 text-muted">
                        • {line}
                      </Text>
                    ))}
                  </View>
                )}
                {step.checklist && (
                  <View className="mt-2 rounded-lg border border-line bg-surface p-3.5" style={{ gap: 10 }}>
                    {step.checklist.map((item) => (
                      <Pressable key={item.label} className="flex-row items-center" style={{ gap: 10 }} onPress={() => toggle(i, item.label, item.checked)}>
                        <Checkbox checked={checked(i, item.label, item.checked)} onChange={() => toggle(i, item.label, item.checked)} accessibilityLabel={item.label} />
                        <Text className="flex-1 text-[15px] text-ink">{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {i === 0 && (
                  <View className="mt-2 flex-row" style={{ gap: 10 }}>
                    <Pressable className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-md bg-primary-soft" onPress={() => router.push('/translate')}>
                      <Languages size={16} color={colors.primaryStrong} />
                      <Text className="text-sm font-body-bold text-primary-strong">Câu dịch sẵn</Text>
                    </Pressable>
                    <Pressable className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-md border border-line bg-surface" onPress={() => router.push('/sos/map')}>
                      <MapPin size={16} color={colors.ink} />
                      <Text className="text-sm font-body-semibold text-ink">Đồn gần nhất</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomActionBar>
        <Pressable
          className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-primary"
          onPress={() => country && Linking.openURL(`tel:${country.embassy.phone}`)}
        >
          <Phone size={18} color="#fff" />
          <Text className="text-base font-body-bold text-white">Gọi Đại sứ quán</Text>
        </Pressable>
        <IconButton accessibilityLabel="Dịch khẩn cấp" variant="outline" size={56} icon={<Languages size={20} color={colors.primary} />} onPress={() => router.push('/translate')} />
      </BottomActionBar>
    </View>
  );
}
