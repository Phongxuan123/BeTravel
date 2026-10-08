import { Pressable, Text, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { openPhone } from '@/lib/openExternal';
import { OFFLINE_EMERGENCY } from './offlineEmergency';

function formatCheckedAt(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function CallRow({ label, phone, tone }: { label: string; phone: string; tone: 'danger' | 'primary' }) {
  const background = tone === 'danger' ? 'bg-danger' : 'bg-primary';
  return (
    <Pressable accessibilityLabel={`Gọi ${label} ${phone}`} onPress={() => void openPhone(phone)}
      className={`h-[52px] flex-row items-center justify-between rounded-md px-4 ${background}`}>
      <Text className="flex-1 font-body-bold text-white" numberOfLines={1}>{label}</Text>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Phone size={16} color="#fff" />
        <Text className="font-mono-bold text-white">{phone}</Text>
      </View>
    </Pressable>
  );
}

/** Số khẩn cấp đóng gói sẵn, hiện khi chưa tải được dữ liệu quốc gia (ví dụ mở app lúc mất mạng). */
export function OfflineEmergencyList() {
  return (
    <View style={{ gap: 18 }}>
      {OFFLINE_EMERGENCY.map((entry) => (
        <View key={entry.countryCode} style={{ gap: 8 }}>
          <Text className="text-xs font-body-bold uppercase tracking-wide text-muted">
            Số khẩn cấp tại {entry.countryName} (có sẵn khi mất mạng)
          </Text>
          {entry.numbers.map((item) => (
            <CallRow key={item.phone} label={item.label} phone={item.phone} tone="danger" />
          ))}
          <CallRow label={entry.embassy.name} phone={entry.embassy.phone} tone="primary" />
          <Text className="text-xs leading-5 text-muted">
            {entry.embassy.address}. Đối chiếu nguồn chính thức ngày {formatCheckedAt(entry.checkedAt)}. Gọi được hay không
            còn phụ thuộc sóng điện thoại.
          </Text>
        </View>
      ))}
    </View>
  );
}
