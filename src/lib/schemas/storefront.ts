import { z } from 'zod';

export const checkoutSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(7).max(20),
  customerEmail: z.string().email(),
  shippingAddress: z.string().min(10).max(500),
  notes: z.string().max(500).optional(),
  discountCode: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        title: z.string(),
        slug: z.string(),
        imageUrl: z.string().optional(),
        price: z.number().positive(),
        quantity: z.number().int().positive(),
        variantSelections: z.record(z.string(), z.string()).optional()
      })
    )
    .min(1)
});

export const reviewSchema = z.object({
  productId: z.string(),
  customerName: z.string().min(2).max(100),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1000).optional()
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
