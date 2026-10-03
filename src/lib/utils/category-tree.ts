/**
 * Builds a parent→children tree from a flat list of category rows.
 * Orphans (parentId set but parent not in the list) are promoted to roots.
 * Categories with no parentId are roots.
 */
export type CategoryNode<T> = T & { children: CategoryNode<T>[] };

export function buildCategoryTree<T extends { id: string; parentId?: string | null }>(
	rows: T[]
): CategoryNode<T>[] {
	const map = new Map<string, CategoryNode<T>>();
	const roots: CategoryNode<T>[] = [];

	// First pass: wrap every row in a node
	for (const row of rows) {
		map.set(row.id, { ...row, children: [] });
	}

	// Second pass: attach children to parents, or promote to root
	for (const [, node] of map) {
		if (node.parentId && map.has(node.parentId)) {
			map.get(node.parentId)!.children.push(node);
		} else {
			roots.push(node);
		}
	}

	return roots;
}
