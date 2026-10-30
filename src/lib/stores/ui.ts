import { writable } from 'svelte/store';

/** Slide-in cart panel. Opened after an item is actually added to the cart. */
export const cartDrawerOpen = writable(false);
