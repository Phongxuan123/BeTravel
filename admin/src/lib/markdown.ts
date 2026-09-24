import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Nội dung từ DB/bản nháp cũng là input không tin cậy; lọc sau bước Markdown.
export function renderSafeMarkdown(markdown: string): string {
  return DOMPurify.sanitize(marked.parse(markdown, { async: false }) as string, {
    USE_PROFILES: { html: true },
  });
}
