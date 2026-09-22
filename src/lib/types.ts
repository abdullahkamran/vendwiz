import type { InferSelectModel } from 'drizzle-orm';
import type {
	stores,
	products,
	categories,
	productVariants,
	productOptionGroups,
	productOptionValues,
	productAttributes,
	orders,
	orderItems,
	reviews,
	discountCodes,
	storePolicies
} from './server/db/schema';

// Base model types from DB schema
export type Store = InferSelectModel<typeof stores>;
export type Product = InferSelectModel<typeof products>;
export type Category = InferSelectModel<typeof categories>;
export type ProductVariant = InferSelectModel<typeof productVariants>;
export type ProductOptionGroup = InferSelectModel<typeof productOptionGroups>;
export type ProductOptionValue = InferSelectModel<typeof productOptionValues>;
export type ProductAttribute = InferSelectModel<typeof productAttributes>;
export type Order = InferSelectModel<typeof orders>;
export type OrderItem = InferSelectModel<typeof orderItems>;
export type Review = InferSelectModel<typeof reviews>;
export type DiscountCode = InferSelectModel<typeof discountCodes>;
export type StorePolicy = InferSelectModel<typeof storePolicies>;

// Rich types with relations
export type ProductWithDetails = Product & {
	category: Category | null;
	optionGroups: (ProductOptionGroup & { values: ProductOptionValue[] })[];
	variants: ProductVariant[];
	attributes: ProductAttribute[];
	reviews: Review[];
};

export type OrderWithItems = Order & {
	items: OrderItem[];
	discountCode: DiscountCode | null;
};

// Cart (client-side, stored in localStorage)
export interface CartItem {
	productId: string;
	variantId?: string;
	title: string;
	variantLabel?: string;
	price: number;
	imageUrl?: string;
	quantity: number;
}

export interface Cart {
	storeId: string;
	items: CartItem[];
	discountCode?: string;
	discountAmount?: number;
}

// Checkout form
export interface CheckoutForm {
	name: string;
	phone: string;
	email: string;
	address: string;
	notes?: string;
}

// Store theme
export type ThemeSlug = 'basic' | 'minimal' | 'bold' | 'playful' | 'custom';

export interface CustomTheme {
	primaryColor: string;
	secondaryColor: string;
	accentColor: string;
	fontFamily?: string;
}

// Image stored in products.images JSON
export interface ProductImage {
	url: string;
	alt?: string;
	order: number;
}

// Analytics
export interface StoreAnalytics {
	totalOrders: number;
	totalRevenue: number;
	topProducts: { productId: string; title: string; unitsSold: number; revenue: number }[];
}
