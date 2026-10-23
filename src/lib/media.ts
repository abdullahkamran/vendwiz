/**
 * Uploaded media is stored in the database as a path relative to the media base, e.g.
 *   "<storeId>/products/V1StGXR8_Z5jdHi6B-myT.webp"
 * and turned into a loadable URL only when displayed, with mediaUrl(). The base is
 * CDN_BUCKET_BASE_URL (e.g. https://cdn.11devs.com/vendwiz) when uploads go to the bucket,
 * or /uploads when they are kept on local disk — so moving to another CDN domain is an env change.
 *
 * Shared by server and browser: the server sets the base at startup (hooks.server.ts) and the
 * root layout passes it to the browser.
 */
import type MarkdownIt from 'markdown-it';

/** The folders an upload may go into, one per kind of image. */
export const UPLOAD_FOLDERS = ['products', 'variants', 'categories', 'content', 'branding'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export function isUploadFolder(value: unknown): value is UploadFolder {
	return typeof value === 'string' && (UPLOAD_FOLDERS as readonly string[]).includes(value);
}

/** A stored upload path: "<storeId>/<folder>/<file>.<ext>". */
export const MEDIA_PATH = new RegExp(`^[\\w-]+/(?:${UPLOAD_FOLDERS.join('|')})/[\\w-]+\\.[a-z0-9]+$`);

let base = '/uploads';

export function setMediaBase(value: string) {
	base = value.replace(/\/+$/, '');
}

export function getMediaBase(): string {
	return base;
}

/**
 * The URL to load a stored image from. Stored upload paths get the media base in front;
 * anything else (an external https link, a legacy /uploads/… path, a blob: preview) is returned as-is.
 */
export function mediaUrl(ref: string): string;
export function mediaUrl(ref: string | null | undefined): string | null | undefined;
export function mediaUrl(ref: string | null | undefined): string | null | undefined {
	if (!ref || !MEDIA_PATH.test(ref)) return ref;
	return `${base}/${ref}`;
}

/** Makes markdown-it resolve stored upload paths in image tags (![alt](<storeId>/content/…)). */
export function resolveMarkdownImages(md: MarkdownIt): MarkdownIt {
	const render = md.renderer.rules.image!;
	md.renderer.rules.image = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const src = token.attrGet('src');
		if (src) token.attrSet('src', mediaUrl(src));
		return render(tokens, idx, options, env, self);
	};
	return md;
}
