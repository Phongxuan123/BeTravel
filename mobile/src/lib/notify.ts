import { Alert, Platform, ToastAndroid } from 'react-native';

/** Thông báo ngắn không chặn thao tác: toast trên Android, hộp thoại nhỏ trên iOS. */
export function notify(message: string): void {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert(message);
}
