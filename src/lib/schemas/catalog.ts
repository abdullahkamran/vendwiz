import { z } from 'zod';

/** An image reference: a full https/http link, or a file uploaded through the admin (/uploads/…). */
export const IMAGE_REF = /^(https?:\/\/\S+|\/uploads\/(?!.*\.\.)[\w\-./]+)$/;

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  sortOrder: z.number().int().default(0),
  parentId: z.string().nullable().optional(),
  imageUrl: z
    .string()
    .regex(IMAGE_REF, 'Use an https:// image link or upload an image')
    .nullable()
    .optional()
});

export const variantOptionSchema = z.object({
  // label may be empty for colour-group options: the PUT handler auto-populates
  // it from colorHex when the variant name matches /colou?r/i and label === ''.
  label: z.string(),
  price_modifier: z.number().default(0),
  // stockQty per option is passed through from the edit form so the PUT handler
  // can preserve existing stock rather than hard-coding 0.
  stockQty: z.number().int().min(0).default(0),
  // colorHex is set for colour-group options; used as the productOptionValue.value
  // so the storefront swatch can render background:{val.value}.
  // Constrained to #RRGGBB to prevent CSS injection via the style attribute.
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  // Optional image shown on the storefront when this colour is selected ('' = none)
  imageUrl: z.string().optional().nullable()
});

export const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  // min(1) was intentionally removed: the PUT handler must accept options:[] for
  // existing variants (edit-page load reconstructs a synthetic option, but direct
  // API calls and backwards-compat clients may omit options entirely).
  options: z.array(variantOptionSchema),
  sizeChartUrl: z.string().url().startsWith('https://', { message: 'Size chart URL must use HTTPS' }).optional().or(z.literal(''))
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
  // Optional sale price; must be lower than basePrice (checked by the API / admin form)
  salePrice: z.number().min(0).nullable().optional(),
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
