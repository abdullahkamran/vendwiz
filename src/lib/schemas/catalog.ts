import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  sortOrder: z.number().int().default(0)
});

export const variantOptionSchema = z.object({
  label: z.string().min(1),
  price_modifier: z.number().default(0),
  // stockQty per option is passed through from the edit form so the PUT handler
  // can preserve existing stock rather than hard-coding 0.
  stockQty: z.number().int().min(0).default(0)
});

export const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  options: z.array(variantOptionSchema).min(1)
});

export const attributeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  value: z.string().min(1)
});

export const productSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  categoryId: z.string().optional().nullable(),
  basePrice: z.number().min(0),
  description: z.string().optional(),
  // SEO fields stored as seoTitle / seoDescription in DB
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  youtubeUrl: z.string().url().optional().or(z.literal('')),
  isPublished: z.boolean().default(true),
  stockQty: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  images: z.array(z.object({ url: z.string(), sortOrder: z.number() })),
  variants: z.array(variantSchema),
  attributes: z.array(attributeSchema)
});

export const reorderSchema = z.array(z.object({
  id: z.string(),
  sortOrder: z.number().int()
}));

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
export type AttributeInput = z.infer<typeof attributeSchema>;
