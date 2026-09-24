// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { renderSafeMarkdown } from '../markdown';

test('lọc script, event handler và URL javascript nhưng giữ nội dung bài', () => {
  const html = renderSafeMarkdown('# Tiêu đề\n\n<script>alert(1)</script><img src=x onerror="alert(1)">\n\n[link](javascript:alert(1))');
  expect(html).toContain('<h1>Tiêu đề</h1>');
  expect(html).not.toMatch(/<script|onerror|javascript:/i);
});
