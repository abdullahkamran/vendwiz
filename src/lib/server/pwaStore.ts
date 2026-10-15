import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { stores } from '$lib/server/db/schema';

// Accept only leading-slash paths composed of safe characters; anything else
// falls back to '' so the manifest scope defaults to the origin root.
export function normaliseBase(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || !/^\/([A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*)?$/.test(trimmed)) return '';
  return trimmed.replace(/\/+$/, '');
}

type Store = NonNullable<App.Locals['store']>;

/**
 * The store a PWA manifest/icon request is for. On subdomain access the hook has
 * already resolved it. On path-based access (/store/<slug>) the manifest itself is
 * served from /manifest.json, so the slug has to be recovered from the ?base= param.
 */
export async function resolvePwaStore(
  locals: App.Locals,
  base: string
): Promise<Store | null> {
  if (locals.isStorefront && locals.store) return locals.store;
  const m = base.match(/^\/store\/([^/]+)/);
  if (!m) return null;
  const row = await db.query.stores.findFirst({
    where: eq(stores.subdomain, m[1]),
    with: { owner: true }
  });
  return (row as Store | undefined) ?? null;
}
