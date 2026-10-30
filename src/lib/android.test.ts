import { describe, it, expect } from 'vitest';
import { assetLinks, isValidPackageName, normaliseFingerprint, suggestPackageName } from './android';

const FP = 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89';

describe('isValidPackageName', () => {
	it('accepts dotted lowercase ids', () => {
		expect(isValidPackageName('com.mystore.app')).toBe(true);
		expect(isValidPackageName('pk.shop_1.app')).toBe(true);
	});

	it('rejects single segments, bad characters and Java keywords', () => {
		expect(isValidPackageName('mystore')).toBe(false);
		expect(isValidPackageName('com.my-store.app')).toBe(false);
		expect(isValidPackageName('com.1store.app')).toBe(false);
		expect(isValidPackageName('Com.Store.App')).toBe(false);
		expect(isValidPackageName('com.new.app')).toBe(false);
	});
});

describe('suggestPackageName', () => {
	it('builds a valid id from any subdomain', () => {
		for (const sub of ['mystore', 'my-store', '123shop', 'class']) {
			expect(isValidPackageName(suggestPackageName(sub))).toBe(true);
		}
		expect(suggestPackageName('my-store')).toBe('com.my_store.app');
	});
});

describe('normaliseFingerprint', () => {
	it('formats colon-less and lowercase input', () => {
		expect(normaliseFingerprint(FP.replace(/:/g, '').toLowerCase())).toBe(FP);
		expect(normaliseFingerprint(`  ${FP} `)).toBe(FP);
	});

	it('rejects SHA-1 and junk', () => {
		expect(normaliseFingerprint(FP.slice(0, 59))).toBeNull();
		expect(normaliseFingerprint('not a fingerprint')).toBeNull();
	});
});

describe('assetLinks', () => {
	it('is empty until both package and fingerprint are set', () => {
		expect(assetLinks(null, [FP])).toEqual([]);
		expect(assetLinks('com.a.b', [])).toEqual([]);
	});

	it('produces a handle_all_urls statement', () => {
		const [s] = assetLinks('com.a.b', [FP]);
		expect(s.relation).toEqual(['delegate_permission/common.handle_all_urls']);
		expect(s.target).toEqual({ namespace: 'android_app', package_name: 'com.a.b', sha256_cert_fingerprints: [FP] });
	});
});
