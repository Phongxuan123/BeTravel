import { __setNowForTest, daysBetween, now, parseISODate } from '../date';
import { formatFullDate, formatShortDate, formatTripRange, tripDurationDays } from '../format';
import { isPasswordValid, passwordValidationMessage } from '../password';

describe('date', () => {
  afterEach(() => __setNowForTest(null));

  it('now() cat ve 00:00 va ton trong gia tri co dinh cho test', () => {
    __setNowForTest(new Date(2026, 8, 28, 15, 30));
    const today = now();
    expect(today.getFullYear()).toBe(2026);
    expect(today.getMonth()).toBe(8);
    expect(today.getDate()).toBe(28);
    expect(today.getHours()).toBe(0);
  });

  it('now() tra ban sao, sua ket qua khong lam doi gia tri co dinh', () => {
    __setNowForTest(new Date(2026, 0, 1));
    now().setFullYear(1999);
    expect(now().getFullYear()).toBe(2026);
  });

  it('daysBetween bo qua gio trong ngay va co dau', () => {
    expect(daysBetween(new Date(2026, 0, 1, 23), new Date(2026, 0, 3, 1))).toBe(2);
    expect(daysBetween(new Date(2026, 0, 3), new Date(2026, 0, 1))).toBe(-2);
  });

  it('parseISODate doc ngay theo gio dia phuong', () => {
    const date = parseISODate('2026-02-28');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 1, 28, 0,
    ]);
  });
});

describe('format', () => {
  it('dinh dang ngay ngan, day du va khoang chuyen di', () => {
    expect(formatShortDate('2026-10-05')).toBe('05/10');
    expect(formatFullDate('2026-10-05')).toBe('05/10/2026');
    expect(formatTripRange('2026-10-05', '2026-10-09')).toBe('05/10 – 09/10');
  });

  it('tripDurationDays tinh ca ngay dau va ngay cuoi', () => {
    expect(tripDurationDays('2026-10-05', '2026-10-05')).toBe(1);
    expect(tripDurationDays('2026-10-05', '2026-10-09')).toBe(5);
    expect(tripDurationDays('2026-12-30', '2027-01-02')).toBe(4);
  });
});

describe('password', () => {
  it.each([
    ['Ab1', 'Mật khẩu phải có ít nhất 8 ký tự.'],
    ['abcdefg1', 'Mật khẩu cần ít nhất 1 chữ hoa.'],
    ['ABCDEFG1', 'Mật khẩu cần ít nhất 1 chữ thường.'],
    ['Abcdefgh', 'Mật khẩu cần ít nhất 1 chữ số.'],
    [`Ab1${'x'.repeat(126)}`, 'Mật khẩu tối đa 128 ký tự.'],
  ])('tu choi %s', (password, message) => {
    expect(passwordValidationMessage(password)).toBe(message);
    expect(isPasswordValid(password)).toBe(false);
  });

  it('chap nhan mat khau hop le o bien 8 va 128 ky tu', () => {
    expect(isPasswordValid('Matkhau1')).toBe(true);
    expect(isPasswordValid(`Ab1${'x'.repeat(125)}`)).toBe(true);
  });
});
