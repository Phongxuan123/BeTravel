import { View, Text, Pressable } from 'react-native';
import { MapPin, Phone } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { openPhone } from '@/lib/openExternal';

export type ContactInfo = { name?: string; address?: string; phone?: string };

/*
 * Thẻ "Thông tin liên hệ" trong câu trả lời cần hỗ trợ chính thức (theo mẫu thiết kế).
 * Dữ liệu lấy từ hồ sơ quốc gia do Admin quản lý (Đại sứ quán), KHÔNG do AI sinh ra, nên không có
 * nguy cơ AI bịa địa chỉ hoặc số điện thoại. Thiếu cả địa chỉ lẫn số điện thoại thì không hiển thị.
 */
export function ContactCard({ contact }: { contact?: ContactInfo | null }) {
  const address = contact?.address?.trim();
  const phone = contact?.phone?.trim();
  if (!address && !phone) return null;

  return (
    <View testID="contact-card" className="mt-3 rounded-xl border border-line bg-bg p-3.5" style={{ gap: 8 }}>
      <Text className="text-[11px] font-body-bold uppercase tracking-wider text-muted">Thông tin liên hệ</Text>
      {contact?.name ? <Text className="text-sm font-body-bold text-ink">{contact.name}</Text> : null}
      {address ? (
        <View className="flex-row items-start" style={{ gap: 8 }}>
          <MapPin size={16} color={colors.danger} />
          <Text className="flex-1 text-sm text-ink">{address}</Text>
        </View>
      ) : null}
      {phone ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Gọi ${phone}`}
          className="flex-row items-center"
          style={{ gap: 8 }}
          onPress={() => void openPhone(phone)}
        >
          <Phone size={16} color={colors.primary} />
          <Text className="text-sm font-body-bold text-primary">{phone}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
