// Key được nạp lúc build native; không đưa giá trị key vào extra/public JS.
module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  const iosGoogleMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY?.trim();
  const androidPackage = process.env.ANDROID_PACKAGE?.trim() || config.android?.package;
  const iosBundleIdentifier = process.env.IOS_BUNDLE_IDENTIFIER?.trim() || config.ios?.bundleIdentifier;
  if (iosGoogleMapsApiKey && !/^AIza[\w-]{35}$/.test(iosGoogleMapsApiKey)) throw new Error('GOOGLE_MAPS_IOS_API_KEY không hợp lệ.');
  if (androidGoogleMapsApiKey && !/^AIza[\w-]{35}$/.test(androidGoogleMapsApiKey)) {
    throw new Error('GOOGLE_MAPS_ANDROID_API_KEY không hợp lệ; hãy bỏ key mẫu.');
  }
  if (androidGoogleMapsApiKey && !/^[A-Za-z]\w*(\.[A-Za-z]\w*)+$/.test(androidPackage ?? '')) {
    throw new Error('Google Maps Android cần ANDROID_PACKAGE hợp lệ trước khi build.');
  }
  if (iosGoogleMapsApiKey && !/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(iosBundleIdentifier ?? '')) {
    throw new Error('Google Maps iOS cần IOS_BUNDLE_IDENTIFIER hợp lệ trước khi build.');
  }
  return {
    ...config,
    android: {
      ...config.android,
      ...(process.env.ANDROID_PACKAGE ? { package: process.env.ANDROID_PACKAGE.trim() } : {}),
    },
    ios: {
      ...config.ios,
      ...(process.env.IOS_BUNDLE_IDENTIFIER
        ? { bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER.trim() } : {}),
    },
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', { ...(androidGoogleMapsApiKey ? { androidGoogleMapsApiKey } : {}),
        ...(iosGoogleMapsApiKey ? { iosGoogleMapsApiKey } : {}) }],
    ],
    extra: { ...config.extra, androidMapsConfigured: Boolean(androidGoogleMapsApiKey), iosGoogleMapsConfigured: Boolean(iosGoogleMapsApiKey) },
  };
};
