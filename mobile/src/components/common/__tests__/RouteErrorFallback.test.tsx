import { fireEvent, render } from '@testing-library/react-native';
import { RouteErrorFallback } from '../RouteErrorFallback';
import * as RootLayoutModule from '@/app/_layout';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() }, Stack: () => null }));
// _layout import stylesheet NativeWind -- Jest khong parse duoc CSS.
jest.mock('@/styles/global.css', () => ({}));

// INV-13.3 (docs/07_QA_BugHunt.md): loi render o mot man hinh khong duoc lam
// sap ca app -- man loi phai cho thu lai va mo SOS (tinh nang an toan).
test('màn lỗi cho thử lại và mở SOS, không lộ thông điệp lỗi kỹ thuật', async () => {
  const retry = jest.fn();
  const screen = await render(<RouteErrorFallback error={new Error('Cannot read x of undefined')} retry={retry} />);
  expect(screen.queryByText(/Cannot read/)).toBeNull();
  await fireEvent.press(screen.getByText('Thử lại'));
  expect(retry).toHaveBeenCalledTimes(1);
  const { router } = jest.requireMock('expo-router') as { router: { push: jest.Mock } };
  await fireEvent.press(screen.getByText('Mở SOS khẩn cấp'));
  expect(router.push).toHaveBeenCalledWith('/sos');
});

// Expo Router chi boc route bang Error Boundary khi file route/layout export
// `ErrorBoundary` -- kiem tra layout goc thuc su export no.
test('layout gốc export ErrorBoundary cho mọi route', () => {
  expect(RootLayoutModule.ErrorBoundary).toBe(RouteErrorFallback);
});
