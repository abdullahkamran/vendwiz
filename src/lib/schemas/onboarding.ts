import { z } from 'zod';

export const verifyCodeSchema = z.object({
	code: z.string().min(1, 'License code is required').trim()
});

export const subdomainSchema = z.object({
	subdomain: z
		.string()
		.regex(
			/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/,
			'Subdomain must be 3–30 characters, start and end with a letter or number'
		)
});

export const createStoreSchema = z.object({
	licenseCode: z.string().min(1, 'License code is required'),
	subdomain: z
		.string()
		.regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/, 'Invalid subdomain format'),
	name: z.string().min(2, 'Store name must be at least 2 characters').max(60, 'Store name too long'),
	description: z.string().max(500, 'Description too long').optional(),
	theme: z.enum(['minimal', 'bold', 'playful']).default('minimal')
});

export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type SubdomainInput = z.infer<typeof subdomainSchema>;
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
