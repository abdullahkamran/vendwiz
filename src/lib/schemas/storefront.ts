import { z } from 'zod';

export const checkoutSchema = z.object({
  // Messages are shown to customers as-is (checkout form + API), so keep them human-readable
  customerName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .min(2, 'Please enter your full name')
    .max(100, 'Name is too long (100 characters max)'),
  // Stored as one string including the country code, e.g. "+923001234567" (no separate column)
  customerPhone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(/^\+[1-9]\d{7,14}$/, 'Please enter a valid phone number'),
  customerEmail: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  shippingAddress: z
    .string()
    .trim()
    .min(1, 'Delivery address is required')
    .min(10, 'Please enter your complete address (street, area and city)')
    .max(500, 'Address is too long (500 characters max)'),
  notes: z.string().max(500, 'Notes are too long (500 characters max)').optional(),
  // Defaults to cash on delivery, so older clients that don't send it still work
  paymentMethod: z.enum(['cod', 'bank_transfer']).default('cod'),
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
    .min(1, 'Your cart is empty')
});

export const reviewSchema = z.object({
  productId: z.string(),
  reviewerName: z.string().trim().min(1, 'Your name is required').min(2, 'Please enter your name').max(100, 'Name is too long (100 characters max)'),
  // Required for duplicate-review prevention (email-based per product per store)
  reviewerEmail: z.string().email('Please enter a valid email address'),
  rating: z.number().int().min(1, 'Please choose a star rating').max(5, 'Please choose a star rating'),
  body: z.string().max(1000, 'Review is too long (1000 characters max)').optional()
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
