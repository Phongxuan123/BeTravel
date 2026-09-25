import { Modal, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { TriangleAlert, X } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { usePollAlerts } from '@/features/alerts/usePollAlerts';
import { markAlertRead } from '@/lib/data';
import { useQueryClient } from '@tanstack/react-query';
import type { Alert } from '@/mocks/schemas';

const SEVERITY_ORDER: Record<string, number> = { danger: 0, warn: 1, info: 2 };
const SEVERITY_COLOR: Record<string, string> = { danger: colors.danger, warn: colors.warning, info: colors.primary };

function pickMostSevere(alerts: Alert[]): Alert | null {
  const undismissed = alerts.filter((a) => !a.read);
  if (undismissed.length === 0) return null;
  return [...undismissed].sort((a, b) => (SEVERITY_ORDER[a.severity ?? 'warn'] ?? 1) - (SEVERITY_ORDER[b.severity ?? 'warn'] ?? 1))[0];
}

/*
 * Canh bao vi tri (B8 muc 6) -- severity 'danger' chan man hinh bang Modal
 * (phai xac nhan da doc moi dong duoc), 'warn'/'info' chi la banner nho o dau
 * noi dung, KHONG chan thao tac. Khong co canh bao nao -> KHONG render gi
 * (muc 9: khong hien placeholder gay nhieu).
 */
export function AlertBanner() {
  const { alerts } = usePollAlerts();
  const queryClient = useQueryClient();
  const alert = pickMostSevere(alerts);

  if (!alert) return null;

  const dismiss = async () => {
    await markAlertRead(alert.id);
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
  };

  const openDetail = () => {
    router.push('/alerts');
  };

  const color = SEVERITY_COLOR[alert.severity ?? 'warn'];

  if (alert.severity === 'danger') {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full rounded-xl bg-white p-5">
            <View className="flex-row items-center gap-2">
              <TriangleAlert size={24} color={colors.danger} />
              <Text className="flex-1 text-lg font-body-bold text-ink">{alert.title}</Text>
            </View>
            <Text className="mt-2 text-[15px] leading-6 text-ink">{alert.body}</Text>
            {alert.behaviorsToAvoid && alert.behaviorsToAvoid.length > 0 && (
              <View className="mt-3" style={{ gap: 4 }}>
                <Text className="text-xs font-body-bold uppercase tracking-wide text-muted">Hành vi cần tránh</Text>
                {alert.behaviorsToAvoid.map((b, i) => (
                  <Text key={i} className="text-sm text-ink">
                    • {b}
                  </Text>
                ))}
              </View>
            )}
            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <Pressable onPress={dismiss} className="h-12 flex-1 items-center justify-center rounded-lg border border-line">
                <Text className="font-body-bold text-ink">Đã hiểu</Text>
              </Pressable>
              <Pressable onPress={openDetail} className="h-12 flex-1 items-center justify-center rounded-lg bg-danger">
                <Text className="font-body-bold text-white">Xem chi tiết</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Pressable onPress={openDetail} className="flex-row items-center gap-2.5 border-b border-line px-4 py-2.5" style={{ backgroundColor: `${color}1A` }}>
      <TriangleAlert size={18} color={color} />
      <View className="flex-1">
        <Text className="text-sm font-body-bold text-ink" numberOfLines={1}>
          {alert.title}
        </Text>
        <Text className="text-xs text-muted" numberOfLines={1}>
          {alert.body}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Đóng cảnh báo"
        onPress={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        hitSlop={8}
      >
        <X size={18} color={colors.muted} />
      </Pressable>
    </Pressable>
  );
}
