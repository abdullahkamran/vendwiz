import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'vendwiz-dark-mode';

function createDarkModeStore() {
  // Read initial value from localStorage (browser only)
  const initial = browser
    ? localStorage.getItem(STORAGE_KEY) === 'true'
    : false;

  const { subscribe, set, update } = writable<boolean>(initial);

  return {
    subscribe,
    toggle() {
      update((v) => {
        const next = !v;
        if (browser) localStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
    },
    set(value: boolean) {
      if (browser) localStorage.setItem(STORAGE_KEY, String(value));
      set(value);
    }
  };
}

export const darkMode = createDarkModeStore();
