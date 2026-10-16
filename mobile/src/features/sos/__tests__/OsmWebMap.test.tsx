import { act, render } from '@testing-library/react-native';
import { OsmWebMap } from '../OsmWebMap';

let mockProps: any;
const mockInject = jest.fn();
jest.mock('react-native-webview', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { WebView: React.forwardRef(function MockWebView(props: any, ref: any) {
    mockProps = props;
    React.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
    return <View />;
  }) };
});
jest.mock('@/lib/openExternal', () => ({ openUrl: jest.fn() }));

test('WebView chờ ô bản đồ trước khi báo ready; lỗi WebView chuyển lên màn hình', async () => {
  const onReady = jest.fn();
  const onError = jest.fn();
  await render(<OsmWebMap center={{ lat: 10, lng: 106 }} delta={0.1}
    markers={[{ id: 'me', lat: 10, lng: 106, color: '#fff', kind: 'me' }]}
    onReady={onReady} onError={onError} onMarkerPress={jest.fn()} />);
  expect(mockProps.originWhitelist).toEqual(['*']);
  await act(async () => { mockProps.onMessage({ nativeEvent: { data: '{"type":"initialized"}' } }); });
  expect(mockInject).toHaveBeenCalledWith(expect.stringContaining('window.setMarkers'));
  expect(onReady).not.toHaveBeenCalled();
  await act(async () => { mockProps.onMessage({ nativeEvent: { data: '{"type":"ready"}' } }); });
  expect(onReady).toHaveBeenCalledTimes(1);
  await act(async () => { mockProps.onError(); });
  expect(onError).toHaveBeenCalledWith(expect.stringContaining('Không mở được bản đồ'));
  expect(mockProps.onShouldStartLoadWithRequest({ url: 'javascript:alert(1)', navigationType: 'click' })).toBe(false);
});
