/* Trích từ/cụm từ ngắn, không dùng từ điển để ghép câu. Chạy lúc phát triển, không chạy trong app. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const input = process.argv[2];
if (!input)
  throw new Error('Usage: node scripts/build-bundled-dictionary.cjs <kaikki-Vietnamese.jsonl>');
const raw = fs.readFileSync(input);
const entries = new Map();
const allowedPos = new Set(['noun', 'verb', 'adj', 'adv', 'num', 'prep']);
for (const line of raw.toString('utf8').split('\n')) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  if (row.lang_code !== 'vi' || !allowedPos.has(row.pos)) continue;
  if (!/^[\p{Script=Latin}\p{M} -]+$/u.test(row.word) || row.word.split(' ').length > 5) continue;
  for (const sense of row.senses ?? []) {
    if (sense.tags?.length || sense.form_of || sense.alt_of) continue;
    const gloss = sense.glosses?.[0] ?? '';
    // Không xóa chú thích/ngữ cảnh để biến một định nghĩa thành bản dịch sai.
    if (!/^[a-zA-Z ;'-]+$/.test(gloss)) continue;
    for (let en of gloss.split(';')) {
      en = en.trim();
      if (row.pos === 'verb') en = en.replace(/^to /, '');
      if (
        !en ||
        en.split(' ').length > 4 ||
        /^(a|an|the|of|used|short|alternative|synonym) /i.test(en)
      )
        continue;
      const vi = row.word.normalize('NFC');
      entries.set(`${vi}|${en}|${row.pos}`, [vi, en, row.pos]);
    }
  }
}
const result = {
  version: 1,
  source: 'Wiktionary contributors via Kaikki.org / Wiktextract',
  sourceUrl: 'https://kaikki.org/dictionary/Vietnamese/index.html',
  downloadUrl: 'https://kaikki.org/dictionary/Vietnamese/kaikki.org-dictionary-Vietnamese.jsonl',
  retrievedAt: '2026-10-21',
  dumpDate: '2026-09-02',
  sourceSha256: crypto.createHash('sha256').update(raw).digest('hex'),
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  changes:
    'Selected short unlabelled Latin-script glosses; split semicolon synonyms; removed infinitive to for verbs; NFC; deduplicated. Each vi field identifies its en.wiktionary.org/wiki/<vi>#Vietnamese source and contributor history.',
  entries: [...entries.values()].sort((a, b) => (a.join('|') < b.join('|') ? -1 : 1)),
};
const output = path.join(__dirname, '../src/features/translate/data/dictionary-vi-en.json');
fs.writeFileSync(output, JSON.stringify(result) + '\n');
console.log(
  `${result.entries.length} word/sense pairs; ${fs.statSync(output).size} bytes; SHA256 ${result.sourceSha256}`,
);
