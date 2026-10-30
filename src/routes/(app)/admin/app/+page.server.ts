import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { stores, products } from '$lib/server/db/schema';
import { and, count, eq } from 'drizzle-orm';
import { storeBaseUrl } from '$lib/server/orderEmail';
import {
	ANDROID_STEPS,
	isValidPackageName,
	normaliseFingerprint,
	suggestPackageName,
	type AndroidStep
} from '$lib/android';

const MAX_FINGERPRINTS = 5;

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const store = locals.store;
	if (!store) throw error(400, 'No store context');

	const [{ n: publishedProducts }] = await db
		.select({ n: count() })
		.from(products)
		.where(and(eq(products.storeId, store.id), eq(products.isPublished, true), eq(products.isDefault, false)));

	const storeUrl = storeBaseUrl(store.subdomain);
	// The app verifies against the storefront's own https origin; the /store/<slug> fallback
	// (local dev / LAN) shares one origin between stores and cannot be verified.
	const hasOwnOrigin = storeUrl.startsWith('https://') && !storeUrl.includes('/store/');

	return {
		storeUrl,
		hasOwnOrigin,
		suggestedPackage: suggestPackageName(store.subdomain),
		checks: {
			ownOrigin: hasOwnOrigin,
			icon: !!(store.faviconUrl || store.logoUrl),
			description: !!store.description?.trim(),
			contactEmail: !!store.contactEmail?.trim(),
			products: publishedProducts > 0
		}
	};
};

async function update(storeId: string, values: Partial<typeof stores.$inferInsert>) {
	await db
		.update(stores)
		.set({ ...values, updatedAt: new Date() })
		.where(eq(stores.id, storeId));
}

function requireStore(locals: App.Locals) {
	if (!locals.user || !locals.store) throw error(401, 'Unauthorized');
	return locals.store;
}

export const actions: Actions = {
	enable: async ({ locals }) => {
		const store = requireStore(locals);
		await update(store.id, {
			androidAppEnabled: true,
			androidPackageName: store.androidPackageName ?? suggestPackageName(store.subdomain)
		});
		return { action: 'enable', success: true };
	},

	disable: async ({ locals }) => {
		const store = requireStore(locals);
		// Keep the details so turning it back on resumes where the owner left off.
		await update(store.id, { androidAppEnabled: false });
		return { action: 'disable', success: true };
	},

	savePackage: async ({ request, locals }) => {
		const store = requireStore(locals);
		const name = String((await request.formData()).get('packageName') ?? '').trim();
		if (!isValidPackageName(name)) {
			return fail(400, {
				action: 'savePackage',
				error:
					'Use lowercase letters, numbers and underscores in two or more parts separated by dots, each starting with a letter — e.g. com.mystore.app'
			});
		}
		await update(store.id, { androidPackageName: name });
		return { action: 'savePackage', success: true };
	},

	saveFingerprints: async ({ request, locals }) => {
		const store = requireStore(locals);
		const raw = String((await request.formData()).get('fingerprints') ?? '');
		const lines = raw
			.split(/[\n,]+/)
			.map((l) => l.trim())
			.filter(Boolean);
		const out: string[] = [];
		for (const line of lines) {
			const fp = normaliseFingerprint(line);
			if (!fp) {
				return fail(400, {
					action: 'saveFingerprints',
					error: `"${line.slice(0, 40)}${line.length > 40 ? '…' : ''}" is not a SHA-256 fingerprint. It should be 32 pairs of letters/numbers separated by colons.`
				});
			}
			if (!out.includes(fp)) out.push(fp);
		}
		if (out.length > MAX_FINGERPRINTS) {
			return fail(400, { action: 'saveFingerprints', error: `Add at most ${MAX_FINGERPRINTS} fingerprints.` });
		}
		await update(store.id, { androidCertFingerprints: out });
		return { action: 'saveFingerprints', success: true };
	},

	savePlayUrl: async ({ request, locals }) => {
		const store = requireStore(locals);
		const raw = String((await request.formData()).get('playUrl') ?? '').trim();
		if (raw) {
			let ok = false;
			try {
				const u = new URL(raw);
				ok = u.protocol === 'https:' && u.hostname === 'play.google.com' && u.pathname.startsWith('/store/apps/');
			} catch {
				ok = false;
			}
			if (!ok) {
				return fail(400, {
					action: 'savePlayUrl',
					error: 'Paste the link to your app on Google Play, e.g. https://play.google.com/store/apps/details?id=com.mystore.app'
				});
			}
		}
		await update(store.id, { androidPlayUrl: raw || null });
		return { action: 'savePlayUrl', success: true };
	},

	toggleStep: async ({ request, locals }) => {
		const store = requireStore(locals);
		const data = await request.formData();
		const step = String(data.get('step') ?? '') as AndroidStep;
		if (!ANDROID_STEPS.includes(step)) return fail(400, { action: 'toggleStep', error: 'Unknown step' });
		const done = data.get('done') === 'true';
		const set = new Set(store.androidStepsDone);
		if (done) set.add(step);
		else set.delete(step);
		await update(store.id, { androidStepsDone: ANDROID_STEPS.filter((s) => set.has(s)) });
		return { action: 'toggleStep', success: true };
	},

	/** Fetches the live assetlinks.json from the storefront and checks it matches what is saved. */
	verify: async ({ locals }) => {
		const store = requireStore(locals);
		const storeUrl = storeBaseUrl(store.subdomain);
		const result = (ok: boolean, message: string) => ({ action: 'verify', verified: ok, message });

		if (!storeUrl.startsWith('https://') || storeUrl.includes('/store/')) {
			return result(false, `Your store must be live at its own https address to verify (currently ${storeUrl}).`);
		}
		if (!store.androidPackageName || store.androidCertFingerprints.length === 0) {
			return result(false, 'Save your package name and at least one fingerprint first.');
		}
		try {
			const res = await fetch(`${storeUrl}/.well-known/assetlinks.json`, {
				signal: AbortSignal.timeout(5000),
				headers: { 'Cache-Control': 'no-cache' }
			});
			if (!res.ok) return result(false, `The file could not be loaded (HTTP ${res.status}).`);
			const body = (await res.json()) as {
				target?: { package_name?: string; sha256_cert_fingerprints?: string[] };
			}[];
			const t = body[0]?.target;
			const missing = store.androidCertFingerprints.filter((f) => !t?.sha256_cert_fingerprints?.includes(f));
			if (t?.package_name !== store.androidPackageName || missing.length) {
				return result(
					false,
					'The live file does not match your saved details yet. It is cached for up to 5 minutes — try again shortly.'
				);
			}
			return result(true, 'Verified — your store is linked to your app.');
		} catch {
			return result(false, 'Could not reach your store to check. Make sure it is online and try again.');
		}
	}
};
