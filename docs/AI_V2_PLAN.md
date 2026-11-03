# KE HOACH TRO LY AI BAN 2 (UC)

Nguon quyet dinh: bang trac nghiem nguoi dung chon ngay 02/11/2026 (56/58 cau, file
`docs/ai-plan.html`, khong commit). Tai lieu nay la ban chot de code theo; doi quyet dinh thi
sua o day truoc.

## 1. Vi sao ban 1 that bai

| Trieu chung nguoi dung che | Nguyen nhan goc | Ban 2 xu ly bang |
|---|---|---|
| Cau nao cung "khong biet" | Kho Uc 0 bai cam nang, chi co luat lien bang; nguong RAG cung --> tu choi | B1-d: kho --> tra gov.au --> kien thuc chung co nhan; B7: soan 20-30 bai cam nang |
| Tra loi mot khoi to | The co dinh nhieu muc | C1-C3: dong dau tra loi thang, gach dau dong, duoi 80 tu |
| Lap lung | Prompt ep "chi noi khi co nguon" | R1: cau dau tra loi thang; nhan do tin cay thay cho rao don |
| Giao dien la | The rieng, khong giong AI quen dung | E1: giong ChatGPT/Claude |
| Loi chi lo khi ra mat | Khong do truoc | F1-F2: bo 50 cau + so mu, nguong 60% |

## 2. Quyet dinh da chot

**Pham vi**
- Vai tro: tro ly phap ly va an toan cho chuyen di Uc (A1).
- Tra loi: luat lien bang, quy dinh bang, visa/nhap canh/hai quan, khan cap, van hoa, thong tin
  du lich chung (A2).
- Ngoai pham vi (vd nau an): tu choi ngan, noi ro chi ho tro chu de chuyen di (A3).
- Nguoi dung: khach du lich ngan ngay, du hoc sinh, nguoi tham than/lon tuoi (A4).
- Ngon ngu: theo ngon ngu nguoi hoi (A5).

**Nguon va do tin cay**
- Thu tu tang: (1) kho da kiem chung (bai cam nang + luat lien bang + du lieu app) -->
  (2) tra web luc hoi, uu tien gov.au, cho phep web tong quat (B2) --> (3) kien thuc chung cua
  mo hinh (B1-d).
- Chi tu choi khi cau hoi nham lam dieu nguy hiem/pham phap (B3). Muc tieu tu choi < 5% (R6).
- Nhan do tin cay 3 muc tren moi cau tra loi: Nguon chinh thuc / Tra cuu web / Kien thuc chung (B4).
  Khong bat buoc tach doan theo nguon (R4 bo).
- Con so (muc phat, nguong tien, so nam tu): chi neu khi co trich dan; khong co thi noi can kiem
  tra + dua link (B5). Hau kiem bang code. **Noi 03/11/2026:** so thong thuong khong phai luat
  (nhiet do, thoi gian, khoang cach, thoi han luu tru pho bien) duoc neu theo hieu biet chung;
  so phap ly van bat buoc co nguon (guard.js khong doi).
- Luat bang: tra loi chung + ghi chu "moi bang co the khac" (B6).
- Khong bao gio bia nguon: [n] chi tro toi nguon that da lay ve, code xoa so sai (R3).
- Chi noi dung published + isCurrent (R5). Khong cam ket "100% chinh xac" (R7).

**Hinh thuc**
- Dong dau tra loi thang, vai gach dau dong, cuoi la "Nen lam gi tiep" (C1).
- Ngan duoi 80 tu (**noi len 120 tu ngay 03/11/2026**, env `ASSISTANT_WORD_LIMIT`) + nut "Giai thich chi tiet hon" (C2). Chi in dam va danh sach (C3).
- Trich dan so nho [1] trong cau, danh sach nguon thu gon cuoi (C4).
- Loi mien tru: mot lan o man hinh chat, khong lap lai moi cau (C5).
- Goi "ban", khong xung (C6). Khong goi y cau tiep theo (C7). Khong nut hanh dong (C8),
  TRU nut goi 000 khi nguy hiem (D5).

**Hoi thoai**
- Nho ngu canh trong cuoc tro chuyen (D1).
- Dung thong tin chuyen di, hien cho nguoi dung thay va tat duoc (D2).
- Cau mo ho: tra loi phan chac chan, roi hoi lai mot cau kem nut chon nhanh (D3).
- Lich su luu server theo tai khoan, xem lai/xoa duoc (D4); tu xoa sau 90 ngay (H2).
- Tinh huong nguy hiem: nut goi 000 o dau cau tra loi (D5).

**Giao dien**
- Kieu ChatGPT/Claude: cau hoi trong bong bong, cau tra loi trai rong (E1).
- Cho: vong quay don gian, khong streaming (E2). Man trong: chi o nhap (E3).
- Chi go chu (E4). Thao tac: sao chep, tra loi lai (E5).
- Loi vao: tab "Tro ly AI" + o "AI phap ly" o Trang chu; go cac loi vao khac (E6).

**Do luong, mo hinh, van hanh**
- Truoc ra mat: bo 50 cau that + cham theo tieu chi + so mu voi ChatGPT/Claude boi 3-5 nguoi
  ngoai nhom (F1, F3). Nguong: thang/hoa >= 60% va 0 cau sai con so (F2).
- Khong co nut danh gia trong app (F4).
- Theo doi: chi phi/ngay, thoi gian phan hoi, ty le tu choi (F5).
- Mo hinh: manh cho cau tra loi, re cho buoc phu (G1). Nha cung cap: nguoi dung cung cap khi toi
  buoc nay (G2). Cho < 10 giay (G3). 40 cau/ngay/nguoi (G4). Bat buoc dang nhap (G5).
- Admin: xem hoi-dap (an thong tin ca nhan), cong tac tat nhanh, bieu do chi phi + luot hoi (H1).
- Du lieu chat ban cu tren Atlas: xoa het (H3) --> `npm run purge-legacy-chat`.
- Thu thang tren app (I2), mo cho tat ca cung luc (I3), thoi han 2 tuan (I4).
- Chi cho nguoi dung thay man hinh moi sau khi nguoi dung (chu du an) tu thu va dong y (R10).
- Moi nguong, ten mo hinh, han muc qua env (R9).

## 3. Diem mau thuan

1. **F4 vs F5/H1 -- DA CHOT 02/11/2026:** khong co nut danh gia; bo "ty le huu ich" (F5) va
   "hang cho cau bi danh gia khong huu ich" (H1).
2. **B2 co "web tong quat".** Dang lam: tra web uu tien gov.au, chap nhan trang khac nhung gan
   nhan "Tra cuu web" va khong dung trang khong phai gov.au lam nguon cho con so (B5).
3. **G2 -- DA CHOT 02/11/2026:** dung APIZ (`OPENAI_BASE_URL=https://api.apiz.vn/v1`, giao thuc
   OpenAI, `LLM_PROVIDER=openai`). Cau hinh hien tai: `LLM_MODEL=gpt-6.1-sol` (tra loi),
   `QUERY_REWRITE_MODEL=gpt-6-luna` (buoc phu). `/v1/models` ngay 02/11/2026 co 38 mo hinh, gom ca
   claude-opus-5-5 / claude-sonnet-5-5 / gemini-3.1-pro-preview -- giai doan 3 so sanh tren bo 50 cau
   roi chon (G1: manh cho tra loi, re cho buoc phu). APIZ KHONG co mo hinh embedding trong danh sach;
   `EMBEDDING_PROVIDER` dang `mock` -- can quyet dinh o giai doan 3.
   **Chot 02/11/2026:** `ASSISTANT_MODEL=gpt-6-luna` (1.200/7.200 d moi 1M token, ~3-4 d/cau; 2 lan
   chay 8 cau deu 8/8, 0 loi, p50 7-9 s). claude-sonnet-5-5 dat gap ~7,5 lan va lan chay thu hai qua
   APIZ loi 3/8. Khong dung embedding (APIZ khong co mo hinh embedding): giu tim theo tu khoa.

## 4. Thay doi so voi CLAUDE.md cu

- Bo "tu choi khi khong du du lieu" (Phan 1, Phan 3.2, Phan 4.2 buoc 3). Thay bang tang nguon co nhan.
- Disclaimer khong gan vao moi cau tra loi (Phan 4.2 buoc 5c) -- hien mot lan tren man chat.
- Giu nguyen: loc published + isCurrent, hau kiem marker [n], hau kiem con so, khong streaming,
  ai_events, quota luu DB.

## 5. Giai doan

| GD | Viec | Ket qua nghiem thu |
|---|---|---|
| 1 | Ke hoach nay; cap nhat CLAUDE.md; bo 50 cau + bang cham (`backend/eval/au-v2/`); script xoa du lieu chat cu | Nguoi dung duyet bo cau hoi |
| 2 | Soan nhap 20-30 bai cam nang Uc tu trang gov.au that, trang thai `draft` (B7) | Nguoi dung duyet va xuat ban trong Admin |
| 3 | Backend `/api/assistant/*`: hoi thoai, tang nguon, tra web, nhan do tin cay, hau kiem, lich su + TTL 90 ngay, quota, kill switch, ai_events | Chay that bo 50 cau; ty le tu choi < 5%; 0 cau sai con so; p50 < 10 giay |
| 4 | So mu voi ChatGPT/Claude (3-5 nguoi) | Thang/hoa >= 60% |
| 5 | Man hinh chat mobile kieu ChatGPT, loi vao tab + Trang chu, nut 000, sao chep/tra loi lai | Nguoi dung tu thu tren may va dong y (R10) |
| 6 | Admin: xem hoi-dap, kill switch, bieu do chi phi | Mo cho tat ca |

**Ket qua so mu tam thoi 02/11/2026** (10 agent, chua phai 3-5 nguoi that): vong 2 thang 41%,
thang+hoa 44% -- duoi nguong 60%. Chi tiet va nguyen nhan: `docs/PROGRESS.md`. Hai don bay lon nhat
deu dung vao quyet dinh da chot (C2 duoi 80 tu, B5 khong so khi khong nguon) --> nguoi dung da chot noi ca hai ngay 03/11/2026.

Rang buoc ky thuat giu nguyen: contract truoc code (`contracts/README.md`), envelope + ErrorCode
dong, khong hard-code quoc gia/mo hinh/nguong, chi Uc dang `active` nhung code van country-driven.
