import { useEffect, useState } from 'react';
import { getJSON, setJSON, StorageKeys } from '@/lib/storage';

/*
 * "Đã lưu quy định" -- luu cuc bo (AsyncStorage), CHUA co backend that (tinh
 * nang favorites thuoc pham vi B8). Khoa la `${countryCode}:${slug}` de doc
 * lap voi cac quoc gia khac. Dung chung cho ExploreScreen va man hinh chi
 * tiet bai luat, tranh 2 noi tu quan ly trang thai rieng le sai lech nhau.
 */
function articleKey(countryCode: string, slug: string): string {
  return `${countryCode}:${slug}`;
}

export function useSavedArticles() {
  const [savedKeys, setSavedKeys] = useState<string[]>([]);

  useEffect(() => {
    getJSON<string[]>(StorageKeys.savedArticles).then((saved) => {
      if (saved) setSavedKeys(saved);
    });
  }, []);

  const isSaved = (countryCode: string, slug: string) => savedKeys.includes(articleKey(countryCode, slug));

  const toggleSaved = async (countryCode: string, slug: string) => {
    const key = articleKey(countryCode, slug);
    const next = savedKeys.includes(key) ? savedKeys.filter((k) => k !== key) : [...savedKeys, key];
    setSavedKeys(next);
    await setJSON(StorageKeys.savedArticles, next);
  };

  return { savedKeys, isSaved, toggleSaved };
}
