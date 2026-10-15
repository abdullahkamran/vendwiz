import { browser } from '$app/environment';

/** An order the customer placed from this browser, kept so they can track it later. */
export interface RecentOrder {
  ref: string;
  placedAt: string; // ISO timestamp
}

const MAX_ORDERS = 20;
const keyFor = (storeKey: string) => `vendwiz_orders_${storeKey}`;

export function getRecentOrders(storeKey: string): RecentOrder[] {
  if (!browser) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(storeKey)) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((o) => o && typeof o.ref === 'string' && typeof o.placedAt === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Newest first, de-duplicated by ref, capped at MAX_ORDERS. */
export function saveRecentOrder(storeKey: string, ref: string): void {
  if (!browser) return;
  try {
    const next = [
      { ref, placedAt: new Date().toISOString() },
      ...getRecentOrders(storeKey).filter((o) => o.ref !== ref)
    ].slice(0, MAX_ORDERS);
    localStorage.setItem(keyFor(storeKey), JSON.stringify(next));
  } catch {
    // storage unavailable (private mode / quota) — tracking by typing the ref still works
  }
}
