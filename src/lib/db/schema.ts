import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  pgEnum,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// ── Enums ────────────────────────────────────────────────────────────────────

export const themeEnum = pgEnum('theme', ['minimal', 'bold', 'playful']);
export const policyTypeEnum = pgEnum('policy_type', ['return', 'shipping', 'terms', 'faq']);
export const discountTypeEnum = pgEnum('discount_type', ['fixed', 'percent']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'processing',
  'dispatched',
  'completed',
  'cancelled'
]);

// ── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name').notNull().default(''),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  store: one(stores, { fields: [users.id], references: [stores.ownerId] })
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ── Sessions (better-auth) ────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

export type Session = typeof sessions.$inferSelect;

// ── Accounts (better-auth OAuth) ─────────────────────────────────────────────

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] })
}));

export type Account = typeof accounts.$inferSelect;

// ── Verification (better-auth) ────────────────────────────────────────────────

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ── Stores ────────────────────────────────────────────────────────────────────

export const stores = pgTable('stores', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subdomain: text('subdomain').notNull().unique(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  theme: themeEnum('theme').notNull().default('minimal'),
  themeCustomHex: text('theme_custom_hex'),
  announcementBarText: text('announcement_bar_text'),
  announcementBarEnabled: boolean('announcement_bar_enabled').notNull().default(false),
  whatsapp: text('whatsapp'),
  instagram: text('instagram'),
  facebook: text('facebook'),
  contactEmail: text('contact_email'),
  isActive: boolean('is_active').notNull().default(true),
  licenseCode: text('license_code'),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (t) => [
  uniqueIndex('stores_subdomain_idx').on(t.subdomain)
]);

export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, { fields: [stores.ownerId], references: [users.id] }),
  policies: many(storePolicies),
  categories: many(categories),
  products: many(products),
  discountCodes: many(discountCodes),
  shippingConfig: one(shippingConfig),
  orders: many(orders),
  reviews: many(reviews)
}));

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;

// ── Store Policies ────────────────────────────────────────────────────────────

export const storePolicies = pgTable('store_policies', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  storeId: text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  type: policyTypeEnum('type').notNull(),
  content: text('content').notNull().default(''),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const storePoliciesRelations = relations(storePolicies, ({ one }) => ({
  store: one(stores, { fields: [storePolicies.storeId], references: [stores.id] })
}));

export type StorePolicy = typeof storePolicies.$inferSelect;

// ── Categories ────────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  storeId: text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (t) => [
  index('categories_store_idx').on(t.storeId)
]);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  store: one(stores, { fields: [categories.storeId], references: [stores.id] }),
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'parent' }),
  children: many(categories, { relationName: 'parent' }),
  products: many(products)
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

// ── Products ──────────────────────────────────────────────────────────────────

export const products = pgTable('products', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  storeId: text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull().default('0'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  youtubeUrl: text('youtube_url'),
  isActive: boolean('is_active').notNull().default(true),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (t) => [
  index('products_store_idx').on(t.storeId),
  index('products_slug_store_idx').on(t.storeId, t.slug)
]);

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  variants: many(productVariants),
  attributes: many(productAttributes),
  reviews: many(reviews)
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// ── Product Images ────────────────────────────────────────────────────────────

export const productImages = pgTable('product_images', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0)
});

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] })
}));

export type ProductImage = typeof productImages.$inferSelect;

// ── Product Variants ──────────────────────────────────────────────────────────

export const productVariants = pgTable('product_variants', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // options: [{ label: string, price_modifier: number }]
  options: jsonb('options').notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] })
}));

export type ProductVariant = typeof productVariants.$inferSelect;
export type VariantOption = { label: string; price_modifier: number };

// ── Product Attributes ────────────────────────────────────────────────────────

export const productAttributes = pgTable('product_attributes', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  value: text('value').notNull()
});

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, { fields: [productAttributes.productId], references: [products.id] })
}));

export type ProductAttribute = typeof productAttributes.$inferSelect;

// ── Discount Codes ────────────────────────────────────────────────────────────

export const discountCodes = pgTable('discount_codes', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  storeId: text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  type: discountTypeEnum('type').notNull(),
  value: numeric('value', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  usageLimit: integer('usage_limit'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (t) => [
  uniqueIndex('discount_codes_store_code_idx').on(t.storeId, t.code)
]);

export const discountCodesRelations = relations(discountCodes, ({ one }) => ({
  store: one(stores, { fields: [discountCodes.storeId], references: [stores.id] })
}));

export type DiscountCode = typeof discountCodes.$inferSelect;
export type NewDiscountCode = typeof discountCodes.$inferInsert;

// ── Shipping Config ───────────────────────────────────────────────────────────

export const shippingConfig = pgTable('shipping_config', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  storeId: text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }).unique(),
  flatRate: numeric('flat_rate', { precision: 10, scale: 2 }).notNull().default('0'),
  freeShippingThreshold: numeric('free_shipping_threshold', { precision: 10, scale: 2 }),
  taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const shippingConfigRelations = relations(shippingConfig, ({ one }) => ({
  store: one(stores, { fields: [shippingConfig.storeId], references: [stores.id] })
}));

export type ShippingConfig = typeof shippingConfig.$inferSelect;

// ── Orders ────────────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  storeId: text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  orderRef: text('order_ref').notNull().unique(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  // items: [{ productId, title, slug, imageUrl, price, quantity, variantSelections }]
  items: jsonb('items').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  shippingFee: numeric('shipping_fee', { precision: 10, scale: 2 }).notNull().default('0'),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  discountCode: text('discount_code'),
  status: orderStatusEnum('status').notNull().default('pending'),
  whatsappSent: boolean('whatsapp_sent').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (t) => [
  index('orders_store_idx').on(t.storeId),
  index('orders_ref_idx').on(t.orderRef)
]);

export const ordersRelations = relations(orders, ({ one }) => ({
  store: one(stores, { fields: [orders.storeId], references: [stores.id] })
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = {
  productId: string;
  title: string;
  slug: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  variantSelections?: Record<string, string>;
};

// ── Reviews ───────────────────────────────────────────────────────────────────

export const reviews = pgTable('reviews', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  storeId: text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  customerName: text('customer_name').notNull(),
  rating: integer('rating').notNull(),
  text: text('text'),
  isApproved: boolean('is_approved').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (t) => [
  index('reviews_product_idx').on(t.productId),
  index('reviews_store_idx').on(t.storeId)
]);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  store: one(stores, { fields: [reviews.storeId], references: [stores.id] })
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
