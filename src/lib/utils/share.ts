export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'manual';

/**
 * Open the browser / phone's own share menu (WhatsApp, Messenger, TikTok, ...). Where the browser has
 * no share menu (e.g. Firefox on desktop) the link is copied to the clipboard instead, and as a last
 * resort shown in a prompt. The caller can show a "Link copied" message on 'copied'.
 */
export async function nativeShare(data: { title: string; text?: string; url: string }): Promise<ShareResult> {
	if (typeof navigator.share === 'function') {
		try {
			await navigator.share(data);
			return 'shared';
		} catch (err) {
			if ((err as DOMException)?.name === 'AbortError') return 'cancelled'; // shopper closed the menu
		}
	}
	try {
		await navigator.clipboard.writeText(data.url);
		return 'copied';
	} catch {
		window.prompt('Copy this link:', data.url);
		return 'manual';
	}
}
