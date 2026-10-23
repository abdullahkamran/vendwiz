import { nanoid } from 'nanoid';
import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { productReels, products } from '$lib/server/db/schema';

type Executor = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;

export type ReelInput = { id?: string; videoUrl: string; caption?: string | null; sortOrder: number };

/** True when the store has at least one reel shoppers can see (published reel of a published product). */
export async function storeHasReels(storeId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: productReels.id })
		.from(productReels)
		.innerJoin(products, eq(productReels.productId, products.id))
		.where(and(eq(productReels.storeId, storeId), eq(productReels.isPublished, true), eq(products.isPublished, true)))
		.limit(1);
	return !!row;
}

/**
 * Make a product's reels match the list submitted with the product form: reels left out are
 * deleted, ones with an id are updated, ones without are added. Show/hide status is managed on
 * the Reels page, so existing reels keep theirs and new ones start published.
 */
export async function syncProductReels(exec: Executor, storeId: string, productId: string, reels: ReelInput[]) {
	const scope = and(eq(productReels.productId, productId), eq(productReels.storeId, storeId));
	const keepIds = reels.map((r) => r.id).filter((id): id is string => !!id);

	await exec.delete(productReels).where(keepIds.length ? and(scope, notInArray(productReels.id, keepIds)) : scope);

	const existing = keepIds.length
		? new Set((await exec.select({ id: productReels.id }).from(productReels).where(and(scope, inArray(productReels.id, keepIds)))).map((r) => r.id))
		: new Set<string>();

	for (const r of reels) {
		const values = { videoUrl: r.videoUrl.trim(), caption: r.caption?.trim() || null, sortOrder: r.sortOrder };
		if (r.id && existing.has(r.id)) {
			await exec.update(productReels).set(values).where(and(scope, eq(productReels.id, r.id)));
		} else {
			await exec.insert(productReels).values({ id: nanoid(), storeId, productId, ...values });
		}
	}
}
