// Key được nạp lúc build native; không đưa giá trị key vào extra/public JS.
module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  if (androidGoogleMapsApiKey && !/^AIza[\w-]{35}$/.test(androidGoogleMapsApiKey)) {
    throw new Error('GOOGLE_MAPS_ANDROID_API_KEY không hợp lệ; hãy bỏ key mẫu.');
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
      ['react-native-maps', { ...(androidGoogleMapsApiKey ? { androidGoogleMapsApiKey } : {}) }],
    ],
    extra: { ...config.extra, androidMapsConfigured: Boolean(androidGoogleMapsApiKey) },
  };
};
