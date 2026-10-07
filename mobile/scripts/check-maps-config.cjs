const path = require('node:path');

function checkMapsConfig(source, platform = 'all') {
  const platforms = platform === 'all' ? ['android', 'ios'] : [platform];
  if (platforms.some((item) => !['android', 'ios'].includes(item))) throw new Error('Dùng --platform android, ios hoặc all.');
  return platforms.map((item) => {
    const android = item === 'android';
    const keyName = android ? 'GOOGLE_MAPS_ANDROID_API_KEY' : 'GOOGLE_MAPS_IOS_API_KEY';
    const idName = android ? 'ANDROID_PACKAGE' : 'IOS_BUNDLE_IDENTIFIER';
    const key = source[keyName]?.trim() ?? '';
    const id = source[idName]?.trim() ?? '';
    const problems = [];
    if (!/^AIza[\w-]{35}$/.test(key)) problems.push(`Thiếu hoặc sai định dạng ${keyName}`);
    const idPattern = android ? /^[A-Za-z]\w*(\.[A-Za-z]\w*)+$/ : /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
    if (!idPattern.test(id)) problems.push(`Thiếu hoặc sai định dạng ${idName}`);
    return { platform: item, readyForBuild: problems.length === 0, problems };
  });
}

module.exports = { checkMapsConfig };

if (require.main === module) {
  try {
    try { process.loadEnvFile(path.join(__dirname, '../.env')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const option = process.argv.indexOf('--platform');
    if (option >= 0 && !process.argv[option + 1]) throw new Error('Dùng --platform android, ios hoặc all.');
    const results = checkMapsConfig(process.env, option < 0 ? 'all' : process.argv[option + 1]);
    console.log(JSON.stringify({ results, note: 'Chỉ kiểm cấu hình, không xác minh quyền key/billing/SHA-1. Cần rebuild và kiểm tile trên thiết bị.' }, null, 2));
    if (results.some((result) => !result.readyForBuild)) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
