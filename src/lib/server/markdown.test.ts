/**
 * Tests for the server-side markdown renderer.
 *
 * These verify that the rendering pipeline correctly converts Markdown syntax to
 * HTML — bold, headings, and pipe tables must all produce proper HTML elements.
 * Policy pages use {@html data.html} to display this output; if the renderer
 * were to return raw Markdown the storefront would show raw syntax to users.
 */
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown — inline formatting', () => {
	it('converts **bold** to <strong>', () => {
		const html = renderMarkdown('**bold text**');
		expect(html).toContain('<strong>bold text</strong>');
		expect(html).not.toContain('**bold text**');
	});

	it('converts _italic_ to <em>', () => {
		const html = renderMarkdown('_italic text_');
		expect(html).toContain('<em>italic text</em>');
	});
});

describe('renderMarkdown — headings', () => {
	it('converts ## heading to <h2>', () => {
		const html = renderMarkdown('## My Heading');
		expect(html).toContain('<h2>My Heading</h2>');
		expect(html).not.toContain('## My Heading');
	});

	it('converts # heading to <h1>', () => {
		const html = renderMarkdown('# Top Heading');
		expect(html).toContain('<h1>Top Heading</h1>');
	});
});

describe('renderMarkdown — pipe tables', () => {
	const tableMarkdown = '| Col A | Col B |\n| ----- | ----- |\n| val 1 | val 2 |';

	it('converts a pipe table to <table>', () => {
		const html = renderMarkdown(tableMarkdown);
		expect(html).toContain('<table>');
	});

	it('renders table headers as <th>', () => {
		const html = renderMarkdown(tableMarkdown);
		expect(html).toContain('<th>Col A</th>');
		expect(html).toContain('<th>Col B</th>');
	});

	it('renders table cells as <td>', () => {
		const html = renderMarkdown(tableMarkdown);
		expect(html).toContain('<td>val 1</td>');
		expect(html).toContain('<td>val 2</td>');
	});

	it('does not return raw pipe-table syntax in the output', () => {
		const html = renderMarkdown(tableMarkdown);
		expect(html).not.toContain('| Col A |');
	});
});

describe('renderMarkdown — XSS safety', () => {
	it('escapes raw <script> tags when html:false is set', () => {
		const html = renderMarkdown('<script>alert(1)</script>');
		expect(html).not.toContain('<script>');
	});
});

describe('renderMarkdown — About Us page content', () => {
	it('renders an uploaded picture as an <img>', () => {
		const html = renderMarkdown('![Our workshop](/uploads/about/workshop.webp)');
		expect(html).toContain('<img src="/uploads/about/workshop.webp" alt="Our workshop"');
	});
	it('renders headings, bold, italic and both kinds of list', () => {
		const html = renderMarkdown('## Our story\n\n**Handmade** and _local_\n\n- one\n- two\n\n1. first\n2. second');
		expect(html).toContain('<h2>Our story</h2>');
		expect(html).toContain('<strong>Handmade</strong>');
		expect(html).toContain('<em>local</em>');
		expect(html).toContain('<ul>');
		expect(html).toContain('<ol>');
	});
	it('does not let a script URL through a link or picture', () => {
		// markdown-it refuses the URL, so no real link / image is produced (the text stays inert)
		expect(renderMarkdown('[click](javascript:alert(1))')).not.toMatch(/<as|href=/);
		expect(renderMarkdown('![x](javascript:alert(1))')).not.toMatch(/<imgs|src=/);
	});
	it('escapes raw HTML mixed into the content', () => {
		expect(renderMarkdown('Hello <img src=x onerror=alert(1)>')).not.toContain('<img src=x');
	});
});

describe('renderMarkdown — line spacing', () => {
	it('a line break (two spaces + newline) becomes <br> inside the same paragraph', () => {
		expect(renderMarkdown('First line  \nSecond line')).toBe('<p>First line<br>\nSecond line</p>\n');
	});
	it('a single Enter alone does not start a new line (so the editor offers a Blank line button)', () => {
		expect(renderMarkdown('First line\nSecond line')).not.toContain('<br>');
	});
	it('a blank-line marker renders an empty paragraph that keeps vertical space', () => {
		const html = renderMarkdown('Above\n\n&nbsp;\n\nBelow');
		expect(html).toBe('<p>Above</p>\n<p>\u00a0</p>\n<p>Below</p>\n');
	});
});
