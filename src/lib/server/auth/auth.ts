import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';
import { BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
import { PUBLIC_APP_URL } from '$env/static/public';
import { sendEmail } from '../email';

async function sendResetPasswordEmail({
	user,
	token
}: {
	user: { email: string };
	token: string;
	url: string;
}): Promise<void> {
	const resetUrl = `${PUBLIC_APP_URL}/reset-password?token=${token}`;
	await sendEmail({
		to: user.email,
		subject: 'Reset your VendWiz password',
		html: `<p>You requested a password reset. Click the link below to choose a new password:</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>`
	});
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: schema.users,
			session: schema.sessions,
			account: schema.accounts,
			verification: schema.verifications
		}
	}),
	baseURL: PUBLIC_APP_URL,
	secret: BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		sendResetPassword: sendResetPasswordEmail
	},
	socialProviders: {
		google: {
			clientId: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET,
			enabled: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
		}
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30, // 30 days
		updateAge: 60 * 60 * 24 // refresh if 1 day old
	}
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
