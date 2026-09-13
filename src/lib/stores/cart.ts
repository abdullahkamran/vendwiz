import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface CartItem {
  productId: string;
  title: string;
  slug: string;
  imageUrl?: string;
  price: number; // final price (base + variant modifier)
  quantity: number;
  variantSelections?: Record<string, string>; // { "Size": "Large", "Color": "Red" }
}

function createCart() {
  const stored = browser ? localStorage.getItem('vendwiz_cart') : null;
  const initial: CartItem[] = stored ? JSON.parse(stored) : [];
  const { subscribe, set, update } = writable<CartItem[]>(initial);

  return {
    subscribe,
    addItem(item: CartItem) {
      update((items) => {
        const key = `${item.productId}_${JSON.stringify(item.variantSelections ?? {})}`;
        const existing = items.find(
          (i) => `${i.productId}_${JSON.stringify(i.variantSelections ?? {})}` === key
        );
        let next: CartItem[];
        if (existing) {
          next = items.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + item.quantity } : i
          );
        } else {
          next = [...items, item];
        }
        if (browser) localStorage.setItem('vendwiz_cart', JSON.stringify(next));
        return next;
      });
    },
    removeItem(productId: string, variantSelections?: Record<string, string>) {
      update((items) => {
        const next = items.filter(
          (i) =>
            !(
              i.productId === productId &&
              JSON.stringify(i.variantSelections ?? {}) === JSON.stringify(variantSelections ?? {})
            )
        );
        if (browser) localStorage.setItem('vendwiz_cart', JSON.stringify(next));
        return next;
      });
    },
    updateQuantity(
      productId: string,
      quantity: number,
      variantSelections?: Record<string, string>
    ) {
      update((items) => {
        const next =
          quantity <= 0
            ? items.filter((i) => i.productId !== productId)
            : items.map((i) =>
                i.productId === productId &&
                JSON.stringify(i.variantSelections ?? {}) === JSON.stringify(variantSelections ?? {})
                  ? { ...i, quantity }
                  : i
              );
        if (browser) localStorage.setItem('vendwiz_cart', JSON.stringify(next));
        return next;
      });
    },
    clear() {
      set([]);
      if (browser) localStorage.removeItem('vendwiz_cart');
    }
  };
}

export const cart = createCart();

// Separate discount store for cart page
export interface CartDiscount {
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  amount: number; // computed discount amount
}

function createCartDiscount() {
  const stored = browser ? localStorage.getItem('vendwiz_discount') : null;
  const initial: CartDiscount | null = stored ? JSON.parse(stored) : null;
  const { subscribe, set } = writable<CartDiscount | null>(initial);

  return {
    subscribe,
    apply(discount: CartDiscount) {
      set(discount);
      if (browser) localStorage.setItem('vendwiz_discount', JSON.stringify(discount));
    },
    clear() {
      set(null);
      if (browser) localStorage.removeItem('vendwiz_discount');
    }
  };
}

export const cartDiscount = createCartDiscount();
