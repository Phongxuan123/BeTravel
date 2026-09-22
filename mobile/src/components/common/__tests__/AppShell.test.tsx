import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { AppShell } from '../AppShell';

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('AppShell (BottomNav + nút SOS)', () => {
  it('hiển thị đủ 4 tab điều hướng và nút SOS luôn có nhãn "Khẩn cấp"', async () => {
    const { getByText, getByLabelText } = await render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <AppShell active="home">
          <Text>nội dung</Text>
        </AppShell>
      </SafeAreaProvider>,
    );
    expect(getByText('Trang chủ')).toBeTruthy();
    expect(getByText('Khám phá')).toBeTruthy();
    expect(getByText('AI Legal')).toBeTruthy();
    expect(getByText('Cá nhân')).toBeTruthy();
    expect(getByLabelText('Khẩn cấp — mở SOS Hub')).toBeTruthy();
    expect(getByText('Khẩn cấp')).toBeTruthy();
  });
});
