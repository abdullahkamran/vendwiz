import { json, error } from '@sveltejs/kit';
import { Buffer } from 'node:buffer';
import { saveImage } from '$lib/server/storage/upload';
import type { RequestHandler } from './$types';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.includes('multipart/form-data')) {
		throw error(400, 'Expected multipart/form-data');
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		throw error(400, 'Invalid form data');
	}

	const file = formData.get('file') as File | null;
	const type = (formData.get('type') as string) ?? 'general';

	if (!file || typeof file === 'string') {
		throw error(400, 'No file provided');
	}

	// Validate file type
	if (!file.type.startsWith('image/')) {
		throw error(400, 'Only image files are allowed');
	}

	// Validate file size
	if (file.size > MAX_SIZE) {
		throw error(400, `File size must be less than 5MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	let options: { width?: number; height?: number; quality?: number } = {};

	if (type === 'logo') {
		options = { width: 400, quality: 90 };
	} else if (type === 'favicon') {
		options = { width: 64, height: 64, quality: 90 };
	} else {
		options = { width: 1200, quality: 85 };
	}

	const url = await saveImage(buffer, type, options);

	return json({ url });
};
