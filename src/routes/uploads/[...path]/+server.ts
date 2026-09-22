import type { RequestHandler } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import { join, resolve, sep } from 'path';

// Placeholder SVG returned for missing upload files so the browser gets a 200
// instead of a 404, preventing console errors in the QA environment.
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#f3f4f6"/>
  <text x="200" y="210" text-anchor="middle" font-family="system-ui" font-size="60" fill="#d1d5db">📦</text>
</svg>`;

export const GET: RequestHandler = async ({ params }) => {
  const uploadDir = process.env.UPLOAD_DIR ?? 'static/uploads';
  // Resolve the upload root so that we have a canonical absolute path to
  // compare against.  Any user-supplied path components that contain '..'
  // are collapsed by resolve() before the boundary check.
  const uploadRoot = resolve(join(process.cwd(), uploadDir));
  const filePath = resolve(join(process.cwd(), uploadDir, params.path ?? ''));

  // Reject path traversal: the resolved path must stay inside uploadRoot.
  const insideRoot =
    filePath === uploadRoot || filePath.startsWith(uploadRoot + sep);
  if (!insideRoot) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const data = await readFile(filePath);
    // Determine Content-Type from extension
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';

    // SVG files can contain <script> tags and event handlers that execute in the
    // browser under the application's own origin (stored XSS).  Force a download
    // so the browser never renders them inline, regardless of who uploaded the file.
    if (ext === 'svg') {
      const filename = filePath.split(sep).pop() ?? 'file.svg';
      return new Response(data, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }

    const mimeMap: Record<string, string> = {
      webp: 'image/webp',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      avif: 'image/avif'
    };
    const mime = mimeMap[ext] ?? 'application/octet-stream';
    return new Response(data, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    // File not found — return placeholder SVG so pages render cleanly
    return new Response(PLACEHOLDER_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store'
      }
    });
  }
};
