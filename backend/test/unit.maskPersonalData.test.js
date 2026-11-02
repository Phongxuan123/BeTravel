import { test } from "node:test";
import assert from "node:assert/strict";

import { MaskLabel, maskPersonalData } from "../src/utils/maskPersonalData.js";

/*
 * Bo an thong tin ca nhan cho nhat ky hoi-dap Admin (H1) -- phan nhay cam ve quyen rieng tu:
 * lot mot so dien thoai/ho chieu la su co, nen chot tung dang bang test.
 */

test("an email", () => {
  assert.equal(
    maskPersonalData("Gửi về nguyen.van-a+trip@mail.example.com.vn giúp tôi"),
    `Gửi về ${MaskLabel.EMAIL} giúp tôi`,
  );
});

test("an so dien thoai VN va Uc, co hoac khong co dau phan cach", () => {
  const cases = [
    "0901234567",
    "090 123 4567",
    "091.234.5678",
    "041.234.567",
    "+84 901 234 567",
    "+61 412 345 678",
    "(02) 6261 3305",
    "0412-345-678",
  ];
  for (const phone of cases) {
    assert.equal(maskPersonalData(`Số tôi là ${phone}.`), `Số tôi là ${MaskLabel.PHONE}.`, phone);
  }
});

test("an so ho chieu / giay to", () => {
  assert.equal(maskPersonalData("Hộ chiếu C1234567"), `Hộ chiếu ${MaskLabel.PASSPORT}`);
  assert.equal(
    maskPersonalData("passport PA1234567 hết hạn"),
    `passport ${MaskLabel.PASSPORT} hết hạn`,
  );
  assert.equal(maskPersonalData("số n12345678"), `số ${MaskLabel.PASSPORT}`);
});

test("an day so dai: so the, so tai khoan, CCCD", () => {
  assert.equal(maskPersonalData("Thẻ 4111 1111 1111 1111"), `Thẻ ${MaskLabel.NUMBER}`);
  assert.equal(maskPersonalData("Thẻ 4111-1111-1111-1111"), `Thẻ ${MaskLabel.NUMBER}`);
  assert.equal(maskPersonalData("STK 19034567890123"), `STK ${MaskLabel.NUMBER}`);
  assert.equal(maskPersonalData("CCCD 001203004567"), `CCCD ${MaskLabel.NUMBER}`);
});

test("giu nguyen so khan cap, so dich vu ngan va tong dai 1300/1800", () => {
  const publicText =
    "Gọi 000 hoặc 112. Thông dịch TIS: 131 450. Tư vấn 13 11 14. Hải quan 1300 363 263, " +
    "Lifeline 1800 020 080.";
  assert.equal(maskPersonalData(publicText), publicText);
});

test("giu nguyen ngay thang, khoang nam, so tien va trich dan", () => {
  const text =
    "Từ 2026-11-02 (02.11.2026), giai đoạn 2020-2026, mang từ 10.000 AUD hoặc " +
    "10.000.000 đồng thì khai báo [1]. Luật C2004A01918 Điều 233.";
  assert.equal(maskPersonalData(text), text);
});

test("van ban rong hoac thieu tra chuoi rong", () => {
  assert.equal(maskPersonalData(""), "");
  assert.equal(maskPersonalData(null), "");
  assert.equal(maskPersonalData(undefined), "");
});
