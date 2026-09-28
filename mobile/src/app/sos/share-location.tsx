import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, Linking, ScrollView, Share, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { buildLocationMessage, isFreshLocation, type LocationSnapshot } from '@/features/sos/locationShare';

export default function ShareLocationScreen() {
  const [snapshot, setSnapshot] = useState<LocationSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState('');
  const [settingsNeeded, setSettingsNeeded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const generation = useRef(0);
  const locating = useRef(false);
  const shareLock = useRef(false);
  const mounted = useRef(true);

  useFocusEffect(useCallback(() => {
    mounted.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      // Không giữ tọa độ sau khi rời ứng dụng. Dialog cấp quyền có thể là inactive.
      if (state === 'background') {
        generation.current += 1;
        locating.current = false;
        setBusy(false);
        setSnapshot(null);
      }
    });
    return () => {
      mounted.current = false;
      generation.current += 1;
      locating.current = false;
      setBusy(false);
      setSnapshot(null);
      clearInterval(timer);
      subscription.remove();
    };
  }, []));

  const cancel = () => {
    generation.current += 1;
    locating.current = false;
    setBusy(false);
    setSnapshot(null);
    setMessage('Đã hủy lấy vị trí. Chưa chia sẻ dữ liệu.');
  };

  const locate = async () => {
    if (locating.current || shareLock.current) return;
    locating.current = true;
    const request = ++generation.current;
    const active = () => mounted.current && request === generation.current;
    setBusy(true);
    setSnapshot(null);
    setMessage('');
    setSettingsNeeded(false);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!active()) return;
      if (permission.status !== 'granted') {
        setSettingsNeeded(!permission.canAskAgain);
        throw new Error('Chưa được cấp quyền vị trí. Bạn có thể thử lại hoặc bật quyền trong cài đặt.');
      }
      if (!await Location.hasServicesEnabledAsync()) {
        if (active()) setSettingsNeeded(true);
        throw new Error('Dịch vụ vị trí đang tắt. Hãy bật GPS trong cài đặt điện thoại.');
      }
      if (!active()) return;
      // Timeout chỉ bỏ kết quả đến muộn; không tạo watcher hay theo dõi nền.
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('GPS chưa trả kết quả sau 20 giây. Hãy ra nơi thoáng và thử lại.')), 20_000);
        }),
      ]);
      if (!active()) return;
      const value = { latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, timestamp: position.timestamp };
      buildLocationMessage(value);
      setNow(Date.now());
      setSnapshot(value);
    } catch (error) {
      if (active()) setMessage(error instanceof Error ? error.message : 'Không lấy được vị trí. Hãy thử lại.');
    } finally {
      if (timeout) clearTimeout(timeout);
      if (active()) { locating.current = false; setBusy(false); }
    }
  };

  const share = async () => {
    if (!snapshot || shareLock.current) return;
    shareLock.current = true;
    setSharing(true);
    try {
      const result = await Share.share({ title: 'Vị trí của tôi', message: buildLocationMessage(snapshot) });
      if (mounted.current) setMessage(result.action === Share.dismissedAction
        ? 'Đã hủy bảng chia sẻ.'
        : 'Đã mở bảng chia sẻ. Hãy kiểm tra tin nhắn trong ứng dụng đã chọn; BeTravel không xác nhận được người thân đã nhận.');
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : 'Không mở được bảng chia sẻ. Vui lòng thử lại.');
    } finally {
      shareLock.current = false;
      if (mounted.current) setSharing(false);
    }
  };

  const fresh = snapshot !== null && isFreshLocation(snapshot, now);
  return (
    <View className="flex-1 bg-bg">
      <PageHeader title="Chia sẻ vị trí" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48, gap: 18 }}>
        <Text className="text-xl font-body-bold text-ink">Để người thân biết bạn đang ở đâu</Text>
        <Text className="text-base leading-6 text-muted">
          1. Cho phép lấy vị trí một lần.{'\n'}2. Kiểm tra tọa độ, thời gian và sai số.{'\n'}3. Chọn Zalo, tin nhắn hoặc ứng dụng có trên máy, chọn người nhận rồi bấm gửi trong ứng dụng đó.
        </Text>
        <Text className="text-sm leading-5 text-muted">
          Chỉ lấy GPS khi bạn bấm nút dưới đây. BeTravel không lưu tọa độ lên máy chủ, không tự gửi cho liên hệ khẩn cấp và không theo dõi nền. Người nhận mở liên kết bản đồ, không cần cài BeTravel. Việc gửi tin và mở bản đồ phụ thuộc kết nối của ứng dụng đã chọn.
        </Text>
        <Button label={busy ? 'Đang lấy GPS…' : snapshot ? 'Lấy lại vị trí' : 'Lấy vị trí của tôi'} loading={busy} disabled={sharing} onPress={() => { void locate(); }} />
        {busy && <Button label="Hủy lấy vị trí" variant="secondary" onPress={cancel} />}
        {snapshot && (
          <View className="gap-3 rounded-lg border border-line bg-surface p-4">
            <Text className="text-base font-body-bold text-ink">Vị trí tại thời điểm đo</Text>
            <Text selectable className="text-sm text-ink">{snapshot.latitude.toFixed(6)}, {snapshot.longitude.toFixed(6)}</Text>
            <Text className="text-sm text-muted">{new Date(snapshot.timestamp).toLocaleString('vi-VN')} (giờ thiết bị)</Text>
            <Text className="text-sm text-muted">{snapshot.accuracy !== null && Number.isFinite(snapshot.accuracy) && snapshot.accuracy >= 0
              ? `Sai số ước tính: ${Math.ceil(snapshot.accuracy)} m${snapshot.accuracy > 100 ? ' — vị trí có thể chưa chính xác, nên lấy lại GPS.' : '.'}`
              : 'Chưa xác định được sai số GPS.'}</Text>
            <Text className="text-sm text-muted">{fresh ? 'Liên kết gửi đi giữ nguyên vị trí này, không cập nhật khi bạn di chuyển.' : 'Vị trí đã quá 60 giây. Hãy lấy lại trước khi chia sẻ.'}</Text>
            <Button label="Chọn ứng dụng và người nhận" disabled={!fresh} loading={sharing} onPress={share} />
            <Button label="Xóa vị trí đang hiển thị" variant="secondary" disabled={sharing} onPress={() => setSnapshot(null)} />
          </View>
        )}
        {!!message && <Text accessibilityLiveRegion="polite" className="text-base text-ink">{message}</Text>}
        {settingsNeeded && <Button label="Mở cài đặt điện thoại" variant="secondary" onPress={() => {
          void Linking.openSettings().catch(() => setMessage('Không mở được cài đặt. Hãy mở Cài đặt điện thoại và kiểm tra quyền vị trí của BeTravel.'));
        }} />}
        <Text className="text-sm leading-5 text-muted">Chỉ gửi cho người bạn tin tưởng. Người nhận có thể chuyển tiếp liên kết; BeTravel không thu hồi được tin đã gửi. Nếu cần người thân xem vị trí mới, hãy lấy lại GPS và gửi lại.</Text>
      </ScrollView>
    </View>
  );
}
