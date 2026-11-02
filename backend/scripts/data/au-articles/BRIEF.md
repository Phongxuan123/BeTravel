# Brief soan bai cam nang Uc (giai doan 2, tro ly AI ban 2)

Muc dich: bai ngan tieng Viet cho khach du lich/du hoc sinh/nguoi tham than Viet Nam o Uc. Bai
duoc seed o trang thai `draft`; chu du an duyet roi moi xuat ban. Bai la nguon cho AI tra loi.

## Nguyen tac bat buoc

1. KHONG BIA. Moi su that, nhat la con so (tien, so gio, so tuoi, muc phat, han muc), phai doc
   duoc tren mot trang chinh thuc ban da TU FETCH trong phien nay. Khong fetch duoc hoac khong
   thay so tren trang --> bo cau do, ghi vao `unverified`.
2. Nguon chi lay tu trang chinh phu: `*.gov.au` (abf, homeaffairs, tga, agriculture, austrac,
   fairwork, scamwatch, smartraveller, healthdirect, nsw.gov.au, vic.gov.au, transport.nsw.gov.au,
   vicroads...), trang co quan nha nuoc cac bang, Surf Life Saving Australia, va trang chinh thuc
   cua co quan dai dien Viet Nam tai Uc. Khong dung blog, bao, dien dan.
3. Quy dinh cua bang: ghi ro bang nao (uu tien NSW va VIC) va noi "cac bang khac co the khac".
4. Tieng Viet co dau, ngan gon, giong trung tinh, goi "ban". Khong emoji. Ten co quan va ten giay
   to giu tieng Anh trong ngoac lan dau.
5. Khong viet "100% chinh xac" hay lieu tu van phap ly.
6. Chi ghi vao file JSON duoc giao. Khong sua file nao khac trong repo.

## Dinh dang moi bai (mang JSON, UTF-8)

```json
{
  "topicSlug": "hai-quan",
  "slug": "khai-bao-tien-mat",
  "title": "Tieu de ngan, ro tinh huong",
  "summaryVi": "2-3 cau tra loi thang van de chinh.",
  "keyPoints": [{ "text": "...", "severity": "normal" }],
  "penalties": [{ "behavior": "...", "amountText": "...", "currency": "AUD", "note": "nguon: ..." }],
  "exceptions": [],
  "foreignerNotes": ["luu y rieng cho nguoi Viet / khach nuoc ngoai"],
  "sources": [{ "title": "...", "url": "https://...", "authority": "Australian Border Force", "kind": "gov", "accessedAt": "2026-11-02" }],
  "riskLevel": "info",
  "tags": ["..."],
  "verification": [{ "claim": "cau/so trong bai", "url": "trang chua no", "quote": "trich nguyen van tieng Anh ngan" }],
  "unverified": ["dieu muon viet nhung khong xac minh duoc"]
}
```

- `severity`: `normal` hoac `criminal` (vi pham hinh su). `riskLevel`: `info`, `warn`, `danger`.
- 3-6 keyPoints, moi y 1 cau. `penalties` chi khi co so tren trang chinh thuc, de mang rong neu khong.
- `verification` phai co cho MOI con so va moi khang dinh phap ly quan trong.
- topicSlug hop le: `nhap-canh`, `hai-quan`, `giao-thong`, `noi-cong-cong`, `khan-cap`, `y-te`,
  `hoc-tap-lam-viec`, `nha-o`.
