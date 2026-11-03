import { formatAnswer, toPlainText } from '../formatAnswer';

describe('formatAnswer', () => {
  it('tach dong dau, gach dau dong, chu dam va marker nguon', () => {
    const blocks = formatAnswer('Phải khai báo [1].\n- Giữ **biên nhận** [2].\n\n**Nên làm gì tiếp:** khai online.');
    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'bullet', 'paragraph']);
    expect(blocks[0].segments).toEqual([{ text: 'Phải khai báo ' }, { text: '[1]', citation: 1 }, { text: '.' }]);
    expect(blocks[1].segments[1]).toEqual({ text: 'biên nhận', bold: true });
    expect(blocks[2].segments[0]).toEqual({ text: 'Nên làm gì tiếp:', bold: true });
  });

  it('ban sao chep bo dau ** va them danh sach nguon', () => {
    const text = toPlainText('**Có** [1].', [{ n: 1, title: 'AUSTRAC', url: 'https://austrac.gov.au' }]);
    expect(text).toBe('Có [1].\n\nNguồn:\n[1] AUSTRAC - https://austrac.gov.au');
  });
});
