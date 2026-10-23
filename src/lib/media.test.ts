import { describe, it, expect, afterEach } from 'vitest';
import MarkdownIt from 'markdown-it';
import { mediaUrl, setMediaBase, resolveMarkdownImages } from './media';

afterEach(() => setMediaBase('/uploads'));

describe('mediaUrl', () => {
	it('puts the media base in front of stored upload paths', () => {
		setMediaBase('https://cdn.11devs.com/vendwiz/');
		expect(mediaUrl('st_1/products/abc-_1.webp')).toBe('https://cdn.11devs.com/vendwiz/st_1/products/abc-_1.webp');
	});

	it('uses /uploads by default (local storage)', () => {
		expect(mediaUrl('st_1/branding/x.webp')).toBe('/uploads/st_1/branding/x.webp');
	});

	it('leaves external links, legacy /uploads paths, previews and empty values alone', () => {
		setMediaBase('https://cdn.11devs.com/vendwiz');
		for (const ref of ['https://img.example.com/a.jpg', '/uploads/a.webp', '/favicon.svg', 'blob:http://x/1', 'data:image/png;base64,AA']) {
			expect(mediaUrl(ref)).toBe(ref);
		}
		expect(mediaUrl(null)).toBeNull();
		expect(mediaUrl(undefined)).toBeUndefined();
		expect(mediaUrl('')).toBe('');
	});

	it('does not treat unknown folders or traversal as upload paths', () => {
		expect(mediaUrl('st_1/secret/x.webp')).toBe('st_1/secret/x.webp');
		expect(mediaUrl('../products/x.webp')).toBe('../products/x.webp');
	});
});

describe('resolveMarkdownImages', () => {
	it('resolves stored upload paths in markdown images only', () => {
		setMediaBase('https://cdn.11devs.com/vendwiz');
		const md = resolveMarkdownImages(new MarkdownIt());
		const html = md.render('![a](st_1/content/x.webp) ![b](https://e.com/y.png) [link](st_1/content/x.webp)');
		expect(html).toContain('<img src="https://cdn.11devs.com/vendwiz/st_1/content/x.webp" alt="a">');
		expect(html).toContain('<img src="https://e.com/y.png" alt="b">');
		expect(html).toContain('<a href="st_1/content/x.webp">link</a>');
	});
});
