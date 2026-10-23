import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';

const send = vi.fn();
vi.mock('@aws-sdk/client-s3', () => ({
	S3Client: vi.fn(() => ({ send })),
	PutObjectCommand: vi.fn((input) => ({ input }))
}));

const png = () =>
	sharp({ create: { width: 20, height: 10, channels: 3, background: '#f00' } }).png().toBuffer();

let dir: string;

function stubS3(base: string) {
	vi.stubEnv('STORAGE_DRIVER', 's3');
	vi.stubEnv('S3_ENDPOINT', 'https://acc.r2.cloudflarestorage.com');
	vi.stubEnv('S3_BUCKET', 'assets');
	vi.stubEnv('S3_ACCESS_KEY_ID', 'k');
	vi.stubEnv('S3_SECRET_ACCESS_KEY', 's');
	vi.stubEnv('CDN_BUCKET_BASE_URL', base);
}

beforeEach(async () => {
	vi.resetModules();
	send.mockReset();
	dir = await mkdtemp(join(tmpdir(), 'uploads-'));
	vi.stubEnv('UPLOAD_DIR', dir);
});

afterEach(async () => {
	vi.unstubAllEnvs();
	await rm(dir, { recursive: true, force: true });
});

describe('saveImage', () => {
	it('writes a webp under <storeId>/<folder>/ locally and returns that relative path', async () => {
		vi.stubEnv('STORAGE_DRIVER', 'local');
		const { saveImage, mediaBaseUrl } = await import('./upload');
		const path = await saveImage(await png(), { storeId: 'store_1', folder: 'products' });

		expect(path).toMatch(/^store_1\/products\/[\w-]{21}\.webp$/);
		expect(mediaBaseUrl()).toBe('/uploads');
		const meta = await sharp(await readFile(join(dir, path))).metadata();
		expect(meta.format).toBe('webp');
	});

	it('uploads under the folder named by CDN_BUCKET_BASE_URL and returns the relative path', async () => {
		stubS3('https://cdn.11devs.com/vendwiz/');
		const { saveImage, mediaBaseUrl } = await import('./upload');
		const path = await saveImage(await png(), { storeId: 'store_1', folder: 'categories' });

		expect(path).toMatch(/^store_1\/categories\/[\w-]{21}\.webp$/);
		expect(mediaBaseUrl()).toBe('https://cdn.11devs.com/vendwiz');
		const { input } = send.mock.calls[0][0];
		expect(input).toMatchObject({
			Bucket: 'assets',
			Key: `vendwiz/${path}`,
			ContentType: 'image/webp',
			CacheControl: 'public, max-age=31536000, immutable'
		});
	});

	it('uploads to the bucket root when CDN_BUCKET_BASE_URL has no path', async () => {
		stubS3('https://pub-abc.r2.dev');
		const { saveImage } = await import('./upload');
		const path = await saveImage(await png(), { storeId: 'store_1', folder: 'branding' });
		expect(send.mock.calls[0][0].input.Key).toBe(path);
	});

	it('rejects unknown folders and unsafe store ids', async () => {
		const { saveImage } = await import('./upload');
		const img = await png();
		await expect(saveImage(img, { storeId: '../x', folder: 'products' })).rejects.toThrow();
		// @ts-expect-error — not a valid folder
		await expect(saveImage(img, { storeId: 'store_1', folder: 'etc' })).rejects.toThrow();
	});

	it('rejects bytes that are not an image', async () => {
		const { saveImage } = await import('./upload');
		await expect(saveImage(Buffer.from('nope'), { storeId: 'store_1', folder: 'products' })).rejects.toThrow();
	});
});
