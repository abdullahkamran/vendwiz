// Helpers for the optional per-store Android app (a Trusted Web Activity wrapping the storefront PWA).
// Shared by the admin guide (/admin/app) and the /.well-known/assetlinks.json route.

/** Android application ID: two or more dot-separated segments, each starting with a letter. */
const PACKAGE_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

// Java keywords are not allowed as a segment of an application ID.
const RESERVED = new Set(
	'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null'.split(
		' '
	)
);

export function isValidPackageName(name: string): boolean {
	return name.length <= 150 && PACKAGE_RE.test(name) && !name.split('.').some((s) => RESERVED.has(s));
}

/** A sensible default application ID for a store, e.g. "my-shop" → "com.my_shop.app". */
export function suggestPackageName(subdomain: string): string {
	let seg = subdomain.toLowerCase().replace(/[^a-z0-9_]/g, '_');
	if (!/^[a-z]/.test(seg)) seg = `s${seg}`;
	if (RESERVED.has(seg)) seg = `${seg}_store`;
	return `com.${seg}.app`;
}

/**
 * Normalises a SHA-256 certificate fingerprint to the colon-separated upper-case form used in
 * assetlinks.json ("AB:CD:…", 32 bytes). Accepts it with or without colons/spaces.
 * Returns null when the input is not a SHA-256 fingerprint.
 */
export function normaliseFingerprint(raw: string): string | null {
	const hex = raw.replace(/[\s:]/g, '').toUpperCase();
	if (!/^[0-9A-F]{64}$/.test(hex)) return null;
	return hex.match(/../g)!.join(':');
}

/** The Digital Asset Links statement that lets the Android app open the storefront full-screen. */
export function assetLinks(packageName: string | null, fingerprints: string[]) {
	if (!packageName || fingerprints.length === 0) return [];
	return [
		{
			relation: ['delegate_permission/common.handle_all_urls'],
			target: {
				namespace: 'android_app',
				package_name: packageName,
				sha256_cert_fingerprints: fingerprints
			}
		}
	];
}

/** Ids of the guide steps an owner can tick off (stored in stores.android_steps_done). */
export const ANDROID_STEPS = [
	'account',
	'package',
	'build',
	'fingerprint',
	'listing',
	'content',
	'testing',
	'signing',
	'publish'
] as const;
export type AndroidStep = (typeof ANDROID_STEPS)[number];
