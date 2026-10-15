/**
 * Tests for the email helper.
 *
 * These verify that sendEmail is exported with the correct signature and that
 * the missing-SMTP-config guard works: when any of the five required env vars
 * is absent the function must return without throwing and must log a warning.
 * A real SMTP connection is never made — we rely on the guard branch returning
 * before nodemailer.createTransport is called.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

// Clear any SMTP vars set by a previous test run so the guard path is reliable.
function clearSmtpEnv() {
	delete process.env.SMTP_HOST;
	delete process.env.SMTP_PORT;
	delete process.env.SMTP_USER;
	delete process.env.SMTP_PASS;
	delete process.env.SMTP_FROM;
}

describe('sendEmail — module shape', () => {
	it('exports a sendEmail function', async () => {
		const mod = await import('./email');
		expect(typeof mod.sendEmail).toBe('function');
	});
});

describe('sendEmail — missing SMTP config guard', () => {
	afterEach(() => {
		clearSmtpEnv();
		vi.restoreAllMocks();
	});

	it('returns undefined (does not throw) when all SMTP vars are absent', async () => {
		clearSmtpEnv();
		const { sendEmail } = await import('./email');
		const result = await sendEmail({ to: 'a@b.com', subject: 'Hello', html: '<p>hi</p>' });
		expect(result).toBeUndefined();
	});

	it('logs a console.warn containing the recipient when SMTP vars are missing', async () => {
		clearSmtpEnv();
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { sendEmail } = await import('./email');
		await sendEmail({ to: 'test@example.com', subject: 'Hello', html: '<p>hi</p>' });
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('SMTP not configured'));
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
	});

	it('returns early when only some SMTP vars are set', async () => {
		clearSmtpEnv();
		process.env.SMTP_HOST = 'smtp.example.com';
		process.env.SMTP_PORT = '587';
		// SMTP_USER, SMTP_PASS, SMTP_FROM intentionally absent
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { sendEmail } = await import('./email');
		await expect(sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>x</p>' })).resolves.toBeUndefined();
		expect(warnSpy).toHaveBeenCalled();
	});
});

describe('buildFrom / cleanReplyTo — per-store sender identity', () => {
	it('uses the store name with the platform address', async () => {
		const { buildFrom } = await import('./email');
		expect(buildFrom('VendWiz <orders@vendwiz.com>', 'Demo Store')).toEqual({
			name: 'Demo Store',
			address: 'orders@vendwiz.com'
		});
	});

	it('strips characters that could break the header', async () => {
		const { buildFrom } = await import('./email');
		expect(buildFrom('orders@vendwiz.com', 'Evil"\r\nBcc: x <y>')).toEqual({
			name: 'Evil Bcc: x y',
			address: 'orders@vendwiz.com'
		});
	});

	it('falls back to the configured From when no store name is given', async () => {
		const { buildFrom } = await import('./email');
		expect(buildFrom('VendWiz <orders@vendwiz.com>')).toBe('VendWiz <orders@vendwiz.com>');
	});

	it('accepts a valid reply-to and rejects junk', async () => {
		const { cleanReplyTo } = await import('./email');
		expect(cleanReplyTo(' hi@store.com ')).toBe('hi@store.com');
		expect(cleanReplyTo('not an email')).toBeUndefined();
		expect(cleanReplyTo(null)).toBeUndefined();
	});
});

describe('EMAIL_ENABLED kill switch', () => {
	afterEach(() => {
		delete process.env.EMAIL_ENABLED;
		clearSmtpEnv();
		vi.restoreAllMocks();
	});

	it('is on by default and for truthy values', async () => {
		const { emailEnabled } = await import('./email');
		delete process.env.EMAIL_ENABLED;
		expect(emailEnabled()).toBe(true);
		process.env.EMAIL_ENABLED = 'true';
		expect(emailEnabled()).toBe(true);
	});

	it('is off for false/0/off/no (any case)', async () => {
		const { emailEnabled } = await import('./email');
		for (const v of ['false', 'FALSE', '0', 'off', 'No']) {
			process.env.EMAIL_ENABLED = v;
			expect(emailEnabled()).toBe(false);
		}
	});

	it('skips sending and reports disabled, even with SMTP configured', async () => {
		process.env.EMAIL_ENABLED = 'false';
		process.env.SMTP_HOST = 'smtp.example.com';
		process.env.SMTP_PORT = '587';
		process.env.SMTP_USER = 'u';
		process.env.SMTP_PASS = 'p';
		process.env.SMTP_FROM = 'a@b.com';
		vi.spyOn(console, 'info').mockImplementation(() => {});
		const { sendEmailChecked } = await import('./email');
		const res = await sendEmailChecked({ to: 'x@y.com', subject: 's', html: '<p>x</p>' });
		expect(res).toEqual({ ok: false, error: 'Email sending is disabled' });
	});
});
