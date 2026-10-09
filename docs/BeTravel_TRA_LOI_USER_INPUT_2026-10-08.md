# Trả lời phiếu quyết định và bổ sung dữ liệu Be.Travel

Ngày đối chiếu: **08/10/2026**. Phiếu gốc: `Downloads/USER_INPUT_FORM (1).md`.
Code: `main@9173411a65b10f672e84fcc7f435834571daf4c7`, trùng `origin/main` sau fetch và pull `--ff-only`.

Đã trả lời toàn bộ A–H. **Các lựa chọn đề xuất dưới đây chưa phải quyết định được nhóm phê duyệt.** Yêu cầu của phiên này là pull và trả lời phiếu; những hướng dẫn triển khai/default trong phiếu được xem là nội dung cần đánh giá, không phải lệnh sửa dữ liệu, đổi secret, chạy AI trả phí hay phát hành. Giữ nguyên phiếu gốc.

## Căn cứ và tiến độ

Tiến độ trả lời: `[#####] 5/5` — cập nhật main, đọc phiếu, đối chiếu code/Docs, kiểm tra chỉ đọc DB và nguồn chính thức, lập bản trả lời.

| Phạm vi | Kết quả xác minh trong phiên này |
|---|---|
| Git | Main từ `21354c1` lên `9173411` bằng fast-forward; không tạo merge commit, không merge feature, giữ các nhánh cũ |
| Kiến trúc | Ba workspace npm độc lập: Express/Mongoose backend; Expo 57/Router mobile; Vite/React admin. API theo contracts, public luật chỉ published/current, SOS chỉ verified |
| Atlas, truy vấn chỉ đọc | DB `test`; 8 bài luật (2 published), 0 chunks, 0 điểm hỗ trợ, 0 GeoAlert, 5 incidents published, 25 QuickPhrase, 4 countries |
| Index | `npm run check-indexes` trả `transactionCapable: true`, `currentArticleUniqueIndex: true` |
| Cấu hình local | Gemini cho LLM/embedding; Search driver `memory`; quota 40/800; mobile thiếu key Maps và package/bundle ID; AI mobile mặc định khóa |
| Kiểm thử | Không chạy lại bộ hồi quy hay thử điện thoại trong phiên trả lời này. Sổ 07/10 ghi backend 269/269, mobile 206/206, admin 18/18 và export đạt; đây là kết quả lịch sử local, không xác nhận 22 lỗi thực tế đã hết |

File `FEATURE_STATUS_BUGS.md` mà phiếu tham chiếu **không có trong main**, cũng không tìm thấy trong phạm vi Downloads được kiểm tra. Vì vậy các mã B01–B22 dưới đây theo mô tả trong phiếu, chưa đối chiếu được báo cáo đầy đủ hoặc bước tái hiện.

Nguồn code/Docs chính: [PROGRESS.md](PROGRESS.md), [PATCH_2026_10_05.md](PATCH_2026_10_05.md), [VOICE_TRANSLATION.md](VOICE_TRANSLATION.md), [MAPS_SETUP.md](MAPS_SETUP.md), [contracts](../contracts/README.md), [env backend](../backend/src/core/env.js), [service bài luật](../backend/src/services/legalArticle.service.js), [model bài luật](../backend/src/models/LegalArticle.js), [cấu hình app](../mobile/app.config.js).

## A. Bảo mật và vận hành

### A1 — Mật khẩu admin

**Trả lời: CHƯA XÁC MINH đã đổi hay chưa. Người thực hiện: lead/chủ tài khoản, chưa có tên xác nhận.** Code và DB không chứng minh được mật khẩu hiện tại đã khác mật khẩu lộ trước đây. Không thử đăng nhập bằng mật khẩu cũ. Đề xuất chủ tài khoản đổi ngay nếu chưa làm và kiểm tra việc vô hiệu hóa phiên đăng nhập cũ. Đây là mật khẩu tài khoản Admin Portal, khác với mật khẩu DB user của Atlas; nếu DB credential cũng lộ thì cần đổi riêng.

### A2 — Viết lại lịch sử Git

**Đề xuất: chưa thực hiện trong phiên này; lập kế hoạch để lead duyệt, ngày chưa chốt.** Ưu tiên vô hiệu hóa secret đã lộ trước; xóa lịch sử không làm secret cũ an toàn trở lại. Khi duyệt kế hoạch cần xác định phạm vi commit/ref, thời gian khóa push, cách xử lý nhánh/PR/fork và đồng bộ clone của nhóm. Chưa có sự chấp thuận để force-push hoặc viết lại lịch sử.

### A3 — Tên database

**Đề xuất: giữ `test` ở đợt hiện tại.** Đã xác minh kết nối hiện tại thực sự dùng DB `test`. Đổi tên chỉ nên làm qua kế hoạch migration có backup, kiểm đếm, kiểm index và rollback; không chỉ thay URI vì app có thể trỏ sang DB rỗng.

### A4 — Tài khoản QA

**Đề xuất: giữ cho QA nội bộ, không chia sẻ mật khẩu công khai.** Đã xác minh tài khoản test được phiếu nêu tồn tại, role `user`, có 0 chuyến đi tại thời điểm đọc. Chủ quản: người phụ trách QA/lead, chưa có tên xác nhận. Lâu dài nên dùng tài khoản riêng từng tester và dữ liệu test tách biệt.

## B. Quyết định sản phẩm

### B1 — Mở cẩm nang

**Hiện trạng: mặc định mở**, đúng yêu cầu trước đây của bạn. Local không đặt override `LEGAL_LOOKUP_ENABLED`; code mặc định `true`. Atlas có 2 bài published.

**Đề xuất: giữ khả năng truy cập cẩm nang; xử lý tính hợp lệ của từng bài theo B2.** Nếu chưa còn bài đủ duyệt thì hiển thị trạng thái rỗng rõ ràng. Việc mở route không đồng nghĩa nội dung đã được chuyên gia kiểm chứng. Production env vẫn cần người vận hành kiểm tra riêng.

### B2 — Hai bài mẫu

| Bài | Thực tế Atlas | Trả lời đề xuất |
|---|---|---|
| `bang-lai-nuoc-ngoai` | Published, 0/2 nguồn đủ ngày, không reviewedBy/reviewedAt; ghi chú demo chưa đối chiếu | Gỡ khỏi danh sách công khai để biên tập và duyệt lại; chưa có ngày công bố xác minh để điền |
| `qua-han-luu-tru` | Published, 1/4 nguồn đủ trường theo schema; không reviewedBy/reviewedAt; ghi chú demo chưa đối chiếu | Chờ người duyệt chuyên môn; chưa thể điền tên người duyệt, đề xuất gỡ khỏi danh sách công khai trong thời gian chờ |

Đây là đề xuất thay cho mặc định “giữ nguyên, ghi chú chưa duyệt” của phiếu. Không thay đổi Atlas trong phiên này. Máy trạng thái hiện tại không cho `published → draft` trực tiếp: cần archive rồi chuyển draft, hoặc tạo phiên bản nháp mới theo workflow; phải tính cả purge chunks và cache khi thực hiện.

### B3 — Ngày công bố nguồn

**Đề xuất hiện tại: phương án 1, giữ quy tắc đang có.** Ngày truy cập không được ghi vào `publishedAt`. Nếu nhóm chọn phương án 2 sau này, nên thêm trường `accessedAt` riêng, giới hạn nguồn chính thức, giữ rõ ngày hiệu lực văn bản và người duyệt; cập nhật contracts, model, validation và UI cùng đợt. Nguồn không có ngày chưa chứng minh luật hết hiệu lực hay đang có hiệu lực.

### B4 — Mở AI pháp lý

**Đề xuất: mở sau đủ ba bước duyệt nội dung → reindex thành công → kiểm thử 26 câu với AI thật trong ngân sách được duyệt. Hiện tại tiếp tục khóa.** Atlas hiện có 0 chunks. Test golden với mock không chứng minh chất lượng model thật. Local `SEARCH_DRIVER=memory`; cần kiểm tra cấu hình/index Atlas Search riêng trước triển khai production.

### B5 — Micro

**Đề xuất: giữ tính năng và sửa/xác minh B02.** Việc giữ voice đã được bạn yêu cầu rõ ở phiên trước; không coi đây là phạm vi cần quyết lại. Bản native chưa hỗ trợ thì nút phải báo đúng hạn chế hoặc vô hiệu hóa thao tác nhận giọng.

Code đã có optional native module và plugin nhận giọng. Expo Go/binary cũ không có module; cần native rebuild, recognizer và quyền thiết bị. Đây là nguyên nhân cần kiểm tra đầu tiên, **chưa thể kết luận là nguyên nhân B02** vì thiếu báo cáo tái hiện. Không cần API key STT riêng; nhận giọng phụ thuộc OS/dịch vụ máy.

### B6 — Liên hệ người thân

**Đề xuất: phương án 2**, giữ local và ghi “Chỉ lưu trên điện thoại này; có thể mất khi xóa dữ liệu/cài lại app”. Đổi máy chưa có đồng bộ cloud. Thêm API đồng bộ cần quyết định riêng về dữ liệu người thân, quyền truy cập, xóa dữ liệu và xử lý xung đột. Chia sẻ vị trí hiện dùng share sheet theo hành động của người dùng, không phải theo dõi liên tục.

### B7 — Nhãn mã hóa giấy tờ

**Đề xuất: phương án 1**, bỏ nhãn “Đã mã hoá”, giữ ghi chú và mô tả đúng cách lưu. Đã tìm thấy nhãn tại `mobile/src/app/profile/index.tsx`; lớp JSON storage dùng AsyncStorage, không phải vault mã hóa. Token dùng SecureStore không chứng minh ghi chú được mã hóa. Chuyển ghi chú sang kho bảo mật sau này cần migration có kiểm tra, không làm mất ghi chú cũ.

### B8 — Transaction và index

**Trả lời: giữ implementation transaction hiện có; index đã tạo trên database đang kết nối.** Nhận định “chưa dùng transaction” trong phiếu đã lỗi thời đối với `main@9173411`.

`changeArticleStatus` dùng `LegalArticle.db.transaction`, cập nhật phiên bản, lưu bài và enqueue reindex/purge chung session. Model khai partial unique `{countryCode, slug}` với `isCurrent:true`. Kiểm tra live read-only xác nhận cả hai điều kiện đạt.

**Ngoại lệ cần xử lý riêng:** `seed:samples` gán published trực tiếp, bỏ qua service kiểm xuất bản và không enqueue reindex. Không chạy lại script đó cho production. Transaction nghiệp vụ không tự bảo vệ mọi script viết DB trực tiếp.

### B9 — Thứ tự sửa lỗi

**Đề xuất: theo nhóm đợt trong phiếu, đưa B03 và thông tin liên hệ SOS sai lên đầu đợt 1.** Đợt 1 còn B01/B02/B05/B06/B07; đợt 2 B09–B14; đợt 3 B15–B22. B04/B08 cần dữ liệu C/D, không tạo dữ liệu giả để đóng lỗi.

Chưa thể xác nhận phân loại hoặc mức nghiêm trọng của từng mã do thiếu `FEATURE_STATUS_BUGS.md`; trước sửa cần nhập báo cáo này với bước tái hiện, thiết bị/build, expected/actual. Mỗi đợt một PR; **người review: lead của bạn, tên chưa cung cấp**. Lead quyết định merge.

## C. Nội dung Hàn Quốc

### C1 — Tám bài

Các ngày dưới đây là **giá trị đang lưu trong Atlas, chưa phải xác minh tính đúng/hiện hành của pháp luật**. Không dùng ngày nhập dữ liệu hoặc ngày truy cập thay ngày hiệu lực.

| # | Slug | Ngày hiệu lực đang lưu | Ngày công bố nguồn đang lưu | Trả lời / còn thiếu |
|---|---|---|---|---|
| 1 | visa-nhap-canh | 2025-01-01 | Không có ở 2 nguồn | Giữ draft; CHƯA XÁC MINH ngày của nguồn và hiệu lực áp dụng |
| 2 | qua-han-luu-tru | 2009-06-20 | 2023-01-01 tại [Korea Immigration Service](https://www.immigration.go.kr/bbs/immigration_eng/229/458399/download.do) | Có ngày trong DB, chưa đối chiếu văn bản; chưa người duyệt; theo B2 |
| 3 | bang-lai-nuoc-ngoai | 2009-06-20 | Không có ở 2 nguồn | CHƯA XÁC MINH; cần xác định chế độ bằng lái/điều ước áp dụng; theo B2 |
| 4 | ma-tuy-canh-bao | Không có | 2024-05-27 tại [Korea Times](https://www.koreatimes.co.kr/southkorea/law-crime/20240527/south-koreans-who-smoke-weed-overseas-to-face-criminal-charges-govt-warns) | Giữ draft; cần ngày hiệu lực và luật chính thức. Nguồn có ngày là báo chí; nguồn khác là Wikipedia |
| 5 | hai-quan-tien-mat-mien-thue | Không có | Không có | Giữ draft; đã tìm nguồn chính thức cho ngưỡng bên dưới, chưa xác minh ngày hiệu lực/ngày công bố |
| 6 | lao-dong-eps-luong-toi-thieu | 2026-01-01 | 2025-11-07 tại [Mercans](https://mercans.com/resources/statutory-alerts/south-korea-2026-minimum-wage-officially-notified-%EA%B3%A0%EC%8B%9C/) | Giữ draft chờ duyệt; đủ một số trường schema không đồng nghĩa đủ kiểm chứng. Nguồn có ngày là đơn vị tư vấn, cần đối chiếu thông báo MOEL gốc |
| 7 | so-khan-cap-va-tong-dai-ho-tro | Không có | Không có | Giữ draft; số khẩn cấp có thể kiểm theo D4 nhưng ngày hiệu lực của bài còn chưa xác minh |
| 8 | mat-ho-chieu-ho-tro-cong-dan | Không có | Không có | Giữ draft; thay/đối chiếu nguồn mofa.gov.vn và số điện thoại theo D2; không mặc nhiên coi website .org đang lưu là nguồn chính thức |

Ngưỡng khai báo khi nhập cảnh Hàn Quốc: **tổng phương tiện thanh toán vượt 10.000 USD hoặc tương đương**, gồm ngoại tệ, KRW và séc thuộc phạm vi quy định; không chỉ riêng tiền giấy USD. Chính xác là “vượt”, không phải “từ 10.000”. Nguồn: [Korea Customs Service — Declaration of Foreign Currency](https://www.customs.go.kr/english/cm/cntnts/cntntsView.do?cntntsId=5500&mi=10800), phần arrival. Truy cập 08/10/2026. Trang này chưa cung cấp đủ căn cứ để tôi điền ngày hiệu lực/ngày công bố cho bài; không tự nhập vào Atlas.

**Đề xuất lựa chọn xuất bản: tất cả bài đủ điều kiện sau khi nguồn và nội dung được người chuyên môn duyệt. Hiện chưa có bài nào được xác nhận duyệt trong phiên này.** Không xuất bản ngay chỉ vì đủ trường schema.

### C2 — Người duyệt

**Tên/vai trò: CHƯA ĐƯỢC CUNG CẤP.** Cả tám bài hiện không có `reviewedBy`/`reviewedAt`; không đủ căn cứ để tuyên bố đã duyệt chuyên môn. Lead cần chỉ định người có khả năng đối chiếu pháp luật Hàn Quốc và ghi nhận review theo từng phiên bản. Đề xuất chưa publish thêm trước bước này.

### C3 — Incidents và câu mẫu

**Đã xác minh dữ liệu tồn tại: 5 IncidentType published và 25 QuickPhrase KR; người kiểm chuyên môn/ngôn ngữ: CHƯA XÁC MINH.** QuickPhrase hiện **không có trường status**: phiếu gọi “25 câu published” không chính xác về model.

Đề xuất chưa coi bộ này là nội dung an toàn đã duyệt khi phát hành. Giữ cho kiểm thử nội bộ; trước mở cho người dùng thật cần rà từng hướng dẫn và câu Hàn. Nếu cần gỡ câu mẫu chờ duyệt, phải bổ sung cơ chế trạng thái/visibility và xử lý cache; không thể dùng thao tác “đưa về draft” vốn chưa tồn tại cho QuickPhrase. Không xóa chúng trong phiên này.

### C4 — Quốc gia tiếp theo

**Đề xuất: chưa mở. Người cung cấp nội dung/nguồn: chưa chỉ định.** Atlas xác nhận KR active; JP/TH/SG coming_soon. Hoàn thiện KR và bộ dữ liệu an toàn trước, rồi nhóm chọn nước theo nhu cầu thực tế.

## D. An toàn và khẩn cấp

### D1 — Điểm hỗ trợ

**File đã điền: chưa có. Số điểm hiện tại: 0. Người xác minh: chưa chỉ định.** Mẫu có sẵn: [sos-locations-template.csv](sos-locations-template.csv). Không tự đặt verified từ kết quả tìm kiếm. Cần đối chiếu vị trí, số liên hệ, giờ mở cửa và ngày kiểm. Có key Maps không tự tạo ra điểm hỗ trợ trong DB.

### D2 — Đại sứ quán

Đã đối chiếu với [trang Liên hệ của Đại sứ quán trên cổng Bộ Ngoại giao](https://vnembassy-seoul.mofa.gov.vn/lien-he), truy cập 08/10/2026:

| Trường | Trả lời |
|---|---|
| `+82 2-720-5510` | **Không khớp số điện thoại chính thức công bố.** Đề xuất dùng `+82 2 720 5124` (`+8227205124` cho tel). Chưa thử cuộc gọi thực tế |
| `123 Bukchon-ro, Jongno-gu, Seoul (03052)` | Khớp địa chỉ ở footer chính thức; giữ địa chỉ này |
| Lat/lng | CHƯA XÁC MINH; không suy ra tọa độ để đánh dấu verified |
| Hotline bảo hộ công dân | CHƯA XÁC MINH số riêng 24/7; không đổi nhãn số văn phòng thành hotline |

Trang chính thức phân biệt `7205124` là điện thoại và `7204684` là fax. Không dùng fax làm số hỗ trợ. Nguồn `.org` trong seed cần thay/đối chiếu với nguồn Bộ Ngoại giao; kết quả trên là đề xuất dữ liệu, chưa ghi vào DB hoặc code.

### D3 — GeoAlert

**Trả lời: chưa có dữ liệu xác minh để nhập; Atlas hiện 0 cảnh báo.** Đề xuất chưa tạo cảnh báo. Khi có nguồn phải ghi thời gian hiệu lực, phạm vi và mức độ; cảnh báo thử cần môi trường QA riêng. Việc “luồng đã kiểm thử chạy được” theo phiếu chưa được chạy lại trong phiên này.

### D4 — SOS offline lần đầu

**Đề xuất: làm cho các nước active, hiện là KR.** 112 (cảnh sát), 119 (cấp cứu/cứu hỏa), 122 (tai nạn trên biển) được đối chiếu trên [cổng thông tin pháp luật thực hành của Hàn Quốc](https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=3&cnpClsNo=1&csmSeq=1702&popMenu=ov), mục số đặc biệt. [Cảnh sát Hàn Quốc](https://www.police.go.kr/eng/main.do) cũng công bố 112 và 119. Truy cập 08/10/2026.

Người xác minh nguồn web trong phiên: trợ lý; người nghiệm thu dữ liệu để phát hành: chưa chỉ định. Chưa gọi các số. Đóng gói bộ có version/nguồn/ngày kiểm, đọc được không cần đăng nhập hoặc cache từ lần trước. Hiện cache quốc gia giúp khi đã từng tải, không bảo đảm lần mở đầu offline. Hiển thị số offline không bảo đảm thiết bị có sóng để gọi.

## E. Pháp lý của ứng dụng

### E1 — Điều khoản và quyền riêng tư

**Người soạn/duyệt: chưa chỉ định. File/URL Điều khoản: chưa có bản được duyệt. File/URL Chính sách bảo mật: chưa có bản được duyệt.** Liên kết đăng ký hiện mở màn chờ. Lead cần cung cấp văn bản phản ánh đúng auth, vị trí, liên hệ local, ghi chú, văn bản gửi dịch, dịch vụ nhận giọng/TTS và nhà cung cấp. Không coi checkbox đồng ý hiện tại là bằng chứng người dùng đã được đọc điều khoản hoàn chỉnh.

### E2 — Đơn vị vận hành và xóa tài khoản

**Email hỗ trợ: chưa cung cấp. Tên đơn vị vận hành: chưa cung cấp.** Không lấy email SMTP/admin làm email hỗ trợ nếu chưa được chỉ định.

**Đề xuất: nút khởi tạo xóa tài khoản trong app và trang web yêu cầu xóa ngoài app; email chỉ là kênh hỗ trợ bổ sung.** Google Play yêu cầu đường dẫn trong app và tài nguyên web khi app cho tạo tài khoản ([Google Play](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)). Apple yêu cầu khởi tạo xóa trong app và thông thường không cho chỉ chuyển sang gửi email ([Apple](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)). Truy cập 08/10/2026.

Cần xác thực chủ tài khoản, thu hồi phiên, xử lý dữ liệu liên quan và thông báo phần giữ lại theo nghĩa vụ hợp lệ; “vô hiệu hóa” không đồng nghĩa “xóa”. Đây là yêu cầu cần thiết kế/triển khai và nghiệm thu riêng.

## F. Phát hành và hạ tầng

### F1 — Định danh

| Câu hỏi | Trả lời |
|---|---|
| Android package | Chưa chốt; app.json chưa khai, local env chưa có ANDROID_PACKAGE. Lead chọn reverse-domain thuộc quyền quản lý của nhóm; không dùng định danh dev làm định danh production |
| iOS bundleIdentifier | Chưa chốt; app.json/local env chưa khai. Cần nhóm xác nhận cùng tài khoản signing |
| Tên Be.Travel | Đề xuất giữ |
| Slug `FE` | Đề xuất đổi `betravel` sau khi kiểm tra project EAS và quyền sở hữu; chưa tự đổi/liên kết project |
| Icon/splash | Đề xuất dùng assets đang có cho kiểm thử nội bộ; cần duyệt thương hiệu/chất lượng trước store. Chưa có file thay thế |

### F2 — Hạ tầng

| Câu hỏi | Trả lời |
|---|---|
| Render account/backend URL | Chưa xác minh tài khoản hoặc URL deploy thật; cần chủ dịch vụ cung cấp URL công khai |
| Vercel account/admin URL | Chưa xác minh; không có admin/.env local, nhưng điều đó không chứng minh chưa có deploy/CI secret |
| EAS account/tổ chức | Chưa cung cấp, chưa xác minh đăng nhập hoặc project ownership |
| BACKEND_HEALTH_URL | Chưa xác minh GitHub secret; file workflow không chứng minh secret đã tạo |
| Phát hành đầu tiên | Đề xuất kiểm thử nội bộ APK Android và bản iOS nội bộ phù hợp tài khoản/signing; chưa đưa lên Play/App Store |

`mobile/eas.json` còn URL backend placeholder. Theo Docs chưa có bằng chứng deploy thật đã nghiệm thu. Không đánh dấu “chưa có tài khoản” thay cho “chưa xác minh”. Hướng dẫn Maps cũ trong DEPLOY cần đọc cùng MAPS_SETUP/app.config.js mới; không nhét key thật vào app.json/public docs.

### F3 — Google Maps

**Android key: chưa cấu hình local. iOS key: chưa cấu hình local. Việc đã tạo trên Google Cloud hay chưa: chưa xác minh. Người quản lý Cloud project: chưa cung cấp.** Package/bundle ID cũng chưa có.

Đề xuất Google Maps cho cả hai nền tảng theo yêu cầu trước của bạn. Trong thời gian thiếu key, iOS có thể dùng Apple Maps theo code hiện tại; Android có danh sách/liên kết ngoài. Key cần restriction phù hợp, Maps SDK, billing/cấu hình giới hạn và native rebuild. Chưa xác nhận tile trên máy thật. Xem [MAPS_SETUP.md](MAPS_SETUP.md).

### F4 — Email reset

**Nhận được/không nhận/spam/thời gian: CHƯA THỬ hộp thư thật trong phiên này.** Phản hồi endpoint thành công không chứng minh SMTP đã giao email tới inbox. Nhận định Gmail đã cấu hình trong phiếu chưa thay cho bằng chứng giao nhận.

Đề xuất giữ cấu hình dev hiện tại để kiểm thử, chọn provider production sau khi lead chốt danh tính gửi, domain, khả năng giao nhận và ngân sách. Một tester thử email của chính mình, ghi thời điểm nhận, spam và OTP hết hạn/dùng lại. Không tự gửi email cho người khác.

### F5 — AI và chi phí

**Đề xuất: giữ Gemini, quota 40/người/ngày và 800/toàn hệ thống/ngày.** Local xác nhận Gemini cho LLM/embedding và các quota này. Production cần kiểm cấu hình thực tế. Không tự đổi model đang dùng; quota lượt không phải trần tiền tuyệt đối.

**Cho phép reindex: chưa có phê duyệt mới. Ngân sách 26 câu AI thật: chưa cung cấp/chưa cho phép.** Đề xuất chỉ reindex nội dung đã duyệt sau khi người giữ ngân sách chấp thuận, rồi test thật. Không ghi “chi phí rất nhỏ” thành bảo đảm: số chunks, model, retries và giá provider ảnh hưởng chi phí. Phiên này không gọi embedding/LLM thật.

### F6 — Google login

**Đề xuất: chưa bổ sung UI Google login trong đợt này; giữ email/điện thoại + mật khẩu. OAuth client có hay chưa: chưa xác minh.** Backend đã có `/auth/google` và `/auth/google/link`, nên `GOOGLE_CLIENT_ID` không hoàn toàn là biến thừa. Không nên xóa biến riêng lẻ làm hỏng phần backend. Nếu nhóm quyết bỏ hẳn Google OAuth, cần rà route/service/tests/docs và contract cùng đợt.

## G. Điện thoại thật

Không có bằng chứng nghiệm thu máy thật mới trong phiên. Emulator và unit tests không thay cho các mục dưới đây. Android model/OS: chưa cung cấp. iPhone model/iOS: chưa cung cấp. Người thử/ngày thử: chưa có.

| # | Việc | Android | iPhone | Điều kiện/ghi chú |
|---|---|---|---|---|
| 1 | Share vị trí qua Zalo/SMS | CHƯA THỬ | CHƯA THỬ | GPS thật, hủy/chia sẻ, không suy “đã gửi” chỉ từ mở share sheet |
| 2 | Micro Việt → chữ | CHƯA THỬ | CHƯA THỬ | Native rebuild; recognizer/quyền; đối chiếu B02 |
| 3 | TTS tiếng Hàn | CHƯA THỬ | CHƯA THỬ | Giọng Hàn cài trên máy, âm lượng/silent mode |
| 4 | GPS trong nhà/ngoài trời | CHƯA THỬ | CHƯA THỬ | Timeout, vị trí gần đúng, từ chối quyền; B07 |
| 5 | Status bar khi OS tối | CHƯA THỬ | CHƯA THỬ | App cấu hình light vẫn phải kiểm khả năng đọc; B06 |
| 6 | Header/safe area Explore/Profile | CHƯA THỬ | CHƯA THỬ | Máy notch, nút góc, font lớn; B05 |
| 7 | Bản đồ SOS | CHƯA THỬ | CHƯA THỬ | Key/SDK/billing/ID đúng, tile thật; Apple fallback ghi riêng |
| 8 | Nút gọi 112/ĐSQ | CHƯA THỬ | CHƯA THỬ | Kiểm số trong màn quay số, sửa/duyệt D2; không gọi khẩn cấp chỉ để QA |
| 9 | Mở lần đầu offline | CHƯA THỬ | CHƯA THỬ | Clear cache/test bản cài mới; D4 chưa triển khai bộ offline |
| 10 | Layout 375px | CHƯA THỬ | CHƯA THỬ | iPhone SE/font lớn, bàn phím và cuộn |
| 11 | Reset qua email thật | CHƯA THỬ | CHƯA THỬ | Tester dùng email của mình, ghi inbox/spam/thời gian; F4 |

## H. Ghi chú và ưu tiên tiếp theo

1. Lead xác nhận đổi credential đã lộ và chỉ định người duyệt nội dung, chủ hạ tầng, tester hai nền tảng.
2. Bổ sung báo cáo 22 lỗi để có căn cứ tái hiện; sửa nhãn mã hóa sai, số liên hệ SOS và các luồng chia sẻ/micro/GPS trước mở rộng tính năng.
3. Hoàn thiện dữ liệu KR, điểm SOS thật và bộ số offline có nguồn; duyệt lại nội dung mẫu. Không dùng trạng thái published thay cho bằng chứng review.
4. Chốt định danh/key/URL backend, build native và chạy bảng G. Bổ sung điều khoản, privacy và xóa tài khoản trước store.
5. Mở AI sau dữ liệu/index, ngân sách và kiểm thử thật. Đồng bộ liên hệ, mở nước mới và Google login là các đợt sau khi nhóm chọn rõ.

Những câu chỉ con người/chủ tài khoản có thể trả lời vẫn đã được ghi trạng thái cụ thể, không để trống: tên người duyệt/tester, xác nhận đổi mật khẩu, tài khoản/secret cloud, định danh production, ngân sách và kết quả máy thật. Không bịa câu trả lời “đã làm”.

## Bàn giao phiên này

Main đã cập nhật; các truy vấn DB chỉ đọc. Không sửa code ứng dụng, env, dữ liệu Atlas hoặc phiếu gốc; không chạy seed/reindex, gửi email, gọi AI thật, deploy, push hay merge feature. Bản trả lời được lưu riêng ngoài repository, không commit/push. Người/AI tiếp theo cần coi các đề xuất là chờ nhóm chốt, không tự thực thi từ checkbox/default của phiếu.
