import { z } from 'zod';

export const orderStatusSchema = z.object({
	status: z.enum(['pending', 'processing', 'dispatched', 'completed', 'cancelled']),
	notes: z.string().max(500).optional()
});

export const analyticsQuerySchema = z.object({
	from: z.string().datetime(),
	to: z.string().datetime()
});

export const orderNotesSchema = z.object({
	notes: z.string().max(500)
});
