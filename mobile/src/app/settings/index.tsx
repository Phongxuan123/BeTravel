import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ToastAndroid, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Globe, Flag, ChevronRight, LogOut, Check } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { IconTile } from '@/components/ui/IconTile';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useCountry } from '@/lib/countryContext';
import { fetchCountries } from '@/lib/data';
import { changePassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';
import { passwordValidationMessage } from '@/lib/password';

function toast(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert(message);
}

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { country, countryCode, setCountryCode } = useCountry();
  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });
  const countries = countriesQuery.data?.data ?? [];
  const [legalAlerts, setLegalAlerts] = useState(true);
  const [safetyAlerts, setSafetyAlerts] = useState(true);
  const [tripReminder, setTripReminder] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);

  const [pickingCountry, setPickingCountry] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const onLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } finally {
            // logout() da tu nuot loi API revoke va van dam bao xoa state
            // cuc bo (xem lib/auth.tsx) -- dieu huong ve /login du the nao.
            router.replace('/login');
          }
        },
      },
    ]);
  };

  const onSubmitPasswordChange = async () => {
    if (pwForm.current.length < 1) {
      setPwError('Nhập mật khẩu hiện tại.');
      return;
    }
    const passwordError = passwordValidationMessage(pwForm.next);
    if (passwordError) {
      setPwError(passwordError);
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Xác nhận mật khẩu không khớp.');
      return;
    }

    setPwError(null);
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      setChangingPassword(false);
      setPwForm({ current: '', next: '', confirm: '' });
      toast('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      await logout();
      router.replace('/login');
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : 'Không thể đổi mật khẩu. Vui lòng thử lại.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <PageHeader title="Cài đặt" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48, gap: 24 }}>
        <SettingsGroup title="NGÔN NGỮ & KHU VỰC">
          <SettingsRow icon={<Globe size={18} color={colors.primary} />} label="Ngôn ngữ ứng dụng" value="Tiếng Việt" onPress={() => toast('Hiện chỉ hỗ trợ tiếng Việt')} />
          <SettingsRow icon={<Flag size={18} color={colors.primary} />} label="Quốc gia mặc định" value={country?.name} onPress={() => setPickingCountry(true)} />
        </SettingsGroup>

        <SettingsGroup title="THÔNG BÁO">
          <SettingsSwitchRow label="Cảnh báo pháp lý" description="Khi quy định ở quốc gia bạn đến thay đổi" value={legalAlerts} onValueChange={setLegalAlerts} />
          <SettingsSwitchRow label="Cảnh báo an toàn" description="Theo vị trí hiện tại của bạn" value={safetyAlerts} onValueChange={setSafetyAlerts} />
          <SettingsSwitchRow label="Nhắc chuyến đi" description="Trước ngày khởi hành 3 ngày" value={tripReminder} onValueChange={setTripReminder} />
        </SettingsGroup>

        <SettingsGroup title="QUYỀN RIÊNG TƯ">
          <SettingsRow label="Truy cập vị trí" value="Khi dùng ứng dụng" onPress={() => toast('Mở cài đặt trình duyệt/hệ thống để thay đổi quyền vị trí')} />
          <SettingsSwitchRow label="Chia sẻ vị trí khi SOS" description="Gửi cho 2 liên hệ khẩn cấp" value={shareLocation} onValueChange={setShareLocation} />
        </SettingsGroup>

        <SettingsGroup title="TÀI KHOẢN">
          <View className="h-[64px] flex-row items-center justify-between px-4">
            <Text className="text-[17px] font-body-semibold text-ink">Vai trò</Text>
            <Badge label="Người dùng" tone="info" />
          </View>
          <View className="h-px bg-line" />
          <SettingsRow label="Đổi mật khẩu" onPress={() => setChangingPassword(true)} />
        </SettingsGroup>

        <Pressable onPress={onLogout} className="h-[52px] flex-row items-center justify-center gap-2 rounded-lg border border-danger-line bg-surface">
          <LogOut size={18} color={colors.danger} />
          <Text className="text-[17px] font-body-bold text-danger">Đăng xuất</Text>
        </Pressable>
      </ScrollView>

      <SimpleSheet visible={pickingCountry} onClose={() => setPickingCountry(false)} title="Quốc gia mặc định">
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {countries.map((c) => {
            const selected = c.code === countryCode;
            return (
              <Pressable
                key={c.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  setCountryCode(c.code);
                  setPickingCountry(false);
                }}
                className={`h-16 flex-row items-center rounded-lg border px-3 ${selected ? 'border-[1.5px] border-primary bg-[#F4F8FF]' : 'border-line bg-surface'}`}
              >
                <CountryFlag code={c.code} width={36} height={26} />
                <Text className="ml-3 flex-1 text-base font-body-semibold text-ink">{c.name}</Text>
                {selected && <Check size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </SimpleSheet>

      <SimpleSheet visible={changingPassword} onClose={() => setChangingPassword(false)} title="Đổi mật khẩu">
        <View style={{ gap: 14 }}>
          <TextField label="Mật khẩu hiện tại" secureTextEntry value={pwForm.current} onChangeText={(v) => setPwForm((p) => ({ ...p, current: v }))} />
          <TextField label="Mật khẩu mới" secureTextEntry helperText="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số" value={pwForm.next} onChangeText={(v) => setPwForm((p) => ({ ...p, next: v }))} />
          <TextField label="Xác nhận mật khẩu mới" secureTextEntry value={pwForm.confirm} onChangeText={(v) => setPwForm((p) => ({ ...p, confirm: v }))} />
          {pwError && (
            <View className="rounded-md bg-danger-tint p-3">
              <Text className="text-sm text-danger">{pwError}</Text>
            </View>
          )}
          <Button label="Đổi mật khẩu" onPress={onSubmitPasswordChange} loading={savingPassword} />
        </View>
      </SimpleSheet>
    </View>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-2 text-[11px] font-body-bold uppercase tracking-wider text-muted">{title}</Text>
      <View className="overflow-hidden rounded-lg border border-line bg-surface">{children}</View>
    </View>
  );
}

function SettingsRow({ icon, label, value, onPress }: { icon?: React.ReactNode; label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="h-16 flex-row items-center px-4" style={{ gap: 12 }}>
      {icon && (
        <IconTile tone="blue" size={36}>
          {icon}
        </IconTile>
      )}
      <Text className="flex-1 text-[17px] font-body-semibold text-ink">{label}</Text>
      {value && <Text className="text-muted">{value}</Text>}
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

function SettingsSwitchRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View className="min-h-[64px] flex-row items-center justify-between px-4 py-3">
      <View className="flex-1 pr-3">
        <Text className="text-[17px] font-body-semibold text-ink">{label}</Text>
        <Text className="text-[13px] text-muted">{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}
