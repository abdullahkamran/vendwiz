import type { Session, User } from '$lib/server/auth/auth';
import type { InferSelectModel } from 'drizzle-orm';
import type { stores } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			session: Session['session'] | null;
			user: User | null;
			/** The store for this request — set via subdomain on storefront requests, or via authenticated user on admin/API requests. */
			store: (InferSelectModel<typeof stores> & { owner?: User }) | null;
			/** True when the current request is a storefront subdomain request. */
			isStorefront: boolean;
			subdomain: string | null;
		}
		interface PageData {
			session: Session['session'] | null;
			user: User | null;
		}
	}
}

export {};
