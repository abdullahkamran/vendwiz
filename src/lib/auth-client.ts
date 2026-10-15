import { createAuthClient } from 'better-auth/svelte';
import { browser } from '$app/environment';
import { PUBLIC_APP_URL } from '$env/static/public';

// Call the auth API on the origin the page was loaded from. Using PUBLIC_APP_URL in the
// browser makes every request cross-origin whenever the site is opened on a different host
// (localhost, a store subdomain, a changed LAN IP), and the browser's CORS preflight
// (OPTIONS) to /api/auth/* gets a 404 because SvelteKit has no OPTIONS handler.
export const authClient = createAuthClient({
	baseURL: browser ? window.location.origin : PUBLIC_APP_URL
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
