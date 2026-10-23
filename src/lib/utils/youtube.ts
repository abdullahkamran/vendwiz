const ID = '([A-Za-z0-9_-]{11})';
const PATTERNS = [
	new RegExp(`youtube\\.com/shorts/${ID}`),
	new RegExp(`(?:youtube\\.com/watch\\?(?:.*&)?v=|youtu\\.be/|youtube\\.com/embed/)${ID}`)
];

export interface YouTubeRef {
	id: string;
	isShort: boolean;
}

/** Parse a YouTube watch / youtu.be / embed / shorts URL into its video ID and whether it is a Short. */
export function parseYouTube(url: string | null | undefined): YouTubeRef | null {
	if (!url) return null;
	for (const [i, pattern] of PATTERNS.entries()) {
		const m = url.match(pattern);
		if (m) return { id: m[1], isShort: i === 0 };
	}
	return null;
}
