import type { Store } from '$lib/db/schema';

declare global {
  namespace App {
    interface Locals {
      store: Store | null;
      isStorefront: boolean;
      user: { id: string; email: string; name: string } | null;
    }
    interface PageData {}
    interface Error {}
    interface Platform {}
  }
}
export {};
