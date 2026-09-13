import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/db';
import { stores } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { sequence } from '@sveltejs/kit/hooks';

const subdomain: Handle = async ({ event, resolve }) => {
  const host = event.request.headers.get('host') ?? '';
  // extract subdomain — e.g. "mystore" from "mystore.vendwiz.com"
  // In dev: mystore.localhost:5173
  const parts = host.split('.');
  const isSubdomain = parts.length >= 3 || (host.includes('.localhost') && parts.length >= 2);

  if (isSubdomain) {
    const sub = parts[0];
    if (sub && sub !== 'www') {
      const store = await db
        .select()
        .from(stores)
        .where(eq(stores.subdomain, sub))
        .limit(1)
        .then((r) => r[0] ?? null);
      event.locals.store = store;
      event.locals.isStorefront = true;
    } else {
      event.locals.store = null;
      event.locals.isStorefront = false;
    }
  } else {
    event.locals.store = null;
    event.locals.isStorefront = false;
  }

  // Ensure user is always initialized
  (event.locals as App.Locals).user ??= null;

  return resolve(event);
};

// TODO: wire better-auth session handler here
export const handle = sequence(subdomain);
