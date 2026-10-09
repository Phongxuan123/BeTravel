# PHIẾU QUYẾT ĐỊNH VÀ BỔ SUNG DỮ LIỆU — BE.TRAVEL

Cập nhật: 07/10/2026 · Dựa trên: code `main` @ `9173411` và đợt kiểm thử thực tế cùng ngày
(chi tiết lỗi: [`FEATURE_STATUS_BUGS.md`](FEATURE_STATUS_BUGS.md)).

Phiếu này liệt kê **mọi việc mà code không tự quyết được**: quyết định sản phẩm, dữ liệu thật
cần người xác minh, tài khoản/cấu hình bên ngoài, và việc cần thử trên điện thoại thật.

## Cách dùng

1. Mỗi mục có **Người phụ trách**, **Đề xuất** và dòng **Trả lời**. Đánh dấu bằng `[x]`, điền
   vào chỗ `____`.
2. Mục bỏ trống sẽ áp dụng **Mặc định** ghi ở mục đó (luôn là phương án an toàn nhất).
3. Điền xong, báo lại. Các mục được trả lời sẽ được đưa vào code / dữ liệu theo từng PR.

## Quy tắc khi điền

- **Không ghi mật khẩu, API key, chuỗi kết nối database vào phiếu này.** Repo là public. Mục nào
  cần secret chỉ ghi "đã có / chưa có", còn secret đặt ở nơi quy định (Render, EAS, GitHub Secrets).
- **Không điền dữ liệu chưa xác minh** (luật, ngày tháng, số điện thoại, toạ độ). Chưa chắc thì
  ghi `CHƯA XÁC MINH`. Nội dung thiếu nguồn sẽ giữ ở trạng thái nháp, không ai điền hộ.
- Dữ liệu có nguồn: ghi kèm **URL nguồn** và **ngày truy cập**.

Mức ưu tiên: **P1** cần quyết trong tuần · **P2** trước khi demo/nghiệm thu · **P3** trước khi
phát hành · **P4** khi có dữ liệu.

---

## Quyết định đã chốt (08/10/2026)

Nhóm đã trả lời phiếu trong [`BeTravel_TRA_LOI_USER_INPUT_2026-10-08.md`](BeTravel_TRA_LOI_USER_INPUT_2026-10-08.md);
toàn bộ đề xuất ở đó được người dùng xác nhận là **quyết định của nhóm**. Kèm theo:

| Mục | Quyết định | Trạng thái |
|---|---|---|
| A2, A3, A4 | Chưa viết lại lịch sử git; giữ DB `test`; giữ tài khoản QA nội bộ | Giữ nguyên |
| B1 | Giữ cẩm nang mở | Giữ nguyên |
| B2 | Gỡ 2 bài mẫu khỏi danh sách công khai chờ duyệt | **Đã làm 08/10** (published --> archived --> draft) |
| B3 | Giữ quy tắc ngày công bố (phương án 1) | Giữ nguyên |
| B4 | AI tiếp tục khoá tới khi duyệt nội dung + reindex + test thật | Giữ nguyên |
| B5 | Giữ micro, sửa B02 | **Đã sửa 08/10** |
| B6 | Liên hệ khẩn cấp lưu trên máy, ghi rõ trong app | **Đã làm 08/10** |
| B7 | Bỏ nhãn "Đã mã hoá" (phương án 1) | **Đã làm 08/10** |
| B8 | Giữ transaction hiện có (đã có sẵn, xem đính chính bên dưới) | Không cần làm |
| B9 | Đợt 1: B01-B03, B05-B07 + số liên hệ SOS; đợt 2: B09-B14; đợt 3: B15-B22 | **Đợt 1 xong 08/10, đợt 2 xong 09/10** |
| D2 | Số Đại sứ quán đổi sang `+82 2 720 5124` theo trang chính thức | **Đã làm 08/10** (Atlas, seed, bộ số mất mạng) |
| D4 | Đóng gói sẵn số khẩn cấp KR (112/119/122 + Đại sứ quán) | **Đã làm 08/10** |
| E2 | Nút xoá tài khoản trong app + trang yêu cầu xoá | **Làm sau** (ghi nhận, chưa làm) |
| Phát sinh | Mở SOS cho người chưa đăng nhập; xoá script `seed:samples` | **Đã làm 08/10** |

Các mục còn lại bên dưới vẫn chờ người cung cấp dữ liệu / tài khoản / kết quả thử máy thật.

## Tóm tắt nhanh

| Mã | Việc | Ưu tiên | Người phụ trách gợi ý |
|---|---|---|---|
| A2 | Viết lại lịch sử git (xoá thông tin nhạy cảm cũ) | P1 | Trưởng nhóm |
| A3 | Tên database Atlas (`test`) | P3 | Trưởng nhóm |
| A4 | Giữ hay xoá tài khoản QA trên Atlas | P2 | Trưởng nhóm |
| B1 | Tra cứu pháp luật đang **mở mặc định** — xác nhận | P1 | Cả nhóm |
| B2 | Bài đã xuất bản nhưng chưa đủ điều kiện — giữ hay gỡ | P1 | Người duyệt nội dung |
| B3 | Quy tắc ngày công bố cho nguồn là cổng chính phủ | P1 | Cả nhóm |
| B4 | Khi nào mở AI pháp lý trên app | P2 | Cả nhóm |
| B5 | Xác nhận ngoại lệ phạm vi: nhập giọng nói | P2 | Cả nhóm |
| B6 | Liên hệ khẩn cấp: lưu trên máy hay đồng bộ server | P2 | Cả nhóm |
| B7 | Ô ghi chú giấy tờ + nhãn "Đã mã hoá" | P1 | Cả nhóm |
| B8 | Xuất bản bài luật có dùng transaction không | P3 | Backend |
| B9 | Thứ tự sửa 22 lỗi đã tìm thấy | P1 | Cả nhóm |
| C1-C4 | Nội dung pháp lý KR, người duyệt, mở quốc gia mới | P2 | Người duyệt nội dung |
| D1-D4 | Điểm hỗ trợ, Đại sứ quán, cảnh báo, số khẩn cấp | P2 | Người phụ trách dữ liệu SOS |
| E1-E2 | Điều khoản, Chính sách bảo mật, thông tin liên hệ | P3 | Trưởng nhóm |
| F1-F6 | Định danh app, hạ tầng, Maps, email, AI, đăng nhập Google | P3 | Trưởng nhóm / DevOps |
| G | Kiểm thử trên điện thoại thật | P2 | Người có máy Android / iPhone |

---

## A. BẢO MẬT VÀ VẬN HÀNH

### A2. Viết lại lịch sử git để xoá email thật, mật khẩu cũ, host cluster (P1)
Đây là thao tác phá huỷ: mọi thành viên phải clone lại repo sau khi làm.
- Đề xuất: làm một lần, có kế hoạch từng bước được duyệt trước, chọn thời điểm không ai đang có
  nhánh dở.
- Trả lời: [ ] Làm (ngày dự kiến: ____)   [ ] Không làm
- Mặc định: không làm.

### A3. Tên database trên Atlas (P3)
Backend đang dùng database tên `test`; toàn bộ dữ liệu thật nằm ở đây.
- Trả lời: [ ] Giữ `test`   [ ] Đổi thành: ____________ (sẽ có script chuyển dữ liệu)
- Mặc định: giữ `test`.

### A4. Tài khoản QA trên Atlas (P2)
Đợt kiểm thử tạo tài khoản `qa.emulator.1007@betravel.test` (vai trò user) để test lặp lại trên
emulator. Tài khoản không có chuyến đi, không ảnh hưởng người khác.
- Trả lời: [ ] Giữ làm tài khoản test chung   [ ] Xoá sau mỗi đợt test
- Mặc định: giữ.

---

## B. QUYẾT ĐỊNH SẢN PHẨM

### B1. Tra cứu pháp luật đang mở mặc định (P1)
PR #33 đổi mặc định `LEGAL_LOOKUP_ENABLED` từ `false` sang `true` để khôi phục cẩm nang. Hiện app
đang hiển thị 2 bài đã xuất bản cho mọi người dùng.
- Trả lời: [ ] Đồng ý mở   [ ] Khoá lại cho tới khi nội dung được duyệt (mục C)
- Mặc định: giữ như hiện tại (mở).

### B2. Bài đã xuất bản nhưng chưa đủ điều kiện xuất bản (P1)
Quy tắc của hệ thống: bài chỉ được xuất bản khi có ít nhất 1 nguồn đủ **URL + cơ quan ban hành +
ngày công bố**. Hai bài mẫu được đưa lên bằng script, đi vòng qua bước kiểm tra này:

| Bài | Trạng thái | Nguồn đủ điều kiện | Vấn đề |
|---|---|---|---|
| `bang-lai-nuoc-ngoai` (bằng lái quốc tế) | Đã xuất bản | 0 / 2 | Không nguồn nào có ngày công bố |
| `qua-han-luu-tru` (ở quá hạn visa) | Đã xuất bản | 1 / 4 | Đạt, nhưng chưa ghi nhận người duyệt chuyên môn |

- Trả lời cho `bang-lai-nuoc-ngoai`: [ ] Gỡ về nháp   [ ] Giữ, bổ sung ngày công bố: ____ (URL: ____)
- Trả lời cho `qua-han-luu-tru`: [ ] Đã được duyệt bởi: ____   [ ] Gỡ về nháp chờ duyệt
- Mặc định: giữ nguyên, ghi chú "chưa duyệt".

### B3. Quy tắc ngày công bố cho nguồn là cổng thông tin chính phủ (P1)
Nhiều trang chính phủ Hàn Quốc (easylaw.go.kr, k-eta.go.kr, customs.go.kr) không ghi ngày công
bố, nên phần lớn bài KR không thể xuất bản nếu giữ quy tắc hiện tại.
- Phương án 1: giữ nguyên; người duyệt tự tra ngày công bố cho từng bài.
- Phương án 2: cho phép nguồn loại "cổng chính phủ" dùng **ngày truy cập** thay ngày công bố; app
  hiển thị "Truy cập ngày ..." thay vì "Công bố ngày ...".
- Trả lời: [ ] Phương án 1   [ ] Phương án 2   [ ] Khác: ____________
- Lưu ý: phương án 2 nới lỏng mức kiểm chứng nội dung pháp lý; nhóm cần chịu trách nhiệm quyết định.
- Mặc định: phương án 1.

### B4. Khi nào mở AI pháp lý trên app (P2)
Hiện màn AI hiển thị "Trợ lý AI sắp ra mắt" (cờ `EXPO_PUBLIC_AI_CHAT_ENABLED=false`). Kiểm thử
cho thấy cơ chế từ chối khi thiếu dữ liệu hoạt động đúng, nhưng kho tri thức của AI **đang rỗng**:
2 bài đã xuất bản chưa được index (0 đoạn). Muốn AI trả lời được cần: duyệt nội dung (mục C),
chạy Reindex trong Admin (F5), rồi chạy bộ 26 câu hỏi kiểm tra bằng AI thật.
- Trả lời: [ ] Mở sau khi đủ 3 bước trên   [ ] Mở ngay để demo   [ ] Chưa mở trong đợt này
- Mặc định: chưa mở.

### B5. Xác nhận ngoại lệ phạm vi: nhập giọng nói (P2)
Nhập giọng nói vốn nằm trong danh sách "không làm ở MVP". PR #33 đã triển khai và ghi vào
`CLAUDE.md` là "ngoại lệ theo yêu cầu người dùng 07/10/2026". Kiểm thử cho thấy tính năng **chưa
chạy được trên Android** (lỗi B02).
- Trả lời: [ ] Giữ tính năng, sửa B02   [ ] Ẩn nút micro cho tới khi sửa xong   [ ] Bỏ tính năng
- Mặc định: ẩn nút micro cho tới khi sửa xong.

### B6. Liên hệ khẩn cấp lưu ở đâu (P2)
Hiện liên hệ khẩn cấp chỉ lưu trên điện thoại; đổi máy hoặc cài lại app là mất (lỗi B13).
- Phương án 1: đồng bộ lên server (cần thêm API, dữ liệu cá nhân của người thân nằm trên server).
- Phương án 2: giữ trên máy, ghi rõ trong app "Chỉ lưu trên điện thoại này".
- Trả lời: [ ] Phương án 1   [ ] Phương án 2
- Mặc định: phương án 2.

### B7. Ô ghi chú giấy tờ và nhãn "Đã mã hoá" (P1)
Thẻ "Giấy tờ của tôi" ghi "Đã mã hoá", nhưng ghi chú (ví dụ số hộ chiếu) đang lưu dạng văn bản
thường trên máy (lỗi B03). Đây là thông tin sai với người dùng.
- Phương án 1: bỏ nhãn "Đã mã hoá" ngay, giữ ô ghi chú.
- Phương án 2: chuyển ghi chú sang kho bảo mật của hệ điều hành rồi giữ nhãn.
- Phương án 3: bỏ ô ghi chú, chỉ còn đánh dấu "đã chuẩn bị".
- Trả lời: [ ] Phương án 1   [ ] Phương án 2   [ ] Phương án 3
- Mặc định: phương án 1 (làm ngay).

### B8. Xuất bản bài luật có dùng transaction không (P3)
**Đính chính:** bản phiếu đầu ghi "chưa dùng transaction" là sai. `changeArticleStatus` đã chạy
trong `LegalArticle.db.transaction` và index duy nhất đã tạo trên Atlas (`npm run check-indexes`).
- Đề xuất: dùng transaction (Atlas hỗ trợ), kiểm tra tương thích trước khi bật.
- Trả lời: [ ] Theo đề xuất   [ ] Giữ như hiện tại
- Index duy nhất `{countryCode, slug}` khi `isCurrent = true` đã tạo trên Atlas chưa?
  [ ] Đã tạo   [ ] Chưa   [ ] Không biết (chạy `npm run check-indexes` trong `backend/` để kiểm)
- Đã chốt: giữ như hiện tại.

### B9. Thứ tự sửa 22 lỗi đã tìm thấy (P1)
Danh sách đầy đủ ở [`FEATURE_STATUS_BUGS.md`](FEATURE_STATUS_BUGS.md) mục 4.
- Đề xuất:
  - Đợt 1: B01, B02 (chia sẻ vị trí, giọng nói), B03 (theo B7), B05, B06 (vùng an toàn, thanh
    trạng thái), B07.
  - Đợt 2: B09-B14 (wizard chuyến đi, cảnh báo, hiển thị dữ liệu thô).
  - Đợt 3: B15-B22.
  - B04, B08 phụ thuộc dữ liệu ở mục C, D.
- Trả lời: [ ] Theo đề xuất   [ ] Thứ tự khác: ____________
- Mỗi đợt một PR riêng. Người review: ____________

---

## C. NỘI DUNG PHÁP LÝ HÀN QUỐC

### C1. Bổ sung dữ liệu cho 8 bài hiện có (P2)
Mỗi bài cần: **ngày có hiệu lực** (YYYY-MM-DD) và **ít nhất 1 nguồn có ngày công bố** (hoặc theo
quyết định B3). Không có thì ghi `KHÔNG CÓ`, bài giữ ở trạng thái nháp.

| # | Bài (slug) | Trạng thái | Hiện thiếu | Ngày hiệu lực | Ngày công bố nguồn + URL |
|---|---|---|---|---|---|
| 1 | `visa-nhap-canh` | Nháp | Ngày công bố cho cả 2 nguồn | 2025-01-01 (có) | |
| 2 | `qua-han-luu-tru` | Xuất bản | Người duyệt (B2) | 2009-06-20 (có) | Có 1 nguồn |
| 3 | `bang-lai-nuoc-ngoai` | Xuất bản | Ngày công bố cho cả 2 nguồn (B2) | 2009-06-20 (có) | |
| 4 | `ma-tuy-canh-bao` | Nháp | Ngày hiệu lực | | Có 1 nguồn |
| 5 | `hai-quan-tien-mat-mien-thue` | Nháp | Ngày hiệu lực, ngày công bố, **ngưỡng khai báo tiền mặt** | | |
| 6 | `lao-dong-eps-luong-toi-thieu` | Nháp | Chỉ cần người duyệt (đã đủ điều kiện) | 2026-01-01 (có) | Có 1 nguồn |
| 7 | `so-khan-cap-va-tong-dai-ho-tro` | Nháp | Ngày hiệu lực, ngày công bố | | |
| 8 | `mat-ho-chieu-ho-tro-cong-dan` | Nháp | Ngày hiệu lực, ngày công bố | | |

- Ngưỡng khai báo tiền mặt khi nhập cảnh (bài 5): ____________ Nguồn: ____________
- Bài muốn xuất bản ngay khi đủ dữ liệu: [ ] Tất cả bài đủ điều kiện   [ ] Chỉ bài số: ____

### C2. Người duyệt chuyên môn pháp lý (P2)
- Người chịu trách nhiệm rà soát nội dung luật (tên / vai trò): ____________
- Mặc định: không xuất bản thêm bài nào khi chưa có người duyệt.

### C3. Nội dung khác đang hiển thị nhưng chưa ghi nhận người kiểm (P2)
Đang xuất bản trên app: **5 hướng dẫn xử lý sự cố** (mất hộ chiếu, tai nạn giao thông, bị công an
kiểm tra giấy tờ, cần hỗ trợ y tế, mất đồ/bị trộm) và **25 câu dịch khẩn cấp** tiếng Hàn.
**Đính chính:** câu dịch không có trường trạng thái nên không thể "gỡ về nháp"; muốn ẩn cần thêm
cơ chế trạng thái/hiển thị trước.
- Trả lời: [ ] Đã có người kiểm: ____________   [ ] Chưa
- Nếu chưa: [ ] Giữ hiển thị   [ ] Gỡ về nháp tới khi kiểm xong
- Mặc định: giữ hiển thị.

### C4. Mở thêm quốc gia (P4)
Chỉ Hàn Quốc đang mở. Nhật Bản, Thái Lan, Singapore đang "Sắp ra mắt", chưa có bài nào.
- Quốc gia tiếp theo: [ ] Nhật Bản   [ ] Thái Lan   [ ] Singapore   [ ] Chưa mở
- Người cung cấp nội dung + nguồn: ____________
- Mặc định: chưa mở.

---

## D. DỮ LIỆU AN TOÀN VÀ KHẨN CẤP

### D1. Điểm hỗ trợ: đại sứ quán, bệnh viện, đồn công an, nhà thuốc (P2)
Atlas đang có **0 điểm**, nên mục "Địa điểm hỗ trợ gần bạn", bản đồ SOS và nút "Đồn công an gần
nhất" trong hướng dẫn sự cố đều trống.
- Điền vào `docs/sos-locations-template.csv` (cột: `countryCode,type,name,nameLocal,address,phone,
  website,openHours,lat,lng,verified`), rồi nhập qua Admin --> Điểm hỗ trợ.
- Chỉ đặt `verified = true` cho điểm đã xác minh trực tiếp (số điện thoại, toạ độ, giờ mở cửa).
  App chỉ hiển thị điểm đã xác minh.
- File đã điền: ____________ · Số điểm: ____ · Người xác minh: ____________
- Mặc định: không nhập điểm nào.

### D2. Đại sứ quán Việt Nam tại Hàn Quốc (P1)
App đang hiển thị trong SOS Hub và hướng dẫn "Mất hộ chiếu". Đợt kiểm thử **không đối chiếu được
với nguồn chính thức**, cần người xác minh:

| Trường | Giá trị đang hiển thị | Đúng? | Giá trị đúng + nguồn |
|---|---|---|---|
| Số điện thoại | `+82 2-720-5510` | [ ] Đúng [ ] Sai | |
| Địa chỉ | `123 Bukchon-ro, Jongno-gu, Seoul (03052)` | [ ] Đúng [ ] Sai | |
| Toạ độ (lat, lng) | Chưa có | | |
| Đường dây nóng bảo hộ công dân | | | |

### D3. Cảnh báo theo vị trí (P4)
Atlas đang có **0 cảnh báo**. Luồng admin --> app đã được kiểm thử và chạy được.
- Cần: quốc gia, phạm vi (toàn quốc hoặc tâm + bán kính), mức độ (`info / warn / danger`), nội
  dung, hành vi cần tránh, nguồn, thời gian hiệu lực.
- Trả lời: [ ] Có dữ liệu, ở: ____________   [ ] Chưa cần
- Mặc định: không tạo.

### D4. Số khẩn cấp dùng được khi không có mạng (P3)
Đề xuất đóng gói sẵn số khẩn cấp của các nước đang mở để mở app lần đầu lúc mất mạng vẫn thấy.
Hiện app hiển thị cho Hàn Quốc: Cảnh sát 112, Cứu thương 119, Cứu hoả 119, Cứu hộ biển 122.
- Trả lời: [ ] Làm   [ ] Không làm
- Người xác minh từng số: ____________ Nguồn: ____________

---

## E. PHÁP LÝ CỦA ỨNG DỤNG

### E1. Điều khoản sử dụng và Chính sách bảo mật (P3)
Màn đăng ký yêu cầu người dùng đồng ý "Điều khoản" và "Chính sách bảo mật", nhưng hai liên kết
hiện chỉ mở màn "đang hoàn thiện": **chưa có văn bản nào**. Không tự soạn văn bản pháp lý thay nhóm.
- Người soạn / duyệt: ____________
- Văn bản (file hoặc URL): Điều khoản: ____________ Chính sách bảo mật: ____________

### E2. Thông tin liên hệ và xoá tài khoản (P3)
Google Play và App Store yêu cầu cách xoá tài khoản khi app có đăng ký.
- Email hỗ trợ hiển thị trong app: ____________
- Tên đơn vị vận hành: ____________
- Quy trình xoá tài khoản và dữ liệu: [ ] Nút xoá trong app   [ ] Gửi yêu cầu qua email   [ ] Khác: ____

---

## F. PHÁT HÀNH VÀ HẠ TẦNG

### F1. Định danh ứng dụng (P3) — không đổi được sau khi lên store
- `android.package` (ví dụ `com.tendonvi.betravel`): ____________
- `ios.bundleIdentifier`: ____________
- Tên dưới biểu tượng (hiện `Be.Travel`): [ ] Giữ   [ ] Đổi thành: ____________
- `slug` Expo hiện là `FE`: [ ] Đổi thành `betravel`   [ ] Giữ
- Biểu tượng, splash: [ ] Dùng bản trong `mobile/assets`   [ ] Thay bằng file mới: ____________
- Ghi chú: emulator dev đang dùng tạm `com.betravel.dev`, không commit.

### F2. Hạ tầng triển khai (P3) — chỉ ghi địa chỉ, không ghi secret
- Render (backend): [ ] Có tài khoản   [ ] Chưa · URL: ____________
- Vercel (Admin Portal): [ ] Có   [ ] Chưa · URL: ____________
- Expo EAS (build app): [ ] Có   [ ] Chưa · Tài khoản/tổ chức: ____________
- Secret GitHub `BACKEND_HEALTH_URL` cho job giữ backend không ngủ: [ ] Đã tạo   [ ] Chưa
- Bản phát hành đầu tiên cho: [ ] Kiểm thử nội bộ (APK)   [ ] Google Play   [ ] App Store

### F3. Google Maps (P2)
Bản đồ SOS đang hiện "Bản đồ chưa được cấu hình" vì chưa có key. Hướng dẫn: `docs/MAPS_SETUP.md`.
- Key Android (giới hạn theo package + SHA-1, đặt hạn mức chi phí): [ ] Đã tạo   [ ] Chưa
- Key iOS: [ ] Đã tạo   [ ] Chưa   [ ] Dùng Apple Maps trên iOS
- Người quản lý Google Cloud project: ____________

### F4. Email đặt lại mật khẩu (P2)
Backend đã cấu hình gửi email OTP qua Gmail SMTP và nhận yêu cầu bình thường, nhưng **chưa ai xác
nhận email tới hộp thư**.
- Một thành viên thử "Quên mật khẩu" bằng email thật của mình: [ ] Nhận được trong ____ phút
  [ ] Không nhận được   [ ] Vào thư rác
- Nhà cung cấp email cho production: [ ] Giữ Gmail SMTP   [ ] Khác: ____________

### F5. AI: nhà cung cấp, hạn mức, ngân sách (P2)
- Nhà cung cấp production: [ ] Gemini (đang dùng)   [ ] Khác: ____________
- Hạn mức tin nhắn AI mỗi người / ngày (hiện 40) và toàn hệ thống / ngày (hiện 800):
  ____ / ____   [ ] Giữ nguyên
- Cho phép chạy Reindex KR (tạo embedding cho bài đã xuất bản, chi phí rất nhỏ): [ ] Có   [ ] Không
- Ngân sách chạy bộ 26 câu kiểm tra bằng AI thật: ____________   [ ] Chưa cho phép
- Mặc định: không gọi AI thật ngoài tính năng dịch.

### F6. Đăng nhập bằng Google (P3)
Backend **đã có** route `/auth/google` và `/auth/google/link` (dùng `GOOGLE_CLIENT_ID`), nhưng app
chưa có nút đăng nhập Google. **Đính chính:** biến này không thừa, không được xoá riêng lẻ.
- Đã chốt: chưa làm giao diện đăng nhập Google trong đợt này.
- Mặc định: không làm.

---

## G. KIỂM THỬ TRÊN ĐIỆN THOẠI THẬT (P2)

Emulator không thay được điện thoại thật. Ghi `OK` / `LỖI` (mô tả ngắn) / `CHƯA THỬ`. Các mục có
mã lỗi nên thử lại **sau khi** đợt sửa tương ứng được merge.

| # | Việc cần thử | Lỗi liên quan | Android (máy / bản) | iPhone (máy / bản) | Ghi chú |
|---|---|---|---|---|---|
| 1 | SOS --> Chia sẻ vị trí --> Lấy vị trí --> gửi qua Zalo/SMS | B01 | | | |
| 2 | Dịch --> bấm micro, nói tiếng Việt, kiểm tra chữ nhận được | B02 | | | |
| 3 | Dịch --> Phát âm bản dịch tiếng Hàn có nghe được không | | | | |
| 4 | SOS Hub --> Cập nhật vị trí trong nhà và ngoài trời | B07 | | | |
| 5 | Nhìn thanh trạng thái (giờ, pin) trên các màn khi máy để giao diện tối | B06 | | | |
| 6 | Màn Khám phá, Cá nhân: tiêu đề có bị che, nút góc phải có bấm được | B05 | | | |
| 7 | Bản đồ SOS hiện đúng (sau khi có key F3) | | | | |
| 8 | Nút gọi 112 / Đại sứ quán mở đúng số | | | | |
| 9 | Mở app lúc mất mạng: SOS hiện gì | D4 | | | |
| 10 | Màn hẹp 375px (iPhone SE): có tràn chữ không | | | | |
| 11 | Quên mật khẩu bằng email thật | F4 | | | |

Người thử: ____________ · Ngày: ____________

---

## H. GHI CHÚ KHÁC

Tính năng muốn thêm, nội dung muốn đổi, ưu tiên khác:

____________
