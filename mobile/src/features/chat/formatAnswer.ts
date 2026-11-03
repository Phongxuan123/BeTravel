/*
 * Tách câu trả lời của trợ lý thành khối hiển thị. Backend chỉ dùng **đậm**, dòng "- " và marker
 * [n] (contracts mục 25, C3/C4), nên tự phân tích thay vì kéo thư viện markdown vào app.
 */
export type AnswerSegment = { text: string; bold?: boolean; citation?: number };
export type AnswerBlock = { kind: 'paragraph' | 'bullet'; segments: AnswerSegment[] };

const BULLET_PREFIX = /^\s*[-•]\s+/;
const INLINE_TOKEN = /(\*\*[^*]+\*\*|\[\d{1,2}\])/g;

function parseInline(line: string): AnswerSegment[] {
  return line
    .split(INLINE_TOKEN)
    .filter((part) => part !== '')
    .map((part) => {
      const citation = part.match(/^\[(\d{1,2})\]$/);
      if (citation) return { text: part, citation: Number(citation[1]) };
      const bold = part.match(/^\*\*([^*]+)\*\*$/);
      if (bold) return { text: bold[1], bold: true };
      return { text: part };
    });
}

export function formatAnswer(content: string): AnswerBlock[] {
  return content
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const isBullet = BULLET_PREFIX.test(line);
      return {
        kind: isBullet ? 'bullet' : 'paragraph',
        segments: parseInline(isBullet ? line.replace(BULLET_PREFIX, '') : line.trim()),
      };
    });
}

// Bản sao chép (E5): bỏ ký hiệu đậm, giữ [n] để người dùng đối chiếu với danh sách nguồn.
export function toPlainText(content: string, sources: { n: number; title: string; url: string }[]) {
  const body = content.replace(/\*\*([^*]+)\*\*/g, '$1');
  if (sources.length === 0) return body;
  const list = sources.map((source) => `[${source.n}] ${source.title}${source.url ? ` - ${source.url}` : ''}`);
  return `${body}\n\nNguồn:\n${list.join('\n')}`;
}
