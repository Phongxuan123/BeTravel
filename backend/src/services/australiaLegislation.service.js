import { env } from "../core/env.js";
import { AppError, ErrorCode } from "../core/errors.js";
import {
  AU_LAW_TOPICS,
  findAuLawTopic,
  isCuratedTitle,
  topicSlugsForTitle,
} from "../core/auLawTopics.js";
import { extractBlocks } from "../utils/legislationHtml.js";
import { createTtlCache } from "../utils/ttlCache.js";
import { getJson, getText } from "./australiaLegislationClient.js";

/*
 * Luật LIÊN BANG Úc (Commonwealth) qua Federal Register of Legislation.
 * [!] Nguồn KHÔNG chứa luật của các bang/vùng lãnh thổ (NSW, VIC, QLD...). Mọi
 * dữ liệu ở đây là bản sao chỉ-đọc, KHÔNG ghi vào legal_articles và KHÔNG đi
 * vào RAG: nội dung phải qua quy trình duyệt của Admin Portal mới thành dữ liệu
 * đã kiểm chứng của Be.Travel.
 *
 * Endpoint nguồn đã đối chiếu với Swagger chính thức (swagger/v1/swagger.json):
 *   Titles, Titles/{id}, Versions, Documents, và Documents(<khóa>)/getzipitems
 *   + Documents(<khóa>)/<đường dẫn trong EPUB> để lấy văn bản XHTML.
 */

export const JURISDICTION = "AU-COMMONWEALTH";
export const SOURCE_PROVIDER = "federal_register_of_legislation";
export const SCOPE_NOTICE =
  "Chỉ gồm luật liên bang (Commonwealth) của Úc, không gồm luật của các bang và vùng lãnh thổ. " +
  "Nội dung lấy nguyên văn từ nguồn chính thức, chưa qua kiểm chứng của Be.Travel.";

const TITLE_LIST_FIELDS =
  "id,name,collection,subCollection,status,isInForce,isPrincipal,makingDate,year,number,optionalSeriesNumber";
const VERSION_FIELDS =
  "titleId,start,retrospectiveStart,end,isCurrent,isLatest,status,registerId,registeredAt," +
  "compilationNumber,hasUnincorporatedAmendments";
const DOCUMENT_FIELDS =
  "titleId,start,retrospectiveStart,rectificationVersionNumber,type,uniqueTypeNumber," +
  "volumeNumber,format,extension,sizeInBytes,pageCount,isAuthorised";

const RECENT_VERSIONS_TO_SCAN = 5;
// Nhóm luật thuế "A New Tax System" (1999-2004) chiếm đầu danh sách chữ cái nhưng không liên quan
// tới người đi du lịch. Nguồn không hỗ trợ lọc phủ định (not/ne/lt/ge trên name đều trả 400)
// nên loại bằng code sau khi lấy trang; vì vậy một trang có thể ít hơn `limit` phần tử.
const EXCLUDED_NAME_PREFIXES = ["A New Tax System"];
const ACT_COLLECTION = "Act";
// Đạo luật có `year`: xếp mới nhất trước hữu ích hơn thứ tự chữ cái. Văn bản khác thiếu year nên xếp theo tên.
const ORDER_ACTS_NEWEST_FIRST = "year desc,name";
const ORDER_BY_NAME = "name";
const READABLE_FORMAT = "Epub";
const PRIMARY_TYPE = "Primary";
const CONTENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Mỗi bản đã rút chữ của một Act lớn ~1 MB; giữ ít phần tử để RAM Render không phình.
const CONTENT_CACHE_MAX_ENTRIES = 6;
const MS_PER_MINUTE = 60_000;

const metadataCache = createTtlCache({
  ttlMs: env.AU_LEGISLATION_CACHE_TTL_MINUTES * MS_PER_MINUTE,
  maxEntries: 300,
});
const contentCache = createTtlCache({
  ttlMs: CONTENT_CACHE_TTL_MS,
  maxEntries: CONTENT_CACHE_MAX_ENTRIES,
});

export const resetAustraliaLegislationCache = () => {
  metadataCache.clear();
  contentCache.clear();
};

const cachedJson = (path, query) =>
  metadataCache.getOrLoad(`${path}?${JSON.stringify(query ?? {})}`, () => getJson(path, query));

// Gấp đôi dấu nháy đơn theo quy tắc OData để chuỗi người dùng không thoát khỏi literal.
const odataString = (value) => `'${String(value).replaceAll("'", "''")}'`;

// Nguồn trả ngày giờ không múi giờ (vd 2026-10-08T00:00:00); phía người dùng chỉ cần ngày.
const toDate = (value) => (value ? String(value).slice(0, 10) : null);

export const buildOfficialUrl = (titleId) =>
  `${env.AU_LEGISLATION_SITE_URL.replace(/\/$/, "")}/${titleId}/latest/text`;

const normalizeTitleSummary = (raw) => ({
  id: raw.id,
  name: raw.name,
  collection: raw.collection ?? null,
  subCollection: raw.subCollection ?? null,
  status: raw.status ?? null,
  isInForce: Boolean(raw.isInForce),
  isPrincipal: Boolean(raw.isPrincipal),
  makingDate: toDate(raw.makingDate),
  year: raw.year ?? null,
  number: raw.number ?? null,
  seriesNumber: raw.optionalSeriesNumber ?? null,
  topics: topicSlugsForTitle(raw.id),
  jurisdiction: JURISDICTION,
  officialUrl: buildOfficialUrl(raw.id),
});

const normalizeVersion = (raw) => ({
  registerId: raw.registerId,
  compilationNumber: raw.compilationNumber ?? null,
  status: raw.status ?? null,
  startDate: toDate(raw.start),
  endDate: toDate(raw.end),
  registeredAt: raw.registeredAt ?? null,
  isCurrent: Boolean(raw.isCurrent),
  isLatest: Boolean(raw.isLatest),
  hasUnincorporatedAmendments: Boolean(raw.hasUnincorporatedAmendments),
});

const normalizeDocument = (raw) => ({
  type: raw.type,
  format: raw.format,
  volumeNumber: raw.volumeNumber,
  extension: raw.extension ?? null,
  sizeInBytes: raw.sizeInBytes ?? null,
  pageCount: raw.pageCount ?? null,
  isAuthorised: Boolean(raw.isAuthorised),
});

const buildMeta = ({ page, limit }, rawCount) => ({ page, limit, total: rawCount ?? 0 });

// ---------------------------------------------------------------- danh sách

const isRelevantTitle = (rawTitle) =>
  !EXCLUDED_NAME_PREFIXES.some((prefix) => rawTitle.name?.startsWith(prefix));

// Danh sách mục (số luật là số luật Be.Travel tuyển chọn, không phải số văn bản của nguồn).
export const listTopics = () =>
  AU_LAW_TOPICS.map(({ slug, label, note, titleIds }) => ({
    slug,
    label,
    note,
    lawCount: titleIds.length,
  }));

const buildTopicCondition = (topic) =>
  `(${topic.titleIds.map((titleId) => `id eq ${odataString(titleId)}`).join(" or ")})`;

export const listTitles = async ({ page, limit, inForce, collection, q, topic: topicSlug }) => {
  const topic = topicSlug ? findAuLawTopic(topicSlug) : null;
  const conditions = [];
  if (inForce) conditions.push("isInForce eq true");
  // Trong một mục, luật gồm cả Act lẫn văn bản dưới luật nên không áp bộ lọc collection.
  if (topic) conditions.push(buildTopicCondition(topic));
  else if (collection) conditions.push(`collection eq ${odataString(collection)}`);
  if (q) conditions.push(`contains(name,${odataString(q)})`);

  const response = await cachedJson("Titles", {
    $filter: conditions.join(" and "),
    $select: TITLE_LIST_FIELDS,
    // Nguồn trả 400 khi $orderby=makingDate đi kèm $filter isInForce; year và name thì dùng được.
    $orderby: collection === ACT_COLLECTION ? ORDER_ACTS_NEWEST_FIRST : ORDER_BY_NAME,
    $top: limit,
    $skip: (page - 1) * limit,
    $count: true,
  });

  return {
    items: response.value.filter(isRelevantTitle).map(normalizeTitleSummary),
    // total lấy nguyên từ nguồn (gồm cả phần tử bị loại) để client suy ra còn trang sau hay không.
    meta: buildMeta({ page, limit }, response["@odata.count"]),
  };
};

// ------------------------------------------------------------------- phiên bản

export const listVersions = async (titleId, { page, limit }) => {
  const response = await cachedJson("Versions", {
    $filter: `titleId eq ${odataString(titleId)}`,
    $select: VERSION_FIELDS,
    $orderby: "start desc",
    $top: limit,
    $skip: (page - 1) * limit,
    $count: true,
  });
  if (page === 1 && response.value.length === 0) throw notFoundTitle();

  return {
    items: response.value.map(normalizeVersion),
    meta: buildMeta({ page, limit }, response["@odata.count"]),
  };
};

// Ưu tiên bản đang có hiệu lực hôm nay; nếu chỉ có bản tương lai thì lấy bản mới nhất.
const findDisplayedVersion = async (titleId) => {
  const response = await cachedJson("Versions", {
    $filter: `titleId eq ${odataString(titleId)}`,
    $select: VERSION_FIELDS,
    $orderby: "start desc",
    $top: RECENT_VERSIONS_TO_SCAN,
  });
  const rawVersion = response.value.find((version) => version.isCurrent) ?? response.value[0];
  return rawVersion ?? null;
};

// Mã bản biên soạn đang hiển thị của một đạo luật; RAG dùng để loại chunk của bản đã bị thay thế.
export const getCurrentRegisterId = async (titleId) =>
  (await findDisplayedVersion(titleId))?.registerId ?? null;

const listRawDocuments = async (titleId, rawVersion) => {
  const response = await cachedJson("Documents", {
    $filter: `titleId eq ${odataString(titleId)} and start eq ${rawVersion.start}`,
    $select: DOCUMENT_FIELDS,
  });
  return response.value;
};

// ----------------------------------------------------------------- chi tiết

const notFoundTitle = () =>
  new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy văn bản trong nguồn luật Úc.");

export const getTitleDetail = async (titleId) => {
  // Không dùng Titles/{id}: mã không tồn tại làm nguồn trả HTTP 400 thay vì 404.
  const found = await cachedJson("Titles", { $filter: `id eq ${odataString(titleId)}`, $top: 1 });
  const rawTitle = found.value[0];
  if (!rawTitle) throw notFoundTitle();

  const rawVersion = await findDisplayedVersion(titleId);
  const rawDocuments = rawVersion ? await listRawDocuments(titleId, rawVersion) : [];

  return {
    ...normalizeTitleSummary(rawTitle),
    publishComments: rawTitle.publishComments ?? null,
    hasCommencedUnincorporatedAmendments: Boolean(rawTitle.hasCommencedUnincorporatedAmendments),
    nameHistory: (rawTitle.nameHistory ?? []).map((entry) => ({
      name: entry.name,
      startDate: toDate(entry.start),
    })),
    version: rawVersion ? normalizeVersion(rawVersion) : null,
    documents: rawDocuments.map(normalizeDocument),
    hasReadableText: rawDocuments.some(isReadableDocument),
    // Chỉ luật đã tuyển chọn mới dịch tiếng Việt được (giới hạn chi phí AI).
    canTranslate: isCuratedTitle(rawTitle.id),
    scopeNotice: SCOPE_NOTICE,
  };
};

// ------------------------------------------------------------------- nội dung

const isReadableDocument = (rawDocument) =>
  rawDocument.type === PRIMARY_TYPE && rawDocument.format === READABLE_FORMAT;

// Nếu có nhiều bản sửa lỗi (rectification) thì dùng bản sửa mới nhất.
const pickReadableDocument = (rawDocuments) =>
  rawDocuments
    .filter(isReadableDocument)
    .sort((a, b) => b.rectificationVersionNumber - a.rectificationVersionNumber)[0] ?? null;

const buildDocumentPath = (rawDocument) =>
  `Documents(titleid=${odataString(rawDocument.titleId)},start=${rawDocument.start},` +
  `retrospectivestart=${rawDocument.retrospectiveStart},` +
  `rectificationversionnumber=${rawDocument.rectificationVersionNumber},` +
  `type=${odataString(rawDocument.type)},uniqueTypeNumber=${rawDocument.uniqueTypeNumber},` +
  `volumeNumber=${rawDocument.volumeNumber},format=${odataString(rawDocument.format)})`;

const compareByNaturalOrder = (a, b) => a.localeCompare(b, "en", { numeric: true });

// EPUB là file zip; API cho đọc từng file con nên không phải tải cả gói và giải nén.
const loadReadableBlocks = async (rawDocument) => {
  const documentPath = buildDocumentPath(rawDocument);
  const entryNames = await getJson(`${documentPath}/getzipitems`);
  const htmlEntries = entryNames
    .filter((name) => /^OEBPS\/.+\.html$/i.test(name))
    .sort(compareByNaturalOrder);

  const blocks = [];
  for (const entryName of htmlEntries) {
    const html = await getText(`${documentPath}/${entryName}`);
    blocks.push(...extractBlocks(html));
  }
  return blocks;
};

const contentUnavailable = (titleId) =>
  new AppError(
    ErrorCode.NOT_FOUND,
    "Văn bản này chưa có bản đọc được qua API (chỉ có PDF/Word). Xem bản chính thức theo liên kết.",
    { officialUrl: buildOfficialUrl(titleId) },
  );

const buildContentSource = (titleId, rawVersion) => ({
  provider: SOURCE_PROVIDER,
  jurisdiction: JURISDICTION,
  titleId,
  registerId: rawVersion.registerId,
  compilationNumber: rawVersion.compilationNumber ?? null,
  effectiveFrom: toDate(rawVersion.start),
  officialUrl: buildOfficialUrl(titleId),
  verifiedByBeTravel: false,
});

// Dùng chung cho nội dung và tóm lược: bản hiển thị + toàn bộ đoạn đã rút chữ (có cache).
export const loadDisplayedBlocks = async (titleId) => {
  const rawVersion = await findDisplayedVersion(titleId);
  if (!rawVersion) throw notFoundTitle();

  const rawDocument = pickReadableDocument(await listRawDocuments(titleId, rawVersion));
  if (!rawDocument) throw contentUnavailable(titleId);

  // registerId là mã bất biến của một bản biên soạn nên dùng làm khóa cache an toàn.
  const allBlocks = await contentCache.getOrLoad(
    `${titleId}|${rawVersion.registerId}|${rawDocument.rectificationVersionNumber}`,
    () => loadReadableBlocks(rawDocument),
  );
  return { rawVersion, allBlocks };
};

export const citationIdOf = (rawVersion, index) => `${rawVersion.registerId}:${index}`;

export const getTitleContent = async (titleId, { offset, limit }) => {
  const { rawVersion, allBlocks } = await loadDisplayedBlocks(titleId);

  // citationId ổn định trong một bản biên soạn, dùng để AI trích dẫn đúng đoạn.
  const blocks = allBlocks.slice(offset, offset + limit).map(({ kind, text }, position) => ({
    citationId: citationIdOf(rawVersion, offset + position),
    kind,
    text,
  }));

  return {
    source: buildContentSource(titleId, rawVersion),
    version: normalizeVersion(rawVersion),
    totalBlocks: allBlocks.length,
    offset,
    limit,
    blocks,
    scopeNotice: SCOPE_NOTICE,
  };
};

// ------------------------------------------------------------------- tóm lược

export const getTitleName = async (titleId) => {
  const found = await cachedJson("Titles", {
    $filter: `id eq ${odataString(titleId)}`,
    $select: "id,name",
    $top: 1,
  });
  if (!found.value[0]) throw notFoundTitle();
  return found.value[0].name;
};

// Nguồn đặt Chương = ActHead1, Phần = ActHead2, Mục con (Division) = ActHead3.
const OUTLINE_LEVELS = Object.freeze({
  ActHead1: "chapter",
  ActHead2: "part",
  ActHead3: "division",
});
const MAIN_OUTLINE_CLASSES = ["ActHead1", "ActHead2"];
const LONG_TITLE_CLASS = "LongT";
const MIN_MAIN_OUTLINE_ENTRIES = 3;
const MAX_OUTLINE_ENTRIES = 60;

const pickOutlineClasses = (headings) => {
  const mainCount = headings.filter(({ className }) =>
    MAIN_OUTLINE_CLASSES.includes(className),
  ).length;
  // Văn bản ngắn chỉ có Division: hạ xuống mức đó để vẫn có dàn ý.
  return mainCount >= MIN_MAIN_OUTLINE_ENTRIES
    ? MAIN_OUTLINE_CLASSES
    : [...MAIN_OUTLINE_CLASSES, "ActHead3"];
};

// Rút phần tóm lược CHẮC CHẮN có nguồn: tiêu đề dài (mục đích) và dàn ý Chương/Phần, kèm citationId.
export const getTitleOutline = async (titleId) => {
  const { rawVersion, allBlocks } = await loadDisplayedBlocks(titleId);

  const indexed = allBlocks.map((block, index) => ({ ...block, index }));
  const longTitle = indexed.find(({ className }) => className === LONG_TITLE_CLASS);
  const headings = indexed.filter(({ className }) => className in OUTLINE_LEVELS);
  const outlineClasses = pickOutlineClasses(headings);
  // Tiêu đề Phần có thể lặp ở chỗ nối giữa hai tệp HTML của cùng văn bản: giữ lần xuất hiện đầu tiên.
  const seenTexts = new Set();
  const outlineAll = headings.filter(({ className, text }) => {
    if (!outlineClasses.includes(className) || seenTexts.has(text)) return false;
    seenTexts.add(text);
    return true;
  });

  return {
    source: buildContentSource(titleId, rawVersion),
    version: normalizeVersion(rawVersion),
    purpose: longTitle
      ? { text: longTitle.text, citationId: citationIdOf(rawVersion, longTitle.index) }
      : null,
    outline: outlineAll.slice(0, MAX_OUTLINE_ENTRIES).map(({ className, text, index }) => ({
      level: OUTLINE_LEVELS[className],
      text,
      citationId: citationIdOf(rawVersion, index),
    })),
    outlineTruncated: outlineAll.length > MAX_OUTLINE_ENTRIES,
    scopeNotice: SCOPE_NOTICE,
  };
};
