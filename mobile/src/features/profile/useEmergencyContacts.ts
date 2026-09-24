import { useUserStorage } from '@/lib/useUserStorage';
import { StorageKeys } from '@/lib/storage';

export type EmergencyContact = { id: string; name: string; relationship: string; phone: string };

// Không gán liên hệ mẫu cho tài khoản thật; dữ liệu cục bộ tách theo người dùng.
export function useEmergencyContacts() {
  const { value: contacts, loaded, update } = useUserStorage<EmergencyContact[]>(StorageKeys.emergencyContacts, []);
  const addContact = (input: Omit<EmergencyContact, 'id'>) => update((current) => [
    ...current, { ...input, id: `contact-${Date.now()}-${Math.random().toString(36).slice(2)}` },
  ]);
  const removeContact = (id: string) => update((current) => current.filter((contact) => contact.id !== id));
  return { contacts, loaded, addContact, removeContact };
}
