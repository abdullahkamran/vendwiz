import { describe, it, expect } from 'vitest';
import { checkAllGroupsSelected, findFirstMissingGroup } from './product-selection';

// Minimal option-group shape used by the PDP component
const grp = (id: string, name = `Group ${id}`) => ({ id, name });

// ── checkAllGroupsSelected ────────────────────────────────────────────────────

describe('checkAllGroupsSelected', () => {
	it('returns true when there are no option groups (legacy products)', () => {
		expect(checkAllGroupsSelected([], {})).toBe(true);
	});

	it('returns false when a group has no selection', () => {
		expect(checkAllGroupsSelected([grp('color')], {})).toBe(false);
	});

	it('returns false when only some groups are selected', () => {
		const groups = [grp('color'), grp('size')];
		expect(checkAllGroupsSelected(groups, { color: 'red' })).toBe(false);
	});

	it('returns true when every group has a non-empty selection', () => {
		const groups = [grp('color'), grp('size')];
		expect(checkAllGroupsSelected(groups, { color: 'red', size: 'M' })).toBe(true);
	});

	it('treats an empty-string selection as missing (falsy guard)', () => {
		expect(checkAllGroupsSelected([grp('color')], { color: '' })).toBe(false);
	});

	it('ignores extra keys in selections that do not match any group', () => {
		const groups = [grp('color')];
		expect(checkAllGroupsSelected(groups, { color: 'blue', size: 'L' })).toBe(true);
	});
});

// ── findFirstMissingGroup ─────────────────────────────────────────────────────

describe('findFirstMissingGroup', () => {
	it('returns null when there are no groups', () => {
		expect(findFirstMissingGroup([], {})).toBeNull();
	});

	it('returns null when all groups are selected', () => {
		const groups = [grp('color'), grp('size')];
		expect(findFirstMissingGroup(groups, { color: 'red', size: 'M' })).toBeNull();
	});

	it('returns the first unselected group when none are selected', () => {
		const groups = [grp('color'), grp('size')];
		const result = findFirstMissingGroup(groups, {});
		expect(result?.id).toBe('color');
	});

	it('returns the first unselected group when only the second group is missing', () => {
		const groups = [grp('color'), grp('size')];
		const result = findFirstMissingGroup(groups, { color: 'red' });
		expect(result?.id).toBe('size');
	});

	it('preserves all fields of the returned group object', () => {
		const groups = [grp('color', 'Color')];
		const result = findFirstMissingGroup(groups, {});
		expect(result).toEqual({ id: 'color', name: 'Color' });
	});
});
