# CHUAN TOI UU CODEBASE — BE.TRAVEL

Phiên bản: 2.0 (bản áp dụng cho Be.Travel)
Nguồn gốc: `Tối ưu hệ thống.txt` của nhóm
Vị trí: `docs/05_ToiUuHeThong.md`

---

## 1. THONG TIN DU AN

| Mục | Giá trị |
|---|---|
| Tên dự án | Be.Travel |
| Phiên bản hiện tại | v0.2.0 (auth backend + mobile UI chạy trên mock) |
| Ngôn ngữ | `backend` JavaScript ESM · `mobile` TypeScript · `admin` TypeScript |
| Framework | Express 5 · Expo 57 / React Native 0.86 · Vite + React 18 |
| Môi trường | Node 20 · Expo SDK 57 · MongoDB Atlas M0 |
| Phạm vi tối ưu | Toàn bộ 3 workspace, trừ `node_modules`, `assets`, file sinh tự động |
| Người thực hiện | Claude Code |

**Mức độ thay đổi cho phép:**

```
[v] Chỉ đổi tên biến, hàm
[v] Được tách / gộp hàm
[v] Được refactor cấu trúc file
[X] Được thay đổi toàn bộ
```

Lý do không chọn mức cuối: `mobile/` đã có 18 màn hình chạy ổn định và một design system hoàn chỉnh. Refactor toàn bộ là rủi ro không cần thiết — xem RANG BUOC [8].

---

## 2. HAI CHE DO AP DUNG

Đây là điều chỉnh quan trọng nhất so với bản gốc. Bản gốc viết cho một lần chạy độc lập; Be.Travel cần áp dụng xuyên suốt quá trình xây dựng.

### CHE DO A — Viết code theo chuẩn (mặc định, luôn bật)

Áp dụng 13 quy tắc **ngay khi viết code mới** trong mọi batch B1–B9. Tối ưu tại nguồn rẻ hơn tối ưu về sau nhiều lần.

- Không có bước khảo sát, không xuất báo cáo riêng.
- Kết quả ghi gộp vào mục "Rule áp dụng" của báo cáo batch.

### CHE DO B — Quét tối ưu sau mỗi batch (bắt buộc, phạm vi hẹp)

Chạy ngay sau khi hoàn tất mỗi batch, **chỉ trên những file batch đó đã động tới**:

```
1. Rule 10  --> xóa dead code, biến/import không dùng, TODO cũ bỏ sót
2. Rule 13A --> rà soát và xử lý warning (lint, typecheck, expo-doctor)
3. Cập nhật docs/OPTIMIZATION_REPORT.md
```

Không quét toàn repo ở bước này. Phạm vi hẹp giữ cho mỗi batch kết thúc gọn.

### CHE DO C — Quét toàn hệ thống (chỉ khi được yêu cầu, hoặc ở B9)

Chạy đủ quy trình 4 bước của Mục 3. Đây là lúc duy nhất RANG BUOC [1] "không thay đổi logic nghiệp vụ" có hiệu lực tuyệt đối.

Kích hoạt khi: người dùng nói rõ ("chạy tối ưu toàn bộ", "quét clean code"), hoặc đang ở batch B9.

---

## 3. QUY TRINH CHE DO C

```
BUOC 1 — Khảo sát & lập danh sách
  - Đọc toàn bộ code trong phạm vi.
  - Lập danh sách file cần tối ưu, xếp theo độ ưu tiên.
  - Ghi nhận sơ bộ vấn đề phát hiện được.
  - BÁO CÁO DANH SÁCH TRƯỚC KHI BẮT ĐẦU SỬA. Chờ xác nhận.

BUOC 2 — Áp dụng 13 quy tắc (Mục 4)
  - Xử lý từng file theo thứ tự ưu tiên.
  - Sau mỗi file: báo cáo thay đổi đã thực hiện.
  - Không chắc --> hỏi lại, không tự ý sửa logic.

BUOC 3 — Kiểm tra Warning & Bug (Rule 13)
  - Rà soát toàn bộ warning sau khi tối ưu xong.
  - Phân loại và xử lý bug theo quy trình 3 bước.

BUOC 4 — Cập nhật docs/OPTIMIZATION_REPORT.md (Mục 6)
```

---

## 4. 13 QUY TAC CLEAN CODE

Áp dụng theo thứ tự ưu tiên. Mâu thuẫn giữa hai rule --> **ưu tiên rule có số nhỏ hơn**.

### Rule 1 — Đặt tên có ý nghĩa

Tên biến, hàm, class phải mô tả rõ chức năng.

```
[X] x, y, temp, data, foo, a1, res2
[v] totalScore, userEmail, fetchOrderById, isPaymentValid
```

Nhất quán với ngôn ngữ: `camelCase` cho JS/TS, `PascalCase` cho class và React component.

**Áp dụng cho Be.Travel:** tên miền nghiệp vụ phải dùng từ vựng đã chốt trong `CLAUDE.md` — `legalArticle`, `supportLocation`, `geoAlert`, `incidentType`, `retrievedChunks`, `fallbackReason`. Không đặt tên chung chung kiểu `item`, `record`, `result`.

### Rule 2 — Hàm nhỏ, một trách nhiệm (SRP)

Mỗi hàm chỉ làm đúng một việc. Hàm > 20 dòng hoặc làm nhiều việc --> tách.
Tên hàm là động từ: `getUser()`, `calculateTotal()`, `sendEmailNotification()`.

```
[!] Với code cũ có hàm lớn: tách từng phần nhỏ, không refactor
    toàn bộ một lúc để tránh rủi ro.
[!] Ngưỡng 20 dòng không tính: dòng trống, comment, và các dòng
    của object literal / mảng dữ liệu / định nghĩa schema.
[!] Rule 2 thắng Rule 9 (KISS) khi mâu thuẫn — nhưng KHÔNG tách hàm
    chỉ để đạt con số 20 nếu việc tách làm code khó đọc hơn.
    Trường hợp đó: giữ nguyên, ghi một dòng lý do vào báo cáo.
```

**Áp dụng cho Be.Travel:** controller mỏng --> service chứa logic --> repo/model chạm DB. Không gọi Mongoose model trực tiếp từ controller.

### Rule 3 — Không lặp code (DRY)

Đoạn code xuất hiện >= 2 lần --> trích xuất thành hàm/module.
Tái sử dụng qua: helper, utils, constants, shared component, hook.

```
[!] Chỉ áp dụng DRY khi logic THỰC SỰ giống nhau, không gộp những
    thứ chỉ trông giống nhau bề ngoài.
```

**Áp dụng cho Be.Travel:** khi cùng một đoạn xử lý xuất hiện ở nhiều workspace (ví dụ chuẩn hóa tiếng Việt `normalizeVi`), đặt vào nơi phù hợp của từng bên và **đồng bộ bằng test đối chiếu `contracts/fixtures/`** — không dựng monorepo để chia sẻ (xem `CLAUDE.md` Phần 1).

### Rule 4 — Comment đúng chỗ, đúng lý do

Comment giải thích LÝ DO (why), không giải thích CÁI GÌ (what).

```
[X] // Lấy user
    const user = getUser()
[v] // Cache kết quả để tránh gọi DB lặp lại trong cùng một request
```

### Rule 5 — Định dạng nhất quán

- Indentation nhất quán toàn workspace.
- Dòng trống giữa các khối logic khác nhau.
- Độ dài dòng <= 100 ký tự.
- Imports theo nhóm: thư viện ngoài --> nội bộ --> local.

```
[*] Project đã có .editorconfig / eslint.config.js / prettier config
    --> tuân thủ config đó, không tự đặt lại.

[!] Be.Travel: `backend/` HIỆN CHƯA CÓ prettier config và đang dùng
    kiểu xuống dòng rất hẹp (printWidth nhỏ bất thường, ví dụ một
    lệnh res.json bị tách làm 5 dòng). Batch B1 phải tạo
    `backend/.prettierrc` + `backend/eslint.config.js` rồi format lại
    toàn bộ `backend/src/`. Sau đó Rule 5 được thực thi tự động.
    Commit phần format riêng khỏi commit logic, để review được.

[!] `mobile/` đã có eslint.config.js --> tuân thủ, không đổi.
```

### Rule 6 — Không dùng Magic Number / Magic String

```
[X] if (status === 3)          setTimeout(fn, 86400000)
[v] if (status === ORDER_STATUS.SHIPPED)
    const ONE_DAY_MS = 86_400_000
```

Đặt constants vào file riêng.

**Áp dụng cho Be.Travel:** mọi ngưỡng RAG (`RAG_MIN_TOP_SCORE`, `RAG_TOP_K`...), tên model AI, tên index Atlas, TTL cache — **đều qua biến môi trường, không hardcode**. Các enum trạng thái (`ContentStatus`, `ErrorCode`, `FallbackReason`) đặt trong file constants dùng chung của từng workspace.

### Rule 7 — Xử lý lỗi rõ ràng

- Mọi thao tác có thể thất bại phải có error handling: gọi API, đọc/ghi file, parse JSON, truy vấn DB, input người dùng.
- Không để lỗi im lặng (silent fail / empty catch).
- Log lỗi đủ context: loại lỗi, nơi xảy ra, input liên quan.
- Trả về thông báo lỗi có ý nghĩa, không chỉ `throw Error("error")`.

```
[*] Dự án nhiều tầng: xử lý lỗi đúng tầng, không để lỗi tầng dưới
    lộ ra ngoài API.
```

**Áp dụng cho Be.Travel:** mọi lỗi trả về client phải dùng envelope `{ok:false, error:{code, message, details}}` với `code` thuộc enum đóng 10 giá trị. Prod không lộ stack trace, không lộ tên collection. Chi tiết ở `CLAUDE.md` Phần 4.1.

### Rule 8 — Điều kiện rõ ràng, dễ đọc

Tách điều kiện phức tạp thành biến boolean có tên.

```
[X] if (u.age > 18 && u.verified && !u.banned && u.plan === 2)

[v] const isEligibleUser = u.age > 18
                        && u.verified
                        && !u.banned
                        && u.plan === PLAN.PREMIUM
    if (isEligibleUser) { ... }
```

Tránh nested if quá 3 cấp --> dùng early return / guard clause.

### Rule 9 — Giữ mọi thứ đơn giản (KISS)

- Ưu tiên giải pháp đơn giản nhất đạt được mục tiêu.
- Không áp dụng design pattern phức tạp khi không cần thiết.
- Nếu cần giải thích nhiều mới hiểu --> đơn giản hóa lại.

```
[*] Be.Travel là sản phẩm học kỳ, vòng đời ngắn --> ưu tiên KISS.
    Ngoại lệ: tầng RAG và guardrail (CLAUDE.md Phần 4.2) được phép
    phức tạp hơn, vì đó là lõi sản phẩm và là thứ được chấm điểm.
```

### Rule 10 — Refactor chủ động

Sau khi tối ưu từng rule, xem lại và hỏi: "Có thể đơn giản hơn không?"
Xóa: code thừa, dead code, biến không dùng, import không dùng.
Đảm bảo không còn TODO / FIXME cũ bị bỏ sót.

```
[!] Ghi lại mọi thay đổi refactor vào docs/OPTIMIZATION_REPORT.md

[!] Be.Travel: KHÔNG xóa `mobile/src/mocks/`. Đó là đường lùi khi
    demo lỗi (EXPO_PUBLIC_USE_MOCKS=true) và là nguồn dữ liệu cho
    test. Đây không phải dead code.
```

### Rule 11 — Comment tiếng Việt cho các phần quan trọng

- Trước mỗi block lớn (class, module, hàm quan trọng): comment tiếng Việt có dấu, mô tả đoạn này làm gì và tại sao.
- Phần cốt lõi, logic phức tạp, dễ gây hiểu nhầm: **bắt buộc** có comment.
- Câu ngắn gọn, ai cũng hiểu được.

**Áp dụng cho Be.Travel:** tên biến/hàm vẫn bằng tiếng Anh, comment nghiệp vụ bằng tiếng Việt có dấu. Những chỗ **bắt buộc** phải có comment tiếng Việt:

| File | Phải giải thích |
|---|---|
| `backend/src/rag/guard.js` | Tại sao hậu kiểm bằng code thay vì tin LLM |
| `backend/src/rag/retrieval.js` | Tại sao có `$lookup` — lớp phòng thủ thứ hai |
| `backend/src/services/refreshToken.service.js` | Tại sao có cửa sổ ân hạn 10 giây |
| `mobile/src/lib/api/adapters.ts` | Tại sao ánh xạ thay vì sửa màn hình |
| Mọi chỗ áp ngưỡng, lọc trạng thái, hoặc quyết định bảo mật | Lý do đằng sau con số / điều kiện |

### Rule 12 — Không dùng emoji, chỉ dùng ký hiệu chuyên nghiệp

```
[v]  --> Đúng / Nên làm
[X]  --> Sai / Không nên làm
[!]  --> Cảnh báo / Lưu ý quan trọng
[*]  --> Ghi chú bổ sung
-->  --> Dẫn đến / Kết quả
---  --> Phân cách các khối nội dung
```

Lý do: emoji gây lỗi encoding trên terminal, log server, IDE cũ.

**Phạm vi áp dụng ở Be.Travel:**

| Nơi | Áp dụng |
|---|---|
| Source code, comment | [v] Bắt buộc |
| Commit message, PR | [v] Bắt buộc |
| Tài liệu `docs/`, `README.md`, `CLAUDE.md` | [v] Bắt buộc với nội dung mới |
| Chuỗi hiển thị cho người dùng cuối | [!] Xem ghi chú dưới |

```
[!] UI của app mobile: KHÔNG nhúng ký tự emoji vào chuỗi text.
    Cần biểu tượng cảnh báo --> dùng component icon của
    `lucide-react-native` (đã cài sẵn). Vừa tuân thủ Rule 12,
    vừa đúng chuẩn React Native, vừa đổi màu/kích thước được.

[!] CẦN SỬA: `docs/03_Contracts_v2.md` mục 8 đang có
    DEFAULT_DISCLAIMER bắt đầu bằng ký tự cảnh báo emoji.
    Khi làm batch B4, bỏ ký tự đó, chỉ giữ phần chữ. Màn hình chat
    render icon cảnh báo bằng component riêng.
```

### Rule 13 — Kiểm tra và xử lý Warning / Bug

**[A] XU LY WARNING**

Sau khi hoàn tất tối ưu, rà soát toàn bộ warning còn lại. Phân loại:

| Mã | Loại | Cách xử lý |
|---|---|---|
| W1 | Deprecation warning | Cập nhật lên API / syntax mới |
| W2 | Unused variable / import | Xóa hoặc sử dụng |
| W3 | Type mismatch | Sửa kiểu dữ liệu |
| W4 | Performance warning | Tối ưu lại đoạn code liên quan |
| W5 | Security warning | **Ưu tiên xử lý ngay** |

Mỗi warning phải được ghi nhận và xử lý, hoặc giải thích lý do bỏ qua.

**Nguồn warning của Be.Travel:**

```
backend : npm run lint
mobile  : npx tsc --noEmit · npx expo lint · npx expo-doctor
admin   : npm run typecheck · npm run build
```

**[B] XU LY BUG — quy trình 3 bước bắt buộc**

```
Bước 1 — Xác định loại lỗi
  + Mô tả triệu chứng: lỗi xảy ra khi nào, ở đâu
  + Phân loại: Logic bug / Runtime error / Data bug /
               UI bug / Performance bug / Security bug
  + Xác định nguyên nhân gốc rễ (root cause)

Bước 2 — Lên kế hoạch fix
  + Đề xuất 1-3 phương án fix khả thi
  + Đánh giá rủi ro từng phương án
  + Chọn phương án tối ưu, giải thích lý do
  + Xác định các file / module bị ảnh hưởng

Bước 3 — Thực hiện fix
  + Áp dụng phương án đã chọn
  + Kiểm tra lại: đảm bảo không tạo ra bug mới
  + Ghi lại: bug gì, fix thế nào, file nào bị thay đổi
```

```
[!] Bug thuộc nhóm Security, hoặc bug làm lộ nội dung chưa kiểm chứng
    (draft/superseded lọt ra API công khai) --> xử lý NGAY, không xếp
    hàng đợi. Đây là loại bug phá hủy định vị sản phẩm.
```

---

## 5. DINH DANG BAO CAO CHO TUNG FILE

Trong Chế độ C, với mỗi file được tối ưu:

```
### [Tên file] — [Ngày xử lý]

Những thay đổi đã thực hiện:
- Rule X : [mô tả thay đổi cụ thể]
- Rule Y : [mô tả thay đổi cụ thể]

Warning đã xử lý:
- [W1] [mô tả] --> [cách đã fix]

Bug đã xử lý:
- [Loại bug] : [mô tả] --> [phương án fix] --> [kết quả]

Diff: [git diff --stat của file, hoặc hunk liên quan]
```

```
[*] Bản gốc yêu cầu dán nguyên "Code trước" và "Code sau". Với codebase
    hàng trăm file, dán nguyên văn làm báo cáo không đọc nổi và không
    review được. Thay bằng `git diff` — cùng lượng thông tin, dễ đối
    chiếu hơn, mở được trong IDE. Muốn xem nguyên văn một file cụ thể
    thì yêu cầu riêng.
```

---

## 6. BAO CAO TOI UU — `docs/OPTIMIZATION_REPORT.md`

Một file duy nhất, **cập nhật chứ không tạo mới** mỗi lần chạy.

```markdown
# BAO CAO TOI UU CODE — BE.TRAVEL

Phiên bản : [vX.Y.Z --> vX.Y.Z]
Cập nhật  : [DD/MM/YYYY]
Thực hiện : Claude Code

## 1. TONG QUAN
- Tổng số file rà soát   : [N]
- Tổng số file chỉnh sửa : [N]
- Tổng số thay đổi       : [N]
- Tổng số warning xử lý  : [N]
- Tổng số bug fix        : [N]

## 2. CHI TIET TUNG FILE
| File | Rule áp dụng | Warning | Bug | Ghi chú |
|------|--------------|---------|-----|---------|

## 3. DANH SACH THAY DOI THEO RULE
- Rule 1  : [N chỗ đổi tên] — VD: res2 --> supportLocations (file A)
- Rule 2  : [N hàm được tách] — VD: processData() tách thành 3 hàm
- ...

## 4. WARNING & BUG DA XU LY
| Loại | Mô tả | File | Dòng | Cách fix | Kết quả |
|------|-------|------|------|----------|---------|

## 5. VAN DE CON TON DONG
- [Mô tả] — Lý do chưa fix — Đề xuất hướng xử lý

## 6. DE XUAT CHO LAN CAP NHAT TIEP THEO
- [Đề xuất 1]
- [Kỹ thuật / thư viện nên xem xét]

## 7. LICH SU CAP NHAT
| Phiên bản | Ngày | Batch | Nội dung chính |
|-----------|------|-------|----------------|
| v0.2.0    |      | —     | Trạng thái ban đầu |
```

---

## 7. RANG BUOC QUAN TRONG

```
[1] Trong CHE DO C: KHÔNG thay đổi logic nghiệp vụ — chỉ cải thiện
    chất lượng code.
    [!] Trong CHE DO A và B: batch B1-B9 ĐƯỢC PHÉP và BẮT BUỘC thay
        đổi logic nghiệp vụ, vì đó chính là việc của batch. Ràng buộc
        [1] chỉ áp dụng cho lần quét tối ưu độc lập.

[2] Không chắc về một thay đổi --> hỏi lại, không tự ý sửa.
    [!] Chỉ áp dụng cho thay đổi chạm vào LOGIC. Quyết định thường
        ngày (tên biến, cấu trúc thư mục, cách viết test) thì tự quyết
        — xem CLAUDE.md Phần 7.

[3] Rule này mâu thuẫn rule kia --> ưu tiên rule có số nhỏ hơn.

[4] Code quá lớn --> xử lý từng file, thông báo tiến độ sau mỗi file.

[5] Mọi thay đổi phải được ghi vào docs/OPTIMIZATION_REPORT.md

[6] OPTIMIZATION_REPORT.md phải được CẬP NHẬT mỗi lần chạy — không
    tạo file mới, chỉ bổ sung vào LICH SU CAP NHAT và cập nhật các
    mục liên quan.

[7] Dự án có CI/CD hoặc lint pipeline: kiểm tra output có pass
    pipeline không trước khi báo hoàn tất.

[8] KHÔNG refactor `mobile/src/app/*` và `mobile/src/components/*` ở
    mức cấu trúc. 18 màn hình và design system đang chạy ổn định. Chỉ
    áp dụng Rule 1, 4, 5, 6, 10, 11, 12 (mức bề mặt) ở đây. Đổi cấu
    trúc component chỉ khi một batch yêu cầu rõ.

[9] KHÔNG đưa tối ưu code lên trước tiến độ tính năng. Nếu quét tối ưu
    làm vỡ một batch đang dở, dừng lại, ghi vào mục VAN DE CON TON DONG
    và hoãn đến B9.
```

---

## 8. BANG DOI CHIEU NHANH — RULE NAO AP DUNG O DAU

| Rule | backend/ | mobile/src/lib | mobile/src/app | admin/ | docs/ |
|---|---|---|---|---|---|
| 1 Đặt tên | [v] | [v] | [v] | [v] | — |
| 2 Hàm nhỏ SRP | [v] | [v] | [!] bề mặt | [v] | — |
| 3 DRY | [v] | [v] | [!] bề mặt | [v] | — |
| 4 Comment why | [v] | [v] | [v] | [v] | — |
| 5 Định dạng | [v] tạo config ở B1 | [v] | [v] | [v] | — |
| 6 Không magic | [v] | [v] | [v] | [v] | — |
| 7 Xử lý lỗi | [v] | [v] | [v] | [v] | — |
| 8 Điều kiện rõ | [v] | [v] | [v] | [v] | — |
| 9 KISS | [v] | [v] | [v] | [v] | — |
| 10 Refactor | [v] | [v] | [!] không xóa mocks | [v] | — |
| 11 Comment VI | [v] | [v] | [v] | [v] | — |
| 12 Không emoji | [v] | [v] | [v] dùng icon component | [v] | [v] |
| 13 Warning/Bug | [v] | [v] | [v] | [v] | — |

`[!] bề mặt` = chỉ áp dụng trong phạm vi một file, không tách/gộp component hay đổi cấu trúc thư mục.
