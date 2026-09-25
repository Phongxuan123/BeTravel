import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Bookmark, Info, Phone, Languages, MapPin, MessageCircleQuestion, ExternalLink, LogIn } from 'lucide-react-native';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeaderBare } from '@/components/common/PageHeader';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { StepProgress } from '@/components/ui/StepProgress';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useCountry } from '@/lib/countryContext';
import { fetchIncident, getIncidentProgress, setIncidentProgress } from '@/lib/data';
import type { Incident } from '@/mocks/schemas';

type IncidentCta = { type: 'map' | 'call' | 'ai' | 'link'; label: string; payload: Record<string, unknown> };

function runCta(cta: IncidentCta, embassyPhone?: string) {
  if (cta.type === 'map') {
    const type = typeof cta.payload.locationType === 'string' ? cta.payload.locationType : '';
    router.push(`/sos/map${type ? `?type=${type}` : ''}` as never);
    return;
  }
  if (cta.type === 'call') {
    const phone = (typeof cta.payload.phone === 'string' && cta.payload.phone) || embassyPhone;
    if (phone) Linking.openURL(`tel:${phone}`);
    return;
  }
  if (cta.type === 'ai') {
    const question = typeof cta.payload.question === 'string' ? cta.payload.question : '';
    router.push({ pathname: '/chat', params: question ? { q: question } : {} } as never);
    return;
  }
  if (typeof cta.payload.url === 'string') Linking.openURL(cta.payload.url);
}

const CTA_ICON: Record<IncidentCta['type'], typeof MapPin> = { map: MapPin, call: Phone, ai: MessageCircleQuestion, link: ExternalLink };

export default function IncidentDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { country } = useCountry();
  const { isGuest } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const incidentQuery = useQuery({ queryKey: ['incident', slug], queryFn: () => fetchIncident(slug) });
  const incident = incidentQuery.data?.data as (Incident & { _id?: string }) | null | undefined;

  const progressQuery = useQuery({
    queryKey: ['incident-progress', incident?._id],
    queryFn: () => getIncidentProgress(incident!._id!),
    enabled: Boolean(incident?._id && !isGuest),
  });
  const completedSteps = useMemo(() => progressQuery.data?.data.completedSteps ?? [], [progressQuery.data]);

  const progressMutation = useMutation({
    mutationFn: (next: number[]) => setIncidentProgress(incident!._id!, next),
    onSuccess: (res) => {
      queryClient.setQueryData(['incident-progress', incident?._id], res);
    },
  });

  const toggleStepDone = (order: number) => {
    const next = completedSteps.includes(order) ? completedSteps.filter((o) => o !== order) : [...completedSteps, order];
    progressMutation.mutate(next);
  };

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

  const checked = (stepIdx: number, label: string) => checklist[`${stepIdx}-${label}`] ?? false;
  const toggleChecklistItem = (stepIdx: number, label: string) =>
    setChecklist((prev) => ({ ...prev, [`${stepIdx}-${label}`]: !checked(stepIdx, label) }));

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

        {!isGuest ? (
          <View className="mt-4">
            <StepProgress total={incident.steps.length} current={completedSteps.length} />
            <Text className="mt-1.5 text-[13px] text-muted">Đã hoàn thành {completedSteps.length}/{incident.steps.length} bước</Text>
          </View>
        ) : (
          <View className="mt-4 flex-row items-center gap-2 rounded-lg border border-line bg-surface p-3">
            <LogIn size={16} color={colors.muted} />
            <Text className="flex-1 text-[13px] text-muted">Đăng nhập để lưu tiến độ các bước đã làm.</Text>
            <Pressable onPress={() => router.push('/login?next=/incidents/' + slug as never)}>
              <Text className="text-[13px] font-body-bold text-primary">Đăng nhập</Text>
            </Pressable>
          </View>
        )}

        <View className="mt-6">
          {incident.steps.map((step, i) => {
            const order = step.order ?? i;
            const done = completedSteps.includes(order);
            return (
              <View key={`${step.title}-${i}`} className="flex-row" style={{ gap: 14 }}>
                <View className="items-center">
                  <View className={`h-10 w-10 items-center justify-center rounded-full ${done ? 'bg-success' : i === 0 ? 'bg-primary' : 'bg-primary-soft'}`}>
                    <Text className={`text-sm font-body-bold ${done || i === 0 ? 'text-white' : 'text-primary-strong'}`}>{i + 1}</Text>
                  </View>
                  {i < incident.steps.length - 1 && <View className="w-0.5 flex-1 bg-[#D6E2F5]" style={{ minHeight: 24 }} />}
                </View>
                <View className="flex-1 pb-6">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-[19px] font-body-bold text-ink">{step.title}</Text>
                    {!isGuest && (
                      <Checkbox checked={done} onChange={() => toggleStepDone(order)} accessibilityLabel={`Đánh dấu đã xong: ${step.title}`} />
                    )}
                  </View>
                  {step.body.length > 0 && (
                    <View className="mt-2 rounded-lg border border-line bg-surface p-3.5" style={{ gap: 6 }}>
                      {step.body.map((line, li) => (
                        <Text key={li} className="text-[15px] leading-6 text-muted">
                          • {line}
                        </Text>
                      ))}
                    </View>
                  )}
                  {step.checklist && step.checklist.length > 0 && (
                    <View className="mt-2 rounded-lg border border-line bg-surface p-3.5" style={{ gap: 10 }}>
                      {step.checklist.map((item) => (
                        <Pressable key={item.label} className="flex-row items-center" style={{ gap: 10 }} onPress={() => toggleChecklistItem(i, item.label)}>
                          <Checkbox checked={checked(i, item.label)} onChange={() => toggleChecklistItem(i, item.label)} accessibilityLabel={item.label} />
                          <Text className="flex-1 text-[15px] text-ink">{item.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {step.ctas && step.ctas.length > 0 && (
                    <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
                      {step.ctas.map((cta, ci) => {
                        const Icon = CTA_ICON[cta.type];
                        return (
                          <Pressable
                            key={ci}
                            className="h-11 flex-row items-center justify-center gap-2 rounded-md bg-primary-soft px-3.5"
                            onPress={() => runCta(cta, country?.embassy.phone)}
                          >
                            <Icon size={16} color={colors.primaryStrong} />
                            <Text className="text-sm font-body-bold text-primary-strong">{cta.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
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
