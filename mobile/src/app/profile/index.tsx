import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import {
  IdCard,
  CreditCard,
  Shield,
  Pencil,
  Phone,
  Calendar,
  Bookmark,
  MessageCircle,
  Settings,
  ChevronRight,
  Lock,
  Check,
  Trash2,
} from 'lucide-react-native';
import { AppShell, APP_SHELL_CONTENT_BOTTOM_PADDING } from '@/components/common/AppShell';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile } from '@/components/ui/IconTile';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api/http';
import { useEmergencyContacts } from '@/features/profile/useEmergencyContacts';
import { useDocumentStatus, type DocumentKey } from '@/features/profile/useDocumentStatus';

const DOCUMENTS: { key: DocumentKey; label: string; icon: typeof IdCard }[] = [
  { key: 'passport', label: 'Hộ chiếu', icon: IdCard },
  { key: 'visa', label: 'Visa', icon: CreditCard },
  { key: 'insurance', label: 'Bảo hiểm', icon: Shield },
];

export default function ProfileScreen() {
  const { user, isGuest, updateProfile } = useAuth();
  const { contacts, addContact, removeContact } = useEmergencyContacts();
  const { status, setDocument } = useDocumentStatus();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.name ?? '');
  const [addingContact, setAddingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState({ name: '', relationship: '', phone: '' });
  const [activeDoc, setActiveDoc] = useState<DocumentKey | null>(null);
  const [docNoteDraft, setDocNoteDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  if (isGuest) {
    return (
      <AppShell active="profile">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-lg font-body-bold text-ink">Đăng nhập để xem hồ sơ của bạn</Text>
          <Pressable className="mt-5 h-14 items-center justify-center rounded-lg bg-primary px-8" onPress={() => router.push('/login')}>
            <Text className="font-body-bold text-white">Đăng nhập</Text>
          </Pressable>
        </View>
      </AppShell>
    );
  }

  const initials = user!.name.slice(0, 2).toUpperCase();

  const openEditName = () => {
    setNameDraft(user!.name);
    setNameError(null);
    setEditingName(true);
  };
  const saveName = async () => {
    if (!nameDraft.trim()) return;
    setNameError(null);
    setSavingName(true);
    try {
      await updateProfile({ name: nameDraft.trim() });
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : 'Không thể lưu. Kiểm tra kết nối mạng và thử lại.');
    } finally {
      setSavingName(false);
    }
  };

  const openAddContact = () => {
    setContactDraft({ name: '', relationship: '', phone: '' });
    setAddingContact(true);
  };
  const saveContact = async () => {
    if (!contactDraft.name.trim() || !contactDraft.phone.trim()) return;
    await addContact(contactDraft);
    setAddingContact(false);
  };

  const openDocument = (key: DocumentKey) => {
    setDocNoteDraft(status[key].note);
    setActiveDoc(key);
  };
  const saveDocument = async (added: boolean) => {
    if (!activeDoc) return;
    await setDocument(activeDoc, { added, note: docNoteDraft.trim() });
    setActiveDoc(null);
  };

  const activeDocMeta = activeDoc ? DOCUMENTS.find((d) => d.key === activeDoc) : null;

  return (
    <AppShell active="profile">
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: APP_SHELL_CONTENT_BOTTOM_PADDING, gap: 20 }}>
        <View className="flex-row items-center" style={{ gap: 14 }}>
          <View className="h-16 w-16 items-center justify-center rounded-lg bg-[#DCE8FB]">
            <Text className="text-2xl font-body-bold text-primary-strong">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-display text-ink" style={{ fontSize: 24 }}>
              {user!.name}
            </Text>
            <Text className="text-[15px] text-muted">{user!.email}</Text>
          </View>
          <IconButton accessibilityLabel="Sửa hồ sơ" variant="outline" size={50} icon={<Pencil size={18} color={colors.ink} />} onPress={openEditName} />
        </View>

        <View className="rounded-lg border border-line bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-body-bold text-ink">Giấy tờ của tôi</Text>
            <View className="flex-row items-center gap-1 rounded-full bg-success-soft px-2.5 py-1">
              <Lock size={12} color={colors.success} />
              <Text className="text-xs font-body-bold text-success">Đã mã hoá</Text>
            </View>
          </View>
          <View className="mt-3 flex-row" style={{ gap: 10 }}>
            {DOCUMENTS.map((d) => {
              const added = status[d.key].added;
              return (
                <Pressable key={d.key} onPress={() => openDocument(d.key)} className="h-[92px] flex-1 items-center justify-center gap-2 rounded-lg bg-bg">
                  <View>
                    <IconTile tone={added ? 'green' : 'blue'} size={40}>
                      <d.icon size={18} color={added ? colors.success : colors.primary} />
                    </IconTile>
                    {added && (
                      <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-success">
                        <Check size={10} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text className="text-[15px] font-body-bold text-ink">{d.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="rounded-lg border border-line bg-surface p-4">
          <Text className="text-lg font-body-bold text-ink">Liên hệ khẩn cấp</Text>
          <View className="mt-3" style={{ gap: 10 }}>
            {contacts.map((contact) => (
              <View key={contact.id} className="flex-row items-center" style={{ gap: 12 }}>
                <View className="h-[50px] w-[50px] items-center justify-center rounded-md bg-danger-soft">
                  <Text className="font-body-bold text-danger">{contact.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[17px] font-body-bold text-ink">{contact.name}</Text>
                  <Text className="text-sm text-muted">
                    {contact.relationship} · {contact.phone}
                  </Text>
                </View>
                <IconButton accessibilityLabel={`Gọi ${contact.name}`} variant="soft" icon={<Phone size={18} color={colors.primary} />} onPress={() => Linking.openURL(`tel:${contact.phone}`)} />
                <IconButton accessibilityLabel={`Xoá ${contact.name}`} variant="outline" icon={<Trash2 size={16} color={colors.danger} />} onPress={() => removeContact(contact.id)} />
              </View>
            ))}
          </View>
          <Pressable onPress={openAddContact} className="mt-3 h-14 items-center justify-center rounded-lg border border-dashed border-[#C9D6EE]">
            <Text className="font-body-bold text-primary">+ Thêm liên hệ</Text>
          </Pressable>
        </View>

        <View className="overflow-hidden rounded-lg border border-line bg-surface">
          <MenuRow icon={<Calendar size={20} color={colors.primary} />} label="Chuyến đi của tôi" count="3" onPress={() => router.push('/trips')} />
          <View className="h-px bg-line" />
          <MenuRow icon={<Bookmark size={20} color={colors.warning} />} label="Quy định đã lưu" count="12" onPress={() => router.push('/explore?saved=1' as never)} />
          <View className="h-px bg-line" />
          <MenuRow icon={<MessageCircle size={20} color={colors.primary} />} label="Lịch sử hỏi AI" onPress={() => router.push('/chat')} />
          <View className="h-px bg-line" />
          <MenuRow icon={<Settings size={20} color={colors.muted} />} label="Cài đặt" onPress={() => router.push('/settings')} />
        </View>
      </ScrollView>

      <SimpleSheet visible={editingName} onClose={() => setEditingName(false)} title="Sửa hồ sơ">
        <TextField label="Họ và tên" value={nameDraft} onChangeText={setNameDraft} />
        {nameError && (
          <View className="mt-3 rounded-md bg-danger-tint p-3">
            <Text className="text-sm text-danger">{nameError}</Text>
          </View>
        )}
        <View className="mt-4">
          <Button label="Lưu thay đổi" onPress={saveName} disabled={!nameDraft.trim()} loading={savingName} />
        </View>
      </SimpleSheet>

      <SimpleSheet visible={addingContact} onClose={() => setAddingContact(false)} title="Thêm liên hệ khẩn cấp">
        <View style={{ gap: 14 }}>
          <TextField label="Họ và tên" value={contactDraft.name} onChangeText={(v) => setContactDraft((p) => ({ ...p, name: v }))} />
          <TextField label="Quan hệ" placeholder="Ví dụ: Chị gái, Bạn thân..." value={contactDraft.relationship} onChangeText={(v) => setContactDraft((p) => ({ ...p, relationship: v }))} />
          <TextField label="Số điện thoại (kèm mã quốc gia)" placeholder="+84..." keyboardType="phone-pad" value={contactDraft.phone} onChangeText={(v) => setContactDraft((p) => ({ ...p, phone: v }))} />
          <Button label="Thêm liên hệ" onPress={saveContact} disabled={!contactDraft.name.trim() || !contactDraft.phone.trim()} />
        </View>
      </SimpleSheet>

      <SimpleSheet visible={activeDoc !== null} onClose={() => setActiveDoc(null)} title={activeDocMeta ? activeDocMeta.label : ''}>
        <Text className="text-sm text-muted">
          Vì lý do an toàn dữ liệu, Be.Travel chưa lưu ảnh giấy tờ ở phiên bản này — chỉ ghi nhận bạn đã chuẩn bị sẵn giấy tờ và số hồ sơ (nếu có) để tra cứu nhanh khi cần.
        </Text>
        <View className="mt-4">
          <TextField label="Số hồ sơ / ghi chú (không bắt buộc)" value={docNoteDraft} onChangeText={setDocNoteDraft} placeholder="Ví dụ: số hộ chiếu, ngày hết hạn..." />
        </View>
        <View className="mt-4" style={{ gap: 10 }}>
          <Button label={activeDoc && status[activeDoc].added ? 'Cập nhật' : 'Đánh dấu đã chuẩn bị'} onPress={() => saveDocument(true)} />
          {activeDoc && status[activeDoc].added && (
            <Button label="Bỏ đánh dấu" variant="secondary" onPress={() => saveDocument(false)} />
          )}
        </View>
      </SimpleSheet>
    </AppShell>
  );
}

function MenuRow({ icon, label, count, onPress }: { icon: React.ReactNode; label: string; count?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="h-[62px] flex-row items-center px-4" style={{ gap: 12 }}>
      <IconTile tone="blue" size={40}>
        {icon}
      </IconTile>
      <Text className="flex-1 text-[17px] font-body-bold text-ink">{label}</Text>
      {count && <Badge label={count} tone="neutral" />}
      <ChevronRight size={20} color={colors.muted} />
    </Pressable>
  );
}
