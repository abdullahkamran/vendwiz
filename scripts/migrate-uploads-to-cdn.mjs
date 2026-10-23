// One-off: move locally stored uploads to the S3/R2 bucket behind CDN_BUCKET_BASE_URL.
//
//   node --env-file=.env scripts/migrate-uploads-to-cdn.mjs           # dry run: report only
//   node --env-file=.env scripts/migrate-uploads-to-cdn.mjs --apply   # upload + update rows
//
// The database stores upload paths relative to the media base ("<storeId>/<folder>/<file>", see
// src/lib/media.ts). For every image the database references, this script:
//   - legacy "/uploads/<file>" paths: uploads the file as <storeId>/<folder>/<file> and rewrites the
//     row to that relative path;
//   - relative paths already saved by local storage: uploads UPLOAD_DIR/<path> to the same path.
// Objects go under the folder in CDN_BUCKET_BASE_URL's path (e.g. "vendwiz/").
//
// Safe to re-run. Local files are never deleted; remove UPLOAD_DIR yourself once the storefront looks right.

import { readFile, stat } from 'node:fs/promises';
import { join, resolve, sep, basename, extname } from 'node:path';
import postgres from 'postgres';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const APPLY = process.argv.includes('--apply');

function env(name, fallback) {
	const value = process.env[name] ?? fallback;
	if (value === undefined || value === '') {
		console.error(`Missing env var ${name}`);
		process.exit(1);
	}
	return value;
}

const UPLOAD_ROOT = resolve(process.env.UPLOAD_DIR ?? 'static/uploads');
const BASE = env('CDN_BUCKET_BASE_URL').replace(/\/+$/, '');
const PREFIX = new URL(BASE).pathname.replace(/^\/+|\/+$/g, '');
const BUCKET = env('S3_BUCKET');
const s3 = new S3Client({
	region: process.env.S3_REGION || 'auto',
	endpoint: env('S3_ENDPOINT'),
	credentials: { accessKeyId: env('S3_ACCESS_KEY_ID'), secretAccessKey: env('S3_SECRET_ACCESS_KEY') }
});
const sql = postgres(env('DATABASE_URL'), { max: 1 });

const MIME = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', avif: 'image/avif' };
const FOLDERS = 'products|variants|categories|content|branding'; // keep in sync with src/lib/media.ts
const LEGACY_PATH = /\/uploads\/[\w\-./]+/g;
const RELATIVE_PATH = new RegExp(`(?<![\\w/.:-])[\\w-]+/(?:${FOLDERS})/[\\w-]+\\.[a-z0-9]+`, 'g');

const uploaded = new Set(); // relative paths already sent to the bucket in this run
const movedLegacy = new Map(); // "<storeId>:<local file>" → new relative path (null when missing)
const stats = { uploaded: 0, missing: 0, rows: 0 };

/** Sends a local file to the bucket at <PREFIX>/<path>. False when the file does not exist. */
async function upload(localFile, path) {
	if (uploaded.has(path)) return true;
	const exists = localFile.startsWith(UPLOAD_ROOT + sep) && (await stat(localFile).catch(() => null))?.isFile();
	if (!exists) {
		console.warn(`  missing  ${localFile}`);
		stats.missing++;
		return false;
	}
	if (APPLY) {
		await s3.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: PREFIX ? `${PREFIX}/${path}` : path,
				Body: await readFile(localFile),
				ContentType: MIME[extname(localFile).slice(1).toLowerCase()] ?? 'application/octet-stream',
				CacheControl: 'public, max-age=31536000, immutable'
			})
		);
	}
	console.log(`  ${APPLY ? 'uploaded' : 'would upload'}  ${path}`);
	uploaded.add(path);
	stats.uploaded++;
	return true;
}

/** Uploads every image a string (a plain path or Markdown) refers to; returns it with legacy paths rewritten. */
async function migrateText(storeId, text, folder) {
	if (typeof text !== 'string' || !text) return text;
	let out = text;

	for (const legacy of new Set(text.match(LEGACY_PATH) ?? [])) {
		const local = resolve(join(UPLOAD_ROOT, decodeURIComponent(legacy.slice('/uploads/'.length))));
		// The same file may be used in several places (e.g. a product image reused as a colour image):
		// upload it once, into the folder of the first place it is found
		const seen = `${storeId}:${local}`;
		if (!movedLegacy.has(seen)) {
			const path = `${storeId}/${folder}/${basename(local)}`;
			movedLegacy.set(seen, (await upload(local, path)) ? path : null);
		}
		const path = movedLegacy.get(seen);
		if (path) out = out.split(legacy).join(path);
	}

	for (const path of new Set(text.match(RELATIVE_PATH) ?? [])) {
		await upload(resolve(join(UPLOAD_ROOT, path)), path);
	}

	return out;
}

/** For each row, migrates the given text columns and saves the row if a legacy path was rewritten. */
async function migrateColumns(label, table, rows, columns) {
	console.log(`\n${label}`);
	for (const row of rows) {
		const changes = {};
		for (const [column, folder] of Object.entries(columns)) {
			const next = await migrateText(row.store_id, row[column], folder);
			if (next !== row[column]) changes[column] = next;
		}
		if (Object.keys(changes).length === 0) continue;
		stats.rows++;
		if (APPLY) await sql`update ${sql(table)} set ${sql(changes)} where id = ${row.id}`;
	}
}

try {
	console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — ${UPLOAD_ROOT} → bucket ${BUCKET}/${PREFIX} (${BASE})`);

	await migrateColumns(
		'stores',
		'stores',
		await sql`select id, id as store_id, logo_url, favicon_url, description from stores`,
		{ logo_url: 'branding', favicon_url: 'branding', description: 'content' }
	);

	await migrateColumns(
		'categories',
		'categories',
		await sql`select id, store_id, image_url, description from categories`,
		{ image_url: 'categories', description: 'content' }
	);

	// products.images is jsonb [{ url, alt, order }]; description is Markdown
	console.log('\nproducts');
	for (const p of await sql`select id, store_id, images, description from products`) {
		const images = Array.isArray(p.images) ? p.images : [];
		let changed = false;
		const nextImages = [];
		for (const img of images) {
			const url = await migrateText(p.store_id, img?.url, 'products');
			if (url !== img?.url) changed = true;
			nextImages.push(img && typeof img === 'object' ? { ...img, url } : img);
		}
		const description = await migrateText(p.store_id, p.description, 'content');
		if (!changed && description === p.description) continue;
		stats.rows++;
		if (APPLY) await sql`update products set images = ${sql.json(nextImages)}, description = ${description} where id = ${p.id}`;
	}

	await migrateColumns(
		'product option values',
		'product_option_values',
		await sql`select v.id, p.store_id, v.image_url from product_option_values v
			join product_option_groups g on g.id = v.group_id join products p on p.id = g.product_id`,
		{ image_url: 'variants' }
	);

	await migrateColumns(
		'product variants',
		'product_variants',
		await sql`select v.id, p.store_id, v.size_chart_url from product_variants v join products p on p.id = v.product_id`,
		{ size_chart_url: 'variants' }
	);

	await migrateColumns(
		'order items',
		'order_items',
		await sql`select i.id, o.store_id, i.image_url from order_items i join orders o on o.id = i.order_id`,
		{ image_url: 'products' }
	);

	await migrateColumns(
		'store policies',
		'store_policies',
		await sql`select id, store_id, content from store_policies`,
		{ content: 'content' }
	);

	console.log(
		`\nDone. ${stats.uploaded} file(s) ${APPLY ? 'uploaded' : 'to upload'}, ${stats.rows} row(s) ${APPLY ? 'updated' : 'to update'}, ${stats.missing} missing file(s).`
	);
	if (!APPLY) console.log('Re-run with --apply to perform the migration.');
} finally {
	await sql.end();
}
