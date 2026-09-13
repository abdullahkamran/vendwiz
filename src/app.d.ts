import type { Session, User } from '$lib/server/auth/auth';
import type { InferSelectModel } from 'drizzle-orm';
import type { stores } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			session: Session | null;
			user: User | null;
			/** Set on storefront subdomain requests */
			storefront: (InferSelectModel<typeof stores> & { owner: User }) | null;
			subdomain: string | null;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
		}
	}
}

export {};
