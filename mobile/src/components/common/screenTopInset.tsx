import { createContext, useContext } from 'react';
import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
 * Khoảng trống phía trên mà header của màn hình phải chừa cho thanh trạng thái. Khi AppShell
 * đang hiện banner cảnh báo, chính banner đã chiếm vùng thanh trạng thái nên AppShell đặt giá
 * trị 0 -- nếu không header sẽ chừa thêm lần nữa và tạo khoảng trắng thừa.
 */
const TopInsetOverride = createContext<number | null>(null);

export const TopInsetProvider = TopInsetOverride.Provider;

export function useScreenTopInset(): number {
  const override = useContext(TopInsetOverride);
  const insets = useSafeAreaInsets();
  return override ?? insets.top;
}

/**
 * View chừa sẵn khoảng trên. Màn hình dùng AppShell phải render component này BÊN TRONG
 * AppShell: gọi useScreenTopInset ở thân màn hình sẽ nằm ngoài Provider và bỏ qua banner.
 */
export function TopInsetView({ extra = 0, style, ...rest }: ViewProps & { extra?: number }) {
  const topInset = useScreenTopInset();
  return <View {...rest} style={[style, { paddingTop: topInset + extra }]} />;
}
