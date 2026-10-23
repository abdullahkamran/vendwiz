import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		// Listen on all interfaces so the dev server is reachable from phones on the LAN
		host: true,
		allowedHosts: ['.nip.io']
	},
});
