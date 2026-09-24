/**
 * Cầu nối mô hình dữ liệu API thật <-> shape mà 6 màn hình mobile đang dùng
 * (định nghĩa ở mocks/schemas.ts). Toàn bộ khác biệt mô hình xử lý Ở ĐÂY,
 * không sửa component (CLAUDE.md B3 mục 8). Hàm pure, có test đối chiếu
 * contracts/fixtures/ ở __tests__/adapters.test.ts.
 */
import type { Article, Country, QuickPhrase, SearchResultItem, SupportLocation, Topic, Trip } from '@/mocks/schemas';

// ── Raw API shapes (khớp backend/src/models + publicContent.service.js) ──
export type ApiEmergencyNumbers = { police?: string; ambulance?: string; fire?: string; marine?: string };
export type ApiEmbassy = { name?: string; address?: string; phone?: string; lat?: number; lng?: number };

export type ApiCountry = {
  code: string;
  name: string;
  nameEn?: string;
  language?: string;
  status: 'active' | 'coming_soon';
  emergencyNumbers?: ApiEmergencyNumbers;
  embassy?: ApiEmbassy;
  articleCount: number;
};

export type ApiTopic = {
  countryCode: string;
  slug: string;
  label: string;
  icon?: string;
  order: number;
  articleCount: number;
};

export type ApiKeyPoint = { text: string; severity: 'normal' | 'criminal' };
export type ApiPenalty = { behavior: string; amountText?: string; currency?: string; note?: string };
export type ApiSource = { title: string; url: string; authority: string; kind?: string; publishedAt?: string; accessedAt?: string };

export type ApiArticle = {
  _id: string;
  countryCode: string;
  topicSlug: string;
  slug: string;
  title: string;
  summaryVi: string;
  keyPoints: ApiKeyPoint[];
  penalties: ApiPenalty[];
  exceptions: string[];
  foreignerNotes: string[];
  sources: ApiSource[];
  effectiveFrom?: string;
  updatedAt: string;
};

export type ApiSearchHit = {
  id: string;
  countryCode: string;
  slug: string;
  title: string;
  summaryVi: string;
  topicSlug: string;
  topicLabel: string;
  sourceAgency: string;
};

export type ApiTrip = {
  _id: string;
  countryCode: string;
  destinationCity?: string;
  destinationDetail?: string;
  locationAlerts?: boolean;
  regulationAlerts?: boolean;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

// ── Country ──────────────────────────────────────────────────────────────
// region/currentCity/embassy.openTime/closeTime/distanceKm KHÔNG có trong mô
// hình backend (docs/00_BeTravel_MasterPlan_v2.md Phần C.2 không định nghĩa
// các field này) -- đây thuần là nhãn trình bày cho UI hiện có, không phải
// dữ liệu nghiệp vụ, nên không hard-code ở backend. Quốc gia chưa có trong
// bảng dưới dùng giá trị dự phòng trung tính.
const REGION_BY_CODE: Record<string, string> = {
  KR: 'Đông Á',
  JP: 'Đông Á',
  TH: 'Đông Nam Á',
  SG: 'Đông Nam Á',
};


export function adaptCountry(api: ApiCountry): Country {
  return {
    code: api.code,
    name: api.name,
    region: REGION_BY_CODE[api.code] ?? '',
    language: api.language ?? '',
    regulationsCount: api.articleCount,
    // Country khong phai la vi tri hien tai cua user. Khong bia thu do lam vi tri.
    currentCity: '',
    status: api.status,
    emergencyNumbers: {
      police: api.emergencyNumbers?.police ?? '',
      ambulance: api.emergencyNumbers?.ambulance ?? '',
      fire: api.emergencyNumbers?.fire ?? '',
      marine: api.emergencyNumbers?.marine ?? '',
    },
    embassy: {
      name: api.embassy?.name ?? '',
      address: api.embassy?.address ?? '',
      phone: api.embassy?.phone ?? '',
      lat: api.embassy?.lat ?? 0,
      lng: api.embassy?.lng ?? 0,
      // Chua co du lieu gio mo cua / khoang cach that (can vi tri nguoi dung,
      // du kien noi o B6/B8) -- dat gia tri trung tinh thay vi bia so lieu.
      openTime: '',
      closeTime: '',
      distanceKm: 0,
    },
  };
}

// ── Topic ────────────────────────────────────────────────────────────────
// iconKey la enum dong o mobile (chi 6 gia tri, dung de chon icon UI). Backend
// luu 'icon' dang chuoi tu do (danh cho admin nhap), nen phai suy ra iconKey
// tu topicSlug -- day CHINH LA khac biet mo hinh du lieu adapters.ts sinh ra
// de xu ly (CLAUDE.md B3 muc 8).
const ICON_KEY_BY_TOPIC_SLUG: Record<string, Topic['iconKey']> = {
  'nhap-canh': 'entry',
  'giao-thong': 'traffic',
  'hinh-su': 'security',
  'hai-quan': 'documents',
  'lao-dong': 'documents',
  'khan-cap': 'public',
};

export function adaptTopic(api: ApiTopic): Topic {
  return {
    key: api.slug,
    countryCode: api.countryCode,
    label: api.label,
    iconKey: ICON_KEY_BY_TOPIC_SLUG[api.slug] ?? 'documents',
    count: api.articleCount,
  };
}

// ── Article ──────────────────────────────────────────────────────────────
function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${mm}/${date.getFullYear()}`;
}

export function adaptArticle(api: ApiArticle): Article {
  const primarySource = api.sources[0];
  return {
    id: api._id,
    slug: api.slug,
    countryCode: api.countryCode,
    topicKey: api.topicSlug,
    title: api.title,
    summary: api.summaryVi,
    // API cong khai CHI tra bai da published+isCurrent (loc o
    // backend/src/services/publicContent.service.js) -- nen luon la 'active'.
    status: 'active',
    updatedAt: formatUpdatedAt(api.updatedAt),
    source: {
      name: primarySource?.title ?? '',
      agency: primarySource?.authority ?? '',
      url: primarySource?.url ?? '',
    },
    keyPoints: api.keyPoints,
    fines: api.penalties.map((p) => (p.amountText ? `${p.behavior}: ${p.amountText}` : p.behavior)),
    exceptions: api.exceptions,
    foreignerNotes: api.foreignerNotes,
    // Tinh nang "luu quy dinh" (favorites) thuoc B8, chua co API -- mac dinh false.
    saved: false,
  };
}

// ── Search ───────────────────────────────────────────────────────────────
export function adaptSearchHit(api: ApiSearchHit): SearchResultItem {
  return {
    id: api.id,
    title: api.title,
    summary: api.summaryVi,
    topicLabel: api.topicLabel,
    source: api.sourceAgency,
    countryCode: api.countryCode,
    slug: api.slug,
  };
}

// ── Trip ─────────────────────────────────────────────────────────────────
// Backend tra Date dang ISO datetime day du ('...T00:00:00.000Z'); man hinh
// dung lib/date.ts#parseISODate ghep them 'T00:00:00' vao sau chuoi ngay --
// PHAI cat ve dang 'YYYY-MM-DD' truoc, khong thi ghep chuoi se sai dinh dang.
function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function adaptTrip(api: ApiTrip): Trip {
  return {
    id: api._id,
    countryCode: api.countryCode,
    destinationCity: api.destinationCity ?? '',
    destinationDetail: api.destinationDetail ?? '',
    locationAlerts: api.locationAlerts ?? true,
    regulationAlerts: api.regulationAlerts ?? true,
    startDate: toDateOnly(api.startDate),
    endDate: toDateOnly(api.endDate),
    isCurrent: api.isCurrent,
  };
}

// ── SupportLocation (B6) ────────────────────────────────────────────────
export type ApiSupportLocation = {
  _id: string;
  countryCode: string;
  type: 'embassy' | 'hospital' | 'police' | 'pharmacy' | 'other';
  name: string;
  nameLocal?: string;
  address?: string;
  phone?: string;
  website?: string;
  openHours?: string;
  location: { type: 'Point'; coordinates: [number, number] };
  verified: boolean;
  verifiedAt?: string | null;
  distanceMeters?: number; // chi co khi tra ve tu /support-locations/nearby
};

const LOCATION_TYPE_LABEL: Record<ApiSupportLocation['type'], string> = {
  embassy: 'Đại sứ quán',
  hospital: 'Bệnh viện',
  police: 'Công an',
  pharmacy: 'Nhà thuốc',
  other: 'Hỗ trợ',
};

// `meta` la dong mo ta ngan hien trong danh sach ban do (man hinh khong tu
// ghep chuoi -- giu nguyen quy uoc cu tu ban mock, chi doi nguon du lieu).
function buildLocationMeta(api: ApiSupportLocation, distanceKm?: number): string {
  const parts = [LOCATION_TYPE_LABEL[api.type]];
  if (distanceKm !== undefined) parts.push(`${distanceKm < 1 ? Math.round(distanceKm * 1000) + ' m' : distanceKm.toFixed(1) + ' km'}`);
  if (api.openHours) parts.push(api.openHours);
  return parts.join(' · ');
}

export function adaptSupportLocation(api: ApiSupportLocation): SupportLocation {
  const distanceKm = api.distanceMeters !== undefined ? api.distanceMeters / 1000 : undefined;
  return {
    id: api._id,
    type: api.type,
    name: api.name,
    nameLocal: api.nameLocal ?? '',
    meta: buildLocationMeta(api, distanceKm),
    address: api.address ?? '',
    openHours: api.openHours ?? '',
    website: api.website ?? '',
    verified: api.verified,
    verifiedAt: api.verifiedAt ?? null,
    distanceKm,
    phone: api.phone ?? '',
    lat: api.location.coordinates[1],
    lng: api.location.coordinates[0],
    featured: api.type === 'embassy',
  };
}

// quick-phrases van 100% mock toi B7 (dich khan cap) -- khong co adapter that
// o batch nay. Khai bao lai type de content.ts import duoc mot noi thong nhat.
export type { QuickPhrase };
