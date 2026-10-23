import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isUploadFolder, saveImage } from '$lib/server/storage/upload';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }
  if (!locals.store) {
    return error(403, 'No store found for this account');
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

  // Which folder of the store's uploads this goes into (products, categories, …)
  const folder = formData.get('folder') ?? 'products';
  if (!isUploadFolder(folder)) {
    return error(400, 'Invalid upload folder');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_SIZE) {
    return error(400, 'File too large (max 10MB)');
  }

  let url: string;
  try {
    url = await saveImage(buffer, { storeId: locals.store.id, folder }, { width: 1200, height: 1200, quality: 85 });
  } catch (err) {
    console.error('Image upload failed', err);
    return error(400, 'Could not process this image');
  }

  return json({ url }, { status: 201 });
};
