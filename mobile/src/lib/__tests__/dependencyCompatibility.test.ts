import queryString from 'query-string';

test('decoder vá lỗ hổng vẫn giữ parse/stringify của Expo Router', () => {
  const parsed = queryString.parse('q=H%C3%A0%20N%E1%BB%99i&x=1&x=2');
  expect(parsed.q).toBe('Hà Nội');
  expect(parsed.x).toEqual(['1', '2']);
  expect(queryString.stringify({ q: 'Hà Nội' })).toBe('q=H%C3%A0%20N%E1%BB%99i');
  expect(() => queryString.parse('q=%E0%A4%A')).not.toThrow();
});
