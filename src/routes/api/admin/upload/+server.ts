import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { nanoid } from 'nanoid';

const UPLOAD_DIR = 'static/uploads';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return error(400, 'Expected multipart/form-data');
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return error(400, 'Failed to parse form data');
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return error(400, 'No file provided');
  }

  if (!file.type.startsWith('image/')) {
    return error(400, 'Only image files are allowed');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_SIZE) {
    return error(400, 'File too large (max 10MB)');
  }

  // Ensure upload dir exists
  const uploadPath = join(process.cwd(), UPLOAD_DIR);
  await mkdir(uploadPath, { recursive: true });

  const filename = `${nanoid()}.webp`;
  const filepath = join(uploadPath, filename);

  try {
    // Use sharp to convert to webp
    const sharp = (await import('sharp')).default;
    const webpBuffer = await sharp(buffer)
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    await writeFile(filepath, webpBuffer);
  } catch {
    // Fallback: save original if sharp fails
    await writeFile(filepath, buffer);
  }

  const url = `/uploads/${filename}`;
  return json({ url }, { status: 201 });
};
