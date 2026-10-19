/**
 * Luật LIÊN BANG Úc qua backend (/api/laws/australia/*, contracts/README.md mục 24).
 * Chỉ gọi API thật, không có bản mock: dữ liệu là bản sao chỉ-đọc của Federal
 * Register of Legislation. Chỉ gồm luật Commonwealth, không gồm luật các bang.
 * apiRequestWithMeta giữ `meta.total` để màn hình biết còn trang sau hay không.
 */
import { apiRequest, apiRequestWithMeta } from './http';

// Quốc gia có nguồn luật liên bang tra trực tiếp; các quốc gia khác dùng Cẩm nang đã xác minh.
export const AU_COUNTRY_CODE = 'AU';
export const AU_LAW_PAGE_SIZE = 20;
export const AU_LAW_CONTENT_PAGE_SIZE = 100;

export const AU_SCOPE_NOTICE =
  'Chỉ gồm luật liên bang (Commonwealth) của Úc, không gồm luật của các bang và vùng lãnh thổ. ' +
  'Nội dung lấy nguyên văn từ nguồn chính thức, chưa qua kiểm chứng của Be.Travel.';

// Giá trị khớp đúng tên collection của nguồn (đã đối chiếu số bản ghi trên API thật).
export const AU_COLLECTIONS = [
  { value: 'Act', label: 'Đạo luật' },
  { value: 'LegislativeInstrument', label: 'Văn bản dưới luật' },
  { value: 'NotifiableInstrument', label: 'Văn bản thông báo' },
  { value: 'Gazette', label: 'Công báo' },
] as const;

export type AuLawSummary = {
  id: string;
  name: string;
  // Tên tiếng Việt tham khảo: curated = viết sẵn, machine = AI dịch; null nếu chưa có (hiện tên tiếng Anh).
  nameVi: string | null;
  nameViSource: 'curated' | 'machine' | null;
  collection: string | null;
  status: string | null;
  isInForce: boolean;
  makingDate: string | null;
  year: number | null;
  number: number | null;
  topics: string[];
  officialUrl: string;
};

export type AuLawTopic = { slug: string; label: string; note: string; lawCount: number };

export const AU_NAME_VI_NOTICE =
  'Tên tiếng Việt chỉ là bản dịch tham khảo; tên chính thức của luật là tiếng Anh (hiển thị bên dưới).';

export const AU_TOPICS_NOTICE =
  'Các mục do Be.Travel tuyển chọn thủ công từ luật liên bang liên quan, không phải danh sách đầy đủ.';

export type AuLawVersion = {
  registerId: string;
  compilationNumber: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
};

export type AuLawDocument = {
  type: string;
  format: string;
  volumeNumber: number;
  pageCount: number | null;
  isAuthorised: boolean;
};

export type AuLawDetail = AuLawSummary & {
  version: AuLawVersion | null;
  documents: AuLawDocument[];
  hasReadableText: boolean;
  canTranslate: boolean;
};

export type AuLawOutlineItem = { level: 'chapter' | 'part' | 'division'; text: string; citationId: string };

export type AuLawDeepPart = {
  heading: string;
  citationId: string;
  summary: string;
  // partial: AI chỉ thấy các Điều đầu của phần quá dài
  partial: boolean;
  keyPoints: { text: string; citationIds: string[] }[];
};

export type AuLawDeepSummary = { parts: AuLawDeepPart[]; skippedParts: number; truncated: boolean; generatedAt: string };

export type AuLawOverview = {
  deepStatus: 'ready' | 'generating' | 'not_generated' | 'not_eligible' | 'unavailable';
  deepSummary: AuLawDeepSummary | null;
  purpose: { text: string; citationId: string } | null;
  outline: AuLawOutlineItem[];
  outlineTruncated: boolean;
  // ready: có bản AI tiếng Việt · not_eligible: luật ngoài danh sách tuyển chọn · unavailable: AI lỗi, vẫn có phần nguồn
  summaryViStatus: 'ready' | 'not_eligible' | 'unavailable';
  summaryVi: { summary: string; keyPoints: string[]; aiGenerated: boolean } | null;
  disclaimer: string;
};

// textVi: bản dịch máy tiếng Việt (null nếu đoạn chưa dịch/không qua kiểm tra); chỉ có ở endpoint content-vi.
export type AuLawBlock = {
  citationId: string;
  kind: 'heading' | 'note' | 'text';
  text: string;
  textVi?: string | null;
};

export type AuLawContent = {
  translationNotice?: string;
  totalBlocks: number;
  offset: number;
  limit: number;
  blocks: AuLawBlock[];
};

export type AuLawListParams = { q?: string; collection?: string; topic?: string; inForce: boolean; page: number };

// Dựng query thủ công: URLSearchParams của React Native không đầy đủ trên mọi nền tảng.
const toQueryString = (params: Record<string, string | number | boolean | undefined>) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

export type AuLawPage = { items: AuLawSummary[]; page: number; hasMore: boolean };

async function fetchAuLawPage({ q, collection, topic, inForce, page }: AuLawListParams): Promise<AuLawPage> {
  const keyword = q?.trim();
  const query = toQueryString({ q: keyword, collection, topic, inForce, page, limit: AU_LAW_PAGE_SIZE });
  const { data, meta } = await apiRequestWithMeta<AuLawSummary[]>(
    `/laws/australia${keyword ? '/search' : ''}?${query}`,
    { skipAuth: true },
  );
  return { items: data, page, hasMore: page * AU_LAW_PAGE_SIZE < (meta?.total ?? 0) };
}

/*
 * Backend loại một số văn bản không liên quan nên một trang có thể ít (hoặc 0) phần tử dù
 * vẫn còn trang sau: đọc tiếp tới khi có dữ liệu hoặc hết, để người dùng không thấy trang trống giữa chừng.
 */
export async function fetchAuLaws(params: AuLawListParams): Promise<AuLawPage> {
  let result = await fetchAuLawPage(params);
  while (result.items.length === 0 && result.hasMore) {
    result = await fetchAuLawPage({ ...params, page: result.page + 1 });
  }
  return result;
}

export function fetchAuLawTopics(): Promise<AuLawTopic[]> {
  return apiRequest<AuLawTopic[]>('/laws/australia/topics', { skipAuth: true });
}

export function fetchAuLaw(id: string): Promise<AuLawDetail> {
  return apiRequest<AuLawDetail>(`/laws/australia/${encodeURIComponent(id)}`, { skipAuth: true });
}

export function fetchAuLawSummary(id: string): Promise<AuLawOverview> {
  return apiRequest<AuLawOverview>(`/laws/australia/${encodeURIComponent(id)}/summary`, { skipAuth: true });
}

// Dịch theo yêu cầu: backend dịch rồi cache theo cụm 25 đoạn; offset phải là bội số của 25.
export function fetchAuLawContentVi(id: string, offset: number): Promise<AuLawContent> {
  const query = toQueryString({ offset, limit: AU_LAW_CONTENT_PAGE_SIZE });
  return apiRequest<AuLawContent>(`/laws/australia/${encodeURIComponent(id)}/content-vi?${query}`, { skipAuth: true });
}

export function fetchAuLawContent(id: string, offset: number): Promise<AuLawContent> {
  const query = toQueryString({ offset, limit: AU_LAW_CONTENT_PAGE_SIZE });
  return apiRequest<AuLawContent>(`/laws/australia/${encodeURIComponent(id)}/content?${query}`, { skipAuth: true });
}
