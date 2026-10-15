import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Legacy URLs from manifests cached before icons became per-store
// (manifest.json used to reference /pwa/*.png). Forward to the per-store renderer.
const MAP: Record<string, string> = {
  'icon-192.png': '192',
  'icon-512.png': '512',
  'screenshot-wide.png': 'wide',
  'screenshot-narrow.png': 'narrow'
};

export const GET: RequestHandler = ({ params }) => {
  const kind = MAP[params.file];
  if (!kind) error(404, 'Not Found');
  redirect(302, `/manifest-icon/${kind}`);
};
