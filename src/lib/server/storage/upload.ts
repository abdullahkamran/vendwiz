import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'static/uploads';

export async function saveImage(
	buffer: Buffer,
	folder: string,
	options?: { width?: number; height?: number; quality?: number }
): Promise<string> {
	await mkdir(join(UPLOAD_DIR, folder), { recursive: true });

	const filename = `${nanoid()}.webp`;
	const filePath = join(UPLOAD_DIR, folder, filename);

	let pipeline = sharp(buffer);

	if (options?.width || options?.height) {
		pipeline = pipeline.resize(options.width, options.height, { fit: 'inside', withoutEnlargement: true });
	}

	await pipeline
		.webp({ quality: options?.quality ?? 85 })
		.toFile(filePath);

	return `/uploads/${folder}/${filename}`;
}

export async function saveFile(buffer: Buffer, folder: string, originalName: string): Promise<string> {
	await mkdir(join(UPLOAD_DIR, folder), { recursive: true });
	const ext = extname(originalName);
	const filename = `${nanoid()}${ext}`;
	const filePath = join(UPLOAD_DIR, folder, filename);
	await writeFile(filePath, buffer);
	return `/uploads/${folder}/${filename}`;
}
