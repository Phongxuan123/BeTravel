import { containsPhrase, normalizeVi } from "./textNormalize.js";
// Geographic names only; never legal content or emergency numbers.
export const DEFAULT_COUNTRY_ALIASES = Object.freeze({
  KR: ["Hàn", "Korea", "South Korea", "대한민국", "한국", "Seoul", "Busan"],
  JP: ["Nhật", "Japan", "日本", "Tokyo", "Osaka", "Kyoto"],
  TH: ["Thái", "Thailand", "ประเทศไทย", "Bangkok", "Phuket", "Chiang Mai"],
  SG: ["Singapore", "Singapura", "新加坡"],
});
export const countryNames = (country) =>
  [
    country.name,
    country.nameEn,
    ...(country.aliases ?? []),
    ...(country.majorCities ?? []),
    ...(DEFAULT_COUNTRY_ALIASES[country.code] ?? []),
  ].filter(Boolean);

export const mentionsCountry = (question, country) =>
  countryNames(country).some((name) => {
    // These scripts do not consistently separate words with spaces.
    if (/[\p{Script=Han}\p{Script=Hangul}\p{Script=Thai}]/u.test(name))
      return question.normalize("NFC").includes(name.normalize("NFC"));
    if (["thai", "nhat", "han"].includes(normalizeVi(name))) {
      if (normalizeVi(question) === normalizeVi(name)) return true;
      return ["ở", "sang", "tại", "đến", "đi", "luật", "nước", "quốc gia"].some((prefix) =>
        containsPhrase(question, `${prefix} ${name}`),
      );
    }
    return containsPhrase(question, name);
  });
