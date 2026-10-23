import { writeFile, mkdir } from 'fs/promises';
import { join, extname, dirname } from 'path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { isUploadFolder, type UploadFolder } from '$lib/media';

export { UPLOAD_FOLDERS, isUploadFolder, type UploadFolder } from '$lib/media';

// Where uploads go:
//   STORAGE_DRIVER=local (default) → files under UPLOAD_DIR, served by /uploads/[...path]
//   STORAGE_DRIVER=s3              → any S3-compatible bucket (Cloudflare R2), served from CDN_BUCKET_BASE_URL
//
// Saving returns the path relative to the media base — "<storeId>/<folder>/<random id>.<ext>" — which
// is what gets stored in the database (see $lib/media). With
//   CDN_BUCKET_BASE_URL=https://cdn.11devs.com/vendwiz
// the object key is "vendwiz/<storeId>/<folder>/<id>.webp" and it loads from
//   https://cdn.11devs.com/vendwiz/<storeId>/<folder>/<id>.webp
// Paths are never reused, so every URL can be cached forever.

export interface UploadTarget {
	storeId: string;
	folder: UploadFolder;
}

const IMMUTABLE = 'public, max-age=31536000, immutable';

let s3: S3Client | null = null;

function useS3(): boolean {
	return env.STORAGE_DRIVER === 's3';
}

function requireEnv(name: string): string {
	const value = env[name];
	if (!value) throw new Error(`${name} must be set when STORAGE_DRIVER=s3`);
	return value;
}

function s3Client(): S3Client {
	s3 ??= new S3Client({
		region: env.S3_REGION || 'auto',
		endpoint: requireEnv('S3_ENDPOINT'),
		credentials: {
			accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
			secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY')
		}
	});
	return s3;
}

/** Public URL that stored upload paths are relative to: CDN_BUCKET_BASE_URL, or /uploads locally. */
export function mediaBaseUrl(): string {
	return useS3() ? requireEnv('CDN_BUCKET_BASE_URL').replace(/\/+$/, '') : '/uploads';
}

/** Folder inside the bucket that mirrors the path of CDN_BUCKET_BASE_URL ("vendwiz"), or "" for the root. */
function bucketPrefix(): string {
	return new URL(requireEnv('CDN_BUCKET_BASE_URL')).pathname.replace(/^\/+|\/+$/g, '');
}

function assertTarget({ storeId, folder }: UploadTarget) {
	if (!/^[\w-]+$/.test(storeId)) throw new Error('Invalid store id for upload');
	if (!isUploadFolder(folder)) throw new Error(`Invalid upload folder: ${folder}`);
}

/** Stores the bytes and returns their path relative to the media base. */
async function put(target: UploadTarget, ext: string, body: Buffer, contentType: string): Promise<string> {
	assertTarget(target);
	const path = `${target.storeId}/${target.folder}/${nanoid()}${ext}`;

	if (useS3()) {
		const prefix = bucketPrefix();
		await s3Client().send(
			new PutObjectCommand({
				Bucket: requireEnv('S3_BUCKET'),
				Key: prefix ? `${prefix}/${path}` : path,
				Body: body,
				ContentType: contentType,
				CacheControl: IMMUTABLE
			})
		);
		return path;
	}

	const filePath = join(env.UPLOAD_DIR || 'static/uploads', path);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, body);
	return path;
}

/**
 * Resizes (never enlarges) and converts an image to WebP, then stores it.
 * Returns the path to save in the database (show it with mediaUrl()).
 * Throws if the bytes are not an image sharp can read.
 */
export async function saveImage(
	buffer: Buffer,
	target: UploadTarget,
	options?: { width?: number; height?: number; quality?: number }
): Promise<string> {
	let pipeline = sharp(buffer).rotate(); // apply EXIF orientation before metadata is stripped

	if (options?.width || options?.height) {
		pipeline = pipeline.resize(options.width, options.height, { fit: 'inside', withoutEnlargement: true });
	}

	const webp = await pipeline.webp({ quality: options?.quality ?? 85 }).toBuffer();
	return put(target, '.webp', webp, 'image/webp');
}

/** Stores a file as-is, keeping only its extension from the original name. */
export async function saveFile(
	buffer: Buffer,
	target: UploadTarget,
	originalName: string,
	contentType = 'application/octet-stream'
): Promise<string> {
	const ext = extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
	return put(target, ext, buffer, contentType);
}
