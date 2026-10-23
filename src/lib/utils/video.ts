import { parseYouTube } from './youtube';

/** A reel's video. Reels are embedded from YouTube (regular videos or Shorts); we don't host video files. */
export type VideoSource = { kind: 'youtube'; id: string; isShort: boolean };

/** Parse a YouTube watch / youtu.be / embed / Shorts link. Returns null for anything else. */
export function parseVideoSource(url: string | null | undefined): VideoSource | null {
	const yt = parseYouTube(url?.trim());
	return yt ? { kind: 'youtube', ...yt } : null;
}

/** Human-readable label for admin listings. */
export function videoSourceLabel(src: VideoSource | null): string {
	if (!src) return 'Unsupported link';
	return src.isShort ? 'YouTube Short' : 'YouTube';
}

/** Still image shown before the player loads. */
export function videoThumb(src: VideoSource): string {
	return `https://i.ytimg.com/vi/${src.id}/hqdefault.jpg`;
}

/** Muted, looping, chrome-less embed URL for an autoplaying reel (controlled via postMessage). */
export function reelEmbedUrl(src: VideoSource): string {
	const params = new URLSearchParams({
		autoplay: '1',
		mute: '1',
		loop: '1',
		playlist: src.id, // required for loop to work on a single video
		controls: '0',
		playsinline: '1',
		rel: '0',
		enablejsapi: '1' // lets the page mute/unmute, pause and seek via postMessage
	});
	return `https://www.youtube.com/embed/${src.id}?${params}`;
}

/** postMessage payload for a YouTube iframe API command (mute, unMute, playVideo, seekTo, …). */
export function youTubeCommand(func: string, args: unknown[] = []): string {
	return JSON.stringify({ event: 'command', func, args });
}

export const YOUTUBE_ORIGIN = 'https://www.youtube.com';
