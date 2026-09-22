import type { Session, User } from '$lib/server/auth/auth';
import type { InferSelectModel } from 'drizzle-orm';
import type { stores } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			session: Session['session'] | null;
			user: User | null;
			/** Set on storefront subdomain requests */
			storefront: (InferSelectModel<typeof stores> & { owner: User }) | null;
			subdomain: string | null;
			/**
			 * Convenience alias: equals `storefront` on subdomain requests, or the
			 * authenticated user's own store on admin/API requests.
			 */
			store: (InferSelectModel<typeof stores> & { owner?: User }) | null;
			/** True when the current request is a storefront subdomain request. */
			isStorefront: boolean;
		}
		interface PageData {
			session: Session['session'] | null;
			user: User | null;
		}
	}
}

export {};
