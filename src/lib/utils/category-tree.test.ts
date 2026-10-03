import { describe, it, expect } from 'vitest';
import { buildCategoryTree } from './category-tree';

const row = (id: string, parentId: string | null = null) => ({
	id,
	name: `Cat ${id}`,
	slug: `cat-${id}`,
	parentId,
	sortOrder: 0
});

describe('buildCategoryTree', () => {
	it('returns all rows as roots when none has a parentId', () => {
		const tree = buildCategoryTree([row('a'), row('b'), row('c')]);
		expect(tree.map((n) => n.id)).toEqual(['a', 'b', 'c']);
		for (const node of tree) {
			expect(node.children).toHaveLength(0);
		}
	});

	it('nests children under their parent', () => {
		const tree = buildCategoryTree([row('parent'), row('child1', 'parent'), row('child2', 'parent')]);
		expect(tree).toHaveLength(1);
		expect(tree[0].id).toBe('parent');
		expect(tree[0].children.map((c) => c.id)).toEqual(['child1', 'child2']);
	});

	it('promotes orphans (parentId pointing to missing row) to roots', () => {
		const tree = buildCategoryTree([row('a', 'missing'), row('b')]);
		expect(tree.map((n) => n.id)).toEqual(['a', 'b']);
	});

	it('handles an empty list', () => {
		expect(buildCategoryTree([])).toEqual([]);
	});

	it('preserves all original fields on each node', () => {
		const tree = buildCategoryTree([{ id: 'x', name: 'Foo', slug: 'foo', parentId: null, sortOrder: 3 }]);
		expect(tree[0].name).toBe('Foo');
		expect(tree[0].sortOrder).toBe(3);
	});
});
