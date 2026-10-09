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
