import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		environment: 'node',
		exclude: [...configDefaults.exclude, 'e2e/**', '**/.features-gen/**']
	},
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			'$env/dynamic/private': path.resolve('./src/test/env-dynamic-private.ts')
		}
	}
});
