import { useEffect, useState } from 'react';
import { getJSON, setJSON, StorageKeys } from '@/lib/storage';

export type EmergencyContact = { id: string; name: string; relationship: string; phone: string };

const DEFAULT_CONTACTS: EmergencyContact[] = [
  { id: 'c1', name: 'Trần Thu Hà', relationship: 'Chị gái', phone: '+84912345678' },
];

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `contact${idCounter}`;
}

// Danh sách liên hệ khẩn cấp — lưu cục bộ (AsyncStorage), chưa có backend thật (spec §6.17).
export function useEmergencyContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>(DEFAULT_CONTACTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getJSON<EmergencyContact[]>(StorageKeys.emergencyContacts).then((saved) => {
      if (saved) setContacts(saved);
      setLoaded(true);
    });
  }, []);

  const addContact = async (input: Omit<EmergencyContact, 'id'>) => {
    const next = [...contacts, { id: nextId(), ...input }];
    setContacts(next);
    await setJSON(StorageKeys.emergencyContacts, next);
  };

  const removeContact = async (id: string) => {
    const next = contacts.filter((c) => c.id !== id);
    setContacts(next);
    await setJSON(StorageKeys.emergencyContacts, next);
  };

  return { contacts, loaded, addContact, removeContact };
}
