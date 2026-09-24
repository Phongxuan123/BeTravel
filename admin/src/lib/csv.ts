import type { SupportLocation, LocationType } from './types';

// Tach 1 dong CSV theo chuan pho bien: truong boc trong "..." co the chua dau
// phay (vi du dia chi "123 Bukchon-ro, Jongno-gu, Seoul"), "" ben trong nghia
// la 1 dau nhay kep thuc. Khong dung thu vien rieng -- Rule 9 KISS, chi can
// muc do nay cho file admin tu chuan bi.
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

// Cot ky vong: countryCode,type,name,nameLocal,address,phone,website,openHours,lat,lng,verified
export function parseLocationsCsv(text: string): Partial<SupportLocation>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);

  return lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const cells = splitCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = cells[i] ?? ''));

      // Number('') === 0 (hop le nhung SAI) -- neu khong kiem tra rong truoc,
      // dong thieu toa do se bi gan nham vao diem [0,0] ("null island").
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      const hasCoords = row.lat.trim() !== '' && row.lng.trim() !== '' && Number.isFinite(lat) && Number.isFinite(lng);

      return {
        countryCode: row.countryCode?.toUpperCase(),
        type: row.type as LocationType,
        name: row.name,
        nameLocal: row.nameLocal || undefined,
        address: row.address,
        phone: row.phone || undefined,
        website: row.website || undefined,
        openHours: row.openHours || undefined,
        verified: row.verified?.toLowerCase() === 'true',
        ...(hasCoords ? { location: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] } } : {}),
      };
    });
}
