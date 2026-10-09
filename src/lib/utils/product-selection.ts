/**
 * Utilities for product option-group selection guards.
 *
 * Extracted from the PDP component so the logic can be unit-tested
 * independently of the Svelte runtime.
 */

/**
 * Returns `true` when every option group has a selection, or when there are
 * no option groups at all (legacy products with no variants).
 */
export function checkAllGroupsSelected(
	optionGroups: Array<{ id: string }>,
	selections: Record<string, string>
): boolean {
	return optionGroups.length === 0 || optionGroups.every((g) => !!selections[g.id]);
}

/**
 * Returns the first option group that has no selection yet, or `null` when
 * every group is covered (or there are none).
 */
export function findFirstMissingGroup<T extends { id: string }>(
	optionGroups: T[],
	selections: Record<string, string>
): T | null {
	return optionGroups.find((g) => !selections[g.id]) ?? null;
}
