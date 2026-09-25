/**
 * "Đã lưu" (B8) -- gom 3 loại (article/location/incident) thành một danh
 * sách phẳng cho màn hình Favorites. Backend trả nguyên văn đối tượng lồng
 * (article/location/incident); adaptFavorite() rút gọn về FavoriteItem.
 */
import { apiRequest } from './http';
import type { FavoriteItem } from '@/mocks/schemas';

type ApiFavorite = {
  _id: string;
  targetType: FavoriteItem['targetType'];
  targetId: string;
  createdAt: string;
  article?: { countryCode: string; slug: string; title: string; topicSlug: string };
  location?: { countryCode: string; type: string; name: string };
  incident?: { slug: string; title: string; countryCode: string | null };
  isOutdated?: boolean;
  currentArticleId?: string | null;
};

const LOCATION_TYPE_LABEL: Record<string, string> = {
  embassy: 'Đại sứ quán',
  hospital: 'Bệnh viện',
  police: 'Công an',
  pharmacy: 'Nhà thuốc',
  other: 'Hỗ trợ',
};

function adaptFavorite(api: ApiFavorite): FavoriteItem | null {
  if (api.targetType === 'article' && api.article) {
    return {
      id: api._id,
      targetType: 'article',
      targetId: api.targetId,
      title: api.article.title,
      subtitle: api.article.countryCode,
      countryCode: api.article.countryCode,
      slug: api.article.slug,
      isOutdated: api.isOutdated,
      currentArticleId: api.currentArticleId ?? null,
      createdAt: api.createdAt,
    };
  }
  if (api.targetType === 'location' && api.location) {
    return {
      id: api._id,
      targetType: 'location',
      targetId: api.targetId,
      title: api.location.name,
      subtitle: LOCATION_TYPE_LABEL[api.location.type] ?? api.location.type,
      countryCode: api.location.countryCode,
      createdAt: api.createdAt,
    };
  }
  if (api.targetType === 'incident' && api.incident) {
    return {
      id: api._id,
      targetType: 'incident',
      targetId: api.targetId,
      title: api.incident.title,
      subtitle: api.incident.countryCode ?? 'Áp dụng mọi quốc gia',
      slug: api.incident.slug,
      createdAt: api.createdAt,
    };
  }
  // Doi tuong duoc luu da bi xoa hoan toan (khong phai chi superseded) --
  // bo qua thay vi crash man hinh (Rule 7: khong silent fail nhung cung
  // khong de 1 ban ghi mo coi lam vo ca danh sach).
  return null;
}

export async function fetchFavorites(): Promise<{ ok: true; data: FavoriteItem[] }> {
  const raw = await apiRequest<ApiFavorite[]>('/users/favorites');
  const data = raw.map(adaptFavorite).filter((item): item is FavoriteItem => item !== null);
  return { ok: true, data };
}

export async function addFavorite(targetType: FavoriteItem['targetType'], targetId: string): Promise<void> {
  await apiRequest('/users/favorites', { method: 'POST', body: { targetType, targetId } });
}

export async function removeFavorite(targetType: FavoriteItem['targetType'], targetId: string): Promise<void> {
  await apiRequest(`/users/favorites/${targetType}/${targetId}`, { method: 'DELETE' });
}
