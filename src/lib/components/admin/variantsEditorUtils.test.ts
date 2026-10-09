/**
 * Tests for variantsEditorUtils — the pure helper functions that back
 * VariantsEditor.svelte.
 *
 * Failure mode on base code (a31a4a23):
 *   - addOption returned { label, price_modifier } with NO stockQty field.
 *     → "stockQty of a newly-added option defaults to 0" fails because
 *       the option does not carry stockQty at all (undefined !== 0).
 *   - updateOptionStock did not exist → the import itself fails,
 *     causing all tests in this describe to error.
 */
import { describe, it, expect } from 'vitest';
import { addOption, updateOptionStock, type VariantRow } from './variantsEditorUtils';

// ─── addOption ────────────────────────────────────────────────────────────────

describe('addOption', () => {
	const base: VariantRow[] = [
		{ name: 'Size', options: [{ label: 'S', price_modifier: 0, stockQty: 10 }] }
	];

	it('appends exactly one option to the targeted variant', () => {
		const result = addOption(base, 0);
		expect(result[0].options).toHaveLength(2);
	});

	it('stockQty of a newly-added option defaults to 0', () => {
		// On base code (a31a4a23) addOption initialised { label, price_modifier }
		// without stockQty, so this assertion resolves to (undefined === 0) → FALSE.
		const result = addOption(base, 0);
		const newOpt = result[0].options[1];
		expect(newOpt.stockQty).toBe(0);
	});

	it('new option label is empty string', () => {
		const result = addOption(base, 0);
		expect(result[0].options[1].label).toBe('');
	});

	it('new option price_modifier is 0', () => {
		const result = addOption(base, 0);
		expect(result[0].options[1].price_modifier).toBe(0);
	});

	it('does not mutate rows it should not touch', () => {
		const rows: VariantRow[] = [
			{ name: 'Size', options: [{ label: 'S', price_modifier: 0, stockQty: 5 }] },
			{ name: 'Color', options: [{ label: 'Red', price_modifier: 0, stockQty: 3 }] }
		];
		const result = addOption(rows, 0);
		// variant at index 1 must be unchanged
		expect(result[1].options).toHaveLength(1);
		expect(result[1].options[0].label).toBe('Red');
	});
});

// ─── updateOptionStock ────────────────────────────────────────────────────────

describe('updateOptionStock', () => {
	const base: VariantRow[] = [
		{
			name: 'Size',
			options: [
				{ label: 'S', price_modifier: 0, stockQty: 10 },
				{ label: 'M', price_modifier: 0, stockQty: 5 }
			]
		}
	];

	it('updates stockQty for the correct option', () => {
		const result = updateOptionStock(base, 0, 1, '20');
		expect(result[0].options[1].stockQty).toBe(20);
	});

	it('leaves other options in the same variant untouched', () => {
		const result = updateOptionStock(base, 0, 1, '20');
		expect(result[0].options[0].stockQty).toBe(10);
	});

	it('clamps negative values to 0', () => {
		const result = updateOptionStock(base, 0, 0, '-5');
		expect(result[0].options[0].stockQty).toBe(0);
	});

	it('resolves non-numeric input to 0', () => {
		const result = updateOptionStock(base, 0, 0, 'abc');
		expect(result[0].options[0].stockQty).toBe(0);
	});

	it('resolves empty string to 0', () => {
		const result = updateOptionStock(base, 0, 0, '');
		expect(result[0].options[0].stockQty).toBe(0);
	});

	it('parses integer strings correctly', () => {
		const result = updateOptionStock(base, 0, 0, '42');
		expect(result[0].options[0].stockQty).toBe(42);
	});
});
