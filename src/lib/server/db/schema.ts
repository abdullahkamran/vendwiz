import { pgTable, text, integer, boolean, timestamp, jsonb, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum('order_status', [
	'pending',
	'processing',
	'dispatched',
	'completed',
	'cancelled'
]);

export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'hidden']);

export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed']);

// ─── Auth (better-auth compatible) ───────────────────────────────────────────

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	name: text('name').notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' })
});

export const accounts = pgTable('accounts', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const verifications = pgTable('verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ─── Theme enum ───────────────────────────────────────────────────────────────

export const STORE_THEMES = ['basic', 'minimal', 'bold', 'playful', 'custom'] as const;
export type StoreTheme = (typeof STORE_THEMES)[number];

// ─── Stores (multi-tenant) ────────────────────────────────────────────────────

export const stores = pgTable('stores', {
	id: text('id').primaryKey(),
	ownerId: text('owner_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	subdomain: text('subdomain').notNull().unique(), // e.g. "mystore" → mystore.vendwiz.com
	name: text('name').notNull(),
	description: text('description'),
	logoUrl: text('logo_url'),
	faviconUrl: text('favicon_url'),
	// Theme: 'basic' | 'minimal' | 'bold' | 'playful' | 'custom'
	theme: text('theme', { enum: STORE_THEMES }).notNull().default('basic'),
	customTheme: jsonb('custom_theme'), // { primaryColor, secondaryColor, fontFamily, ... }
	// Social links
	whatsapp: text('whatsapp'),
	instagram: text('instagram'),
	facebook: text('facebook'),
	contactEmail: text('contact_email'),
	contactPhone: text('contact_phone'),
	// Announcement bar
	announcementEnabled: boolean('announcement_enabled').notNull().default(false),
	announcementText: text('announcement_text'),
	announcementBg: text('announcement_bg').default('#1a1a2e'),
	announcementFg: text('announcement_fg').default('#ffffff'),
	// Shipping & taxes
	shippingFee: numeric('shipping_fee', { precision: 10, scale: 2 }).notNull().default('0'),
	freeShippingThreshold: numeric('free_shipping_threshold', { precision: 10, scale: 2 }),
	taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).notNull().default('0'), // 0.18 = 18%
	taxLabel: text('tax_label').default('Tax'), // GST / VAT / Sales Tax
	// SEO
	seoTitle: text('seo_title'),
	seoDescription: text('seo_description'),
	// Licensing
	isActive: boolean('is_active').notNull().default(false), // unlocked by verification code
	verificationCode: text('verification_code'), // store the code used
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// License/verification codes pool (managed by Vendwiz platform admin)
export const licenseKeys = pgTable('license_keys', {
	id: text('id').primaryKey(),
	code: text('code').notNull().unique(),
	usedByStoreId: text('used_by_store_id').references(() => stores.id),
	usedAt: timestamp('used_at'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// Store policy pages (return policy, shipping info, TOS, FAQ)
export const storePolicies = pgTable('store_policies', {
	id: text('id').primaryKey(),
	storeId: text('store_id')
		.notNull()
		.references(() => stores.id, { onDelete: 'cascade' }),
	type: text('type').notNull(), // 'return_refund' | 'shipping' | 'terms' | 'faq'
	title: text('title').notNull(),
	content: text('content').notNull(), // HTML from WYSIWYG
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
	id: text('id').primaryKey(),
	storeId: text('store_id')
		.notNull()
		.references(() => stores.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	slug: text('slug').notNull(),
	description: text('description'),
	imageUrl: text('image_url'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = pgTable('products', {
	id: text('id').primaryKey(),
	storeId: text('store_id')
		.notNull()
		.references(() => stores.id, { onDelete: 'cascade' }),
	categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
	title: text('title').notNull(),
	slug: text('slug').notNull(),
	description: text('description'),
	basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
	// Media
	images: jsonb('images').notNull().default('[]'), // [{ url, alt, order }]
	youtubeUrl: text('youtube_url'),
	// Inventory (base / when no variants)
	stockQty: integer('stock_qty').notNull().default(0),
	lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
	trackInventory: boolean('track_inventory').notNull().default(true),
	// SEO
	seoTitle: text('seo_title'),
	seoDescription: text('seo_description'),
	// Sale pricing: set a salePrice to mark a product as "on sale"
	salePrice: numeric('sale_price', { precision: 10, scale: 2 }),
	isPublished: boolean('is_published').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Product variant option groups (e.g., "Size", "Color")
export const productOptionGroups = pgTable('product_option_groups', {
	id: text('id').primaryKey(),
	productId: text('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	name: text('name').notNull(), // "Size" | "Color"
	sortOrder: integer('sort_order').notNull().default(0)
});

// Individual option values (e.g., "S", "M", "L", "Red", "Blue")
export const productOptionValues = pgTable('product_option_values', {
	id: text('id').primaryKey(),
	groupId: text('group_id')
		.notNull()
		.references(() => productOptionGroups.id, { onDelete: 'cascade' }),
	value: text('value').notNull(), // "S" | "Red"
	sortOrder: integer('sort_order').notNull().default(0)
});

// Variants: the actual SKU combinations
export const productVariants = pgTable('product_variants', {
	id: text('id').primaryKey(),
	productId: text('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	// Combination of option value IDs, stored as JSON array
	optionValueIds: jsonb('option_value_ids').notNull(), // ["optionValueId1", "optionValueId2"]
	label: text('label').notNull(), // "S / Red" — computed display label
	price: numeric('price', { precision: 10, scale: 2 }), // null = use basePrice
	stockQty: integer('stock_qty').notNull().default(0),
	sku: text('sku')
});

// Product specification attributes (e.g., Material: Cotton, Weight: 200g)
export const productAttributes = pgTable('product_attributes', {
	id: text('id').primaryKey(),
	productId: text('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	name: text('name').notNull(), // "Material"
	value: text('value').notNull(), // "100% Cotton"
	sortOrder: integer('sort_order').notNull().default(0)
});

// ─── Discounts ────────────────────────────────────────────────────────────────

export const discountCodes = pgTable('discount_codes', {
	id: text('id').primaryKey(),
	storeId: text('store_id')
		.notNull()
		.references(() => stores.id, { onDelete: 'cascade' }),
	code: text('code').notNull(), // "WINTER20"
	type: discountTypeEnum('type').notNull(), // 'percentage' | 'fixed'
	value: numeric('value', { precision: 10, scale: 2 }).notNull(), // 20 or 5.00
	minOrderAmount: numeric('min_order_amount', { precision: 10, scale: 2 }),
	usageLimit: integer('usage_limit'), // null = unlimited
	usageCount: integer('usage_count').notNull().default(0),
	isActive: boolean('is_active').notNull().default(true),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
	id: text('id').primaryKey(),
	storeId: text('store_id')
		.notNull()
		.references(() => stores.id, { onDelete: 'cascade' }),
	orderNumber: text('order_number').notNull(), // human-readable e.g. "ORD-001"
	status: orderStatusEnum('status').notNull().default('pending'),
	// Customer info (guest checkout)
	customerName: text('customer_name').notNull(),
	customerPhone: text('customer_phone').notNull(),
	customerEmail: text('customer_email').notNull(),
	shippingAddress: text('shipping_address').notNull(),
	// Discount
	discountCodeId: text('discount_code_id').references(() => discountCodes.id),
	discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
	// Pricing
	subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
	shippingFee: numeric('shipping_fee', { precision: 10, scale: 2 }).notNull().default('0'),
	taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
	total: numeric('total', { precision: 10, scale: 2 }).notNull(),
	// Notes
	notes: text('notes'),
	// WhatsApp
	whatsappSent: boolean('whatsapp_sent').notNull().default(false),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const orderItems = pgTable('order_items', {
	id: text('id').primaryKey(),
	orderId: text('order_id')
		.notNull()
		.references(() => orders.id, { onDelete: 'cascade' }),
	productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
	variantId: text('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
	// Snapshot at order time
	productTitle: text('product_title').notNull(),
	variantLabel: text('variant_label'),
	unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
	quantity: integer('quantity').notNull(),
	subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull()
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviews = pgTable('reviews', {
	id: text('id').primaryKey(),
	storeId: text('store_id')
		.notNull()
		.references(() => stores.id, { onDelete: 'cascade' }),
	productId: text('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	reviewerName: text('reviewer_name').notNull(),
	reviewerEmail: text('reviewer_email'),
	rating: integer('rating').notNull(), // 1-5
	body: text('body'),
	ip: text('ip'),
	status: reviewStatusEnum('status').notNull().default('pending'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const storesRelations = relations(stores, ({ one, many }) => ({
	owner: one(users, { fields: [stores.ownerId], references: [users.id] }),
	categories: many(categories),
	products: many(products),
	orders: many(orders),
	discountCodes: many(discountCodes),
	policies: many(storePolicies),
	reviews: many(reviews)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
	store: one(stores, { fields: [products.storeId], references: [stores.id] }),
	category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
	optionGroups: many(productOptionGroups),
	variants: many(productVariants),
	attributes: many(productAttributes),
	reviews: many(reviews),
	orderItems: many(orderItems)
}));

export const productOptionGroupsRelations = relations(productOptionGroups, ({ one, many }) => ({
	product: one(products, { fields: [productOptionGroups.productId], references: [products.id] }),
	values: many(productOptionValues)
}));

export const productOptionValuesRelations = relations(productOptionValues, ({ one }) => ({
	group: one(productOptionGroups, {
		fields: [productOptionValues.groupId],
		references: [productOptionGroups.id]
	})
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
	product: one(products, { fields: [productVariants.productId], references: [products.id] })
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
	store: one(stores, { fields: [orders.storeId], references: [stores.id] }),
	items: many(orderItems),
	discountCode: one(discountCodes, {
		fields: [orders.discountCodeId],
		references: [discountCodes.id]
	})
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
	order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
	product: one(products, { fields: [orderItems.productId], references: [products.id] }),
	variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] })
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
	store: one(stores, { fields: [reviews.storeId], references: [stores.id] }),
	product: one(products, { fields: [reviews.productId], references: [products.id] })
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	store: one(stores, { fields: [categories.storeId], references: [stores.id] }),
	products: many(products)
}));

// ─── Convenience type aliases ─────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type ProductAttribute = typeof productAttributes.$inferSelect;
