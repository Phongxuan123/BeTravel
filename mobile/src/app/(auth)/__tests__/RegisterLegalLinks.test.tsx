import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import RegisterScreen from '@/app/(auth)/register';

// Van ban Dieu khoan / Chinh sach bao mat chua co: hai lien ket phai mo man
// chan "dang hoan thien" thay vi la chu khong bam duoc.
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ register: jest.fn() }) }));

test('bam "Điều khoản" va "Chính sách bảo mật" mo man chan co dung tieu de', async () => {
  const screen = await render(<RegisterScreen />);

  await fireEvent.press(screen.getByText('Điều khoản'));
  expect(router.push).toHaveBeenLastCalledWith(
    expect.objectContaining({ pathname: '/coming-soon', params: expect.objectContaining({ title: 'Điều khoản sử dụng' }) }),
  );

  await fireEvent.press(screen.getByText('Chính sách bảo mật'));
  expect(router.push).toHaveBeenLastCalledWith(
    expect.objectContaining({ pathname: '/coming-soon', params: expect.objectContaining({ title: 'Chính sách bảo mật' }) }),
  );
});
