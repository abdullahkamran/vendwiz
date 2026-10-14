import { describe, it, expect } from 'vitest';
import { insertBlankLine } from './markdownEdit';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true });

describe('blank line', () => {
	it('adds an empty paragraph between paragraphs', () => {
		const r = insertBlankLine('Above', 5);
		expect(r.value).toBe('Above\n\n&nbsp;\n\n');
	});

	it('after a heading, places the space after the heading line', () => {
		const r = insertBlankLine('## Title\n\nBody', 8);
		expect(r.value).toBe('## Title\n\n&nbsp;\n\nBody');
	});

	it('renders a visible gap after a heading without merging the next paragraph', () => {
		const r = insertBlankLine('# Title\nNext paragraph', 7);
		const html = md.render(r.value);
		expect(html).toContain('<h1>Title</h1>');
		expect(html).toContain('<p> </p>'); // the visible gap
		expect(html).toContain('<p>Next paragraph</p>');
	});

	it('works with the cursor in the middle of a heading without splitting it', () => {
		const r = insertBlankLine('## Our story\nText', 5);
		expect(r.value.startsWith('## Our story\n\n&nbsp;')).toBe(true);
		expect(md.render(r.value)).toContain('<h2>Our story</h2>');
	});

	it('a heading at the very end of the text', () => {
		expect(insertBlankLine('### Last', 8).value).toBe('### Last\n\n&nbsp;\n\n');
	});

	it('does not mistake a hash that is not a heading for one', () => {
		expect(insertBlankLine('#hashtag', 8).value).toBe('#hashtag\n\n&nbsp;\n\n');
	});
});
