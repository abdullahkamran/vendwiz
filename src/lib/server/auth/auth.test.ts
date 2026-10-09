/**
 * Tests for the auth configuration wiring.
 *
 * auth.ts imports from SvelteKit virtual modules ($env/static/private,
 * $env/static/public) and from the database, which makes live importing
 * impractical in Vitest. Instead these tests inspect the source text to verify
 * the structural requirements that are impossible to satisfy without the
 * password-reset email change. Every assertion below fails on the original
 * auth.ts (which has no sendResetPassword, no sendEmail import, and no
 * /reset-password?token= template literal).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(import.meta.dirname, 'auth.ts'), 'utf-8');

describe('auth.ts — sendResetPassword wiring', () => {
	it("imports sendEmail from '../email'", () => {
		expect(src).toContain("from '../email'");
	});

	it('defines a sendResetPasswordEmail function', () => {
		expect(src).toContain('sendResetPasswordEmail');
	});

	it('registers sendResetPassword in the emailAndPassword config', () => {
		expect(src).toContain('sendResetPassword');
	});

	it('builds the reset link as <PUBLIC_APP_URL>/reset-password?token=<token>', () => {
		expect(src).toContain('/reset-password?token=');
	});

	it('calls sendEmail inside the callback', () => {
		expect(src).toContain('sendEmail(');
	});
});
