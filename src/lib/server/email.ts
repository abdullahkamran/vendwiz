/**
 * Shared email helper.
 *
 * Sends transactional email via SMTP using Nodemailer.
 * Reads credentials from env vars at call time so the module can be imported
 * in environments where SMTP is not configured (dev, test) without crashing.
 * If any required var is absent it logs a warning and returns silently.
 */

import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

type EmailInput = {
	to: string;
	subject: string;
	html: string;
	text?: string;
	/** Display name shown as the sender (e.g. the store's name); the address stays the platform's. */
	fromName?: string | null;
	/** Where the customer's reply goes (e.g. the store's contact email). */
	replyTo?: string | null;
};

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** Sender for one message: the platform's address under the store's display name. */
export function buildFrom(smtpFrom: string, fromName?: string | null): string | { name: string; address: string } {
	const address = (smtpFrom.match(/<([^>]+)>/)?.[1] ?? smtpFrom).trim();
	const name = (fromName ?? '').replace(/[\r\n"<>]/g, ' ').replace(/\s+/g, ' ').trim();
	return name ? { name, address } : smtpFrom;
}

/** The Reply-To address, or undefined when it isn't a plausible email. */
export function cleanReplyTo(replyTo?: string | null): string | undefined {
	const v = (replyTo ?? '').trim();
	return EMAIL_RE.test(v) ? v : undefined;
}

/** Platform kill switch: set EMAIL_ENABLED=false (or 0/off/no) to stop all outgoing email. */
export function emailEnabled(): boolean {
	const v = (env.EMAIL_ENABLED ?? '').trim().toLowerCase();
	return !['false', '0', 'off', 'no'].includes(v);
}

export type EmailResult = { ok: true } | { ok: false; error: string };

/** Like sendEmail, but reports whether the message was actually handed to the SMTP server. */
export async function sendEmailChecked({ to, subject, html, text, fromName, replyTo }: EmailInput): Promise<EmailResult> {
	if (!emailEnabled()) {
		console.info(`[email] Email sending is disabled (EMAIL_ENABLED); skipping send to ${to}`);
		return { ok: false, error: 'Email sending is disabled' };
	}

	const host = env.SMTP_HOST;
	const port = env.SMTP_PORT;
	const user = env.SMTP_USER;
	const pass = env.SMTP_PASS;
	const from = env.SMTP_FROM;

	if (!host || !port || !user || !pass || !from) {
		console.warn(`[email] SMTP not configured; skipping send to ${to}`);
		return { ok: false, error: 'Email is not configured on the server' };
	}

	const transporter = nodemailer.createTransport({
		host,
		port: Number(port),
		secure: Number(port) === 465,
		auth: { user, pass }
	});

	try {
		await transporter.sendMail({ from: buildFrom(from, fromName), replyTo: cleanReplyTo(replyTo), to, subject, html, text });
		return { ok: true };
	} catch (err) {
		console.error('[email] Failed to send email:', err);
		return { ok: false, error: err instanceof Error ? err.message : 'Failed to send email' };
	}
}

/** Fire-and-forget variant: never throws, resolves to nothing. */
export async function sendEmail(input: EmailInput): Promise<void> {
	await sendEmailChecked(input);
}
