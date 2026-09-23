/**
 * Lightweight server-side markdown renderer.
 * Used by policy pages to convert stored markdown to safe HTML.
 *
 * html: false — raw HTML tags in stored content are escaped rather than passed
 *               through, preventing stored XSS via {@html data.html} on the
 *               policy page.  Store owners should use Markdown syntax for
 *               formatting (e.g. **bold**, _italic_, # headings).
 * linkify: true — auto-link bare URLs in policy content.
 */
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true });

/**
 * Render a markdown (or HTML) string to an HTML string.
 * Safe to call server-side only; never call from client code.
 */
export function renderMarkdown(content: string): string {
  return md.render(content);
}
