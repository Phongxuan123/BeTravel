import { Alert, Linking } from 'react-native';
import { openPhone, openUrl, toTelUrl } from '../openExternal';

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

// INV-08.6 / INV-13.7 (docs/07_QA_BugHunt.md)
test('chuẩn hóa số gọi: bỏ khoảng trắng, dấu chấm, gạch, ngoặc; giữ dấu +', () => {
  expect(toTelUrl(' +82 (2) 386-6-3101 ')).toBe('tel:+82238663101');
  expect(toTelUrl('1.900.1234')).toBe('tel:19001234');
  expect(toTelUrl('   ')).toBeNull();
  expect(toTelUrl(undefined)).toBeNull();
});

test('thiết bị không gọi được (tablet, simulator) --> thông báo, không ném lỗi', async () => {
  jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
  await expect(openPhone('112')).resolves.toBe(false);
  await expect(openUrl('https://example.org')).resolves.toBe(false);
  expect(Alert.alert).toHaveBeenCalledTimes(2);
});

test('số trống không mở trình gọi', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockReset();
  await expect(openPhone('')).resolves.toBe(false);
  expect(open).not.toHaveBeenCalled();
});
