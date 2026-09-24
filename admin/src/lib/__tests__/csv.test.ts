import { describe, expect, it } from 'vitest';
import { parseLocationsCsv } from '../csv';

// Bug that phat hien khi chuan bi docs/sos-locations-template.csv: dia chi
// thuc te thuong chua dau phay ("123 Bukchon-ro, Jongno-gu, Seoul") -- parser
// tach theo dau phay don gian se cat sai cot. Test bang dung file CSV mau do.
describe('parseLocationsCsv', () => {
  it('xu ly dung truong boc trong dau nhay kep co chua dau phay ben trong', () => {
    const csv = [
      'countryCode,type,name,nameLocal,address,phone,website,openHours,lat,lng,verified',
      'KR,embassy,Dai su quan Viet Nam,,"123 Bukchon-ro, Jongno-gu, Seoul",+82-2-720-5510,,,,,,false',
    ].join('\n');

    const rows = parseLocationsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].address).toBe('123 Bukchon-ro, Jongno-gu, Seoul');
    expect(rows[0].phone).toBe('+82-2-720-5510');
    expect(rows[0].verified).toBe(false);
  });

  it('gan location khi co lat/lng hop le, bo qua khi thieu', () => {
    const csv = [
      'countryCode,type,name,nameLocal,address,phone,website,openHours,lat,lng,verified',
      'KR,police,Don A,,Seoul,112,,,37.5,127.0,true',
      'KR,police,Don B,,Seoul,112,,,,,false',
    ].join('\n');

    const rows = parseLocationsCsv(csv);
    expect(rows[0].location).toEqual({ type: 'Point', coordinates: [127.0, 37.5] });
    expect(rows[1].location).toBeUndefined();
  });

  it('tra mang rong khi chi co dong header', () => {
    expect(parseLocationsCsv('countryCode,type,name')).toEqual([]);
  });
});
