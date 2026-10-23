import { describe, it, expect } from 'vitest';
import { parseVideoSource, reelEmbedUrl } from './video';

describe('parseVideoSource', () => {
	it('parses YouTube watch, Shorts and youtu.be links', () => {
		expect(parseVideoSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ', isShort: false });
		expect(parseVideoSource('https://youtube.com/shorts/dQw4w9WgXcQ?si=x')).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ', isShort: true });
		expect(parseVideoSource('  https://youtu.be/dQw4w9WgXcQ  ')).toMatchObject({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
	});

	it('rejects non-YouTube links', () => {
		expect(parseVideoSource('https://www.tiktok.com/@shop/video/7312345678901234567')).toBeNull();
		expect(parseVideoSource('https://www.instagram.com/reel/C1a2B3c4D5e/')).toBeNull();
		expect(parseVideoSource('https://cdn.example.com/clip.mp4')).toBeNull();
		expect(parseVideoSource('')).toBeNull();
		expect(parseVideoSource(null)).toBeNull();
	});
});

describe('reelEmbedUrl', () => {
	it('starts muted and loops the single video', () => {
		const url = reelEmbedUrl({ kind: 'youtube', id: 'dQw4w9WgXcQ', isShort: true });
		expect(url).toContain('mute=1');
		expect(url).toContain('playlist=dQw4w9WgXcQ');
		expect(url).toContain('enablejsapi=1');
	});
});
