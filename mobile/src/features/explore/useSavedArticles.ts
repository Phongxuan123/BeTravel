import { useUserStorage } from '@/lib/useUserStorage';
import { StorageKeys } from '@/lib/storage';

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
  const { value: savedKeys, update } = useUserStorage<string[]>(StorageKeys.savedArticles, []);
  const isSaved = (countryCode: string, slug: string) => savedKeys.includes(articleKey(countryCode, slug));
  const toggleSaved = (countryCode: string, slug: string) => {
    const key = articleKey(countryCode, slug);
    return update((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  return { savedKeys, isSaved, toggleSaved };
}
