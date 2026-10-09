/**
 * Shared email helper.
 *
 * Sends transactional email via SMTP using Nodemailer.
 * Reads credentials from env vars at call time so the module can be imported
 * in environments where SMTP is not configured (dev, test) without crashing.
 * If any required var is absent it logs a warning and returns silently.
 */

import nodemailer from 'nodemailer';

export async function sendEmail({
	to,
	subject,
	html
}: {
	to: string;
	subject: string;
	html: string;
}): Promise<void> {
	const host = process.env.SMTP_HOST;
	const port = process.env.SMTP_PORT;
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	const from = process.env.SMTP_FROM;

	if (!host || !port || !user || !pass || !from) {
		console.warn(`[email] SMTP not configured; skipping send to ${to}`);
		return;
	}

	const transporter = nodemailer.createTransport({
		host,
		port: Number(port),
		secure: Number(port) === 465,
		auth: { user, pass }
	});

	try {
		await transporter.sendMail({ from, to, subject, html });
	} catch (err) {
		console.error('[email] Failed to send email:', err);
	}
}
