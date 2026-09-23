# Atlas Search Indexes — legal_chunks

Ngân sách 3 search index trên Atlas M0 (CLAUDE.md mục 4.1, `docs/00_BeTravel_MasterPlan_v2.md` Phần B.3):

| # | Collection | Loại | Tên | Trạng thái |
|---|---|---|---|---|
| 1 | `legal_chunks` | `vectorSearch` | `vec_idx` | Chưa tạo — làm theo hướng dẫn dưới |
| 2 | `legal_chunks` | `search` | `txt_idx` | Chưa tạo — làm theo hướng dẫn dưới |
| 3 | — | — | dự phòng, không dùng | — |

**Chưa bắt buộc tạo ngay.** Code chạy được hoàn toàn với `SEARCH_DRIVER=memory` (mặc định trong `.env.example`) — chỉ cần tạo 2 index này khi muốn chuyển sang chạy RAG bằng Atlas Search thật (`SEARCH_DRIVER=atlas`).

## 1. `vec_idx` — Vector Search

Vào Atlas UI → cluster → **Search** → **Create Search Index** → chọn **Atlas Vector Search** → **JSON Editor** → collection `legal_chunks`, database đúng tên trong `MONGODB_URI` → dán:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "filter", "path": "countryCode" },
    { "type": "filter", "path": "status" },
    { "type": "filter", "path": "topicSlug" }
  ]
}
```

> [!] Field dùng trong `$vectorSearch.filter` (`countryCode`, `status`, `topicSlug`) **bắt buộc** khai `"type": "filter"` ở đây. Thiếu là truy vấn lỗi ngay khi gọi.

Đặt tên index: `vec_idx` (khớp `VECTOR_INDEX_NAME` trong `backend/.env`).

## 2. `txt_idx` — Atlas Search (tìm từ khoá), analyzer tiếng Việt tự chế

Tạo thêm một Search Index khác (loại **Atlas Search**, không phải Vector Search), cùng collection `legal_chunks`, dán:

```json
{
  "analyzer": "lucene.standard",
  "searchAnalyzer": "lucene.standard",
  "analyzers": [{
    "name": "vi_folded",
    "charFilters": [],
    "tokenizer": { "type": "standard" },
    "tokenFilters": [
      { "type": "icuNormalizer", "normalizationForm": "nfkc" },
      { "type": "lowercase" },
      { "type": "icuFolding" }
    ]
  }],
  "mappings": {
    "dynamic": false,
    "fields": {
      "text":        { "type": "string", "analyzer": "vi_folded", "searchAnalyzer": "vi_folded" },
      "heading":     { "type": "string", "analyzer": "vi_folded", "searchAnalyzer": "vi_folded" },
      "countryCode": { "type": "token" },
      "status":      { "type": "token" },
      "topicSlug":   { "type": "token" }
    }
  }
}
```

Đặt tên index: `txt_idx` (khớp `TEXT_INDEX_NAME` trong `backend/.env`).

> Atlas Search không có analyzer tiếng Việt trong danh sách 45+ ngôn ngữ hỗ trợ sẵn — `icuFolding` bỏ dấu nên "phat vape" khớp "phạt vape". Field `textNorm` trên mỗi chunk là bản dự phòng (đã bỏ dấu sẵn) dùng cho `SEARCH_DRIVER=memory`.

## 3. Sau khi tạo — CHỜ trạng thái ACTIVE

Atlas cần vài phút (đôi khi lâu hơn) để build index lần đầu. Trạng thái hiển thị ở Atlas UI, cột **Status**:

```
PENDING/BUILDING → ACTIVE
```

**Chỉ chạy re-index (gọi `POST /api/admin/rag/reindex-country` hoặc publish một bài luật) sau khi CẢ HAI index đã ACTIVE.** Gọi `$vectorSearch`/`$search` khi index chưa ACTIVE sẽ lỗi hoặc trả rỗng.

Nếu một index kẹt ở trạng thái BUILDING quá 15 phút: xoá và tạo lại (lỗi này gặp thỉnh thoảng trên Atlas M0, không phải lỗi cấu hình).

## 4. Đổi `SEARCH_DRIVER`

Sau khi cả 2 index ACTIVE, đổi trong `backend/.env`:

```
SEARCH_DRIVER=atlas
```

Không cần đổi gì trong code — `backend/src/rag/search/index.js` tự chọn driver theo biến này, `AtlasSearchDriver` và `MemorySearchDriver` trả về CÙNG shape kết quả.

## 5. Đổi embedding model sau này

Nếu đổi `EMBEDDING_MODEL`/`EMBEDDING_PROVIDER`, **toàn bộ chunk phải re-index lại** (không được trộn 2 model trong cùng index — CLAUDE.md mục 4.1). Dùng `POST /api/admin/rag/reindex-country` cho từng quốc gia sau khi đổi `.env` và khởi động lại backend.
