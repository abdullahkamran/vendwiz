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
 *
 * updateOptionColorHex failure mode (pre-fix):
 *   - The function did not exist in variantsEditorUtils at all — import fails.
 *   - Even if inlined in the component, label was never set, so saving a Color
 *     variant sent label='' which Zod min(1) rejected with HTTP 400.
 */
import { describe, it, expect } from 'vitest';
import { addOption, updateOptionStock, updateOptionColorHex, type VariantRow } from './variantsEditorUtils';

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

// ─── updateOptionColorHex ─────────────────────────────────────────────────────
// These tests demonstrate the AC1/AC2 fix: saving a Color variant no longer
// sends label='' (which Zod min(1) rejects with HTTP 400). On pre-fix code the
// function did not exist in this module at all, so the import itself would fail.

describe('updateOptionColorHex', () => {
	const base: VariantRow[] = [
		{
			name: 'Color',
			options: [
				{ label: '', price_modifier: 0, stockQty: 5, colorHex: '' },
				{ label: 'Red', price_modifier: 0, stockQty: 3, colorHex: '#ff0000' }
			]
		}
	];

	it('sets colorHex on the targeted option', () => {
		const result = updateOptionColorHex(base, 0, 0, '#0000ff');
		expect(result[0].options[0].colorHex).toBe('#0000ff');
	});

	it('auto-populates label with colorHex when label is empty (fixes Zod min(1) rejection)', () => {
		// Pre-fix: label remained '' → server returned HTTP 400
		const result = updateOptionColorHex(base, 0, 0, '#0000ff');
		expect(result[0].options[0].label).toBe('#0000ff');
	});

	it('auto-populates label when existing label starts with # (previously auto-filled)', () => {
		const rows: VariantRow[] = [
			{
				name: 'Color',
				options: [{ label: '#aabbcc', price_modifier: 0, stockQty: 2, colorHex: '#aabbcc' }]
			}
		];
		const result = updateOptionColorHex(rows, 0, 0, '#112233');
		expect(result[0].options[0].label).toBe('#112233');
	});

	it('does NOT overwrite a manually typed label with the hex value', () => {
		// "Red" was typed by the user — must survive a color-picker change
		const result = updateOptionColorHex(base, 0, 1, '#cc0000');
		expect(result[0].options[1].label).toBe('Red');
		expect(result[0].options[1].colorHex).toBe('#cc0000');
	});

	it('leaves options in other variants untouched', () => {
		const rows: VariantRow[] = [
			{ name: 'Color', options: [{ label: '', price_modifier: 0, colorHex: '' }] },
			{ name: 'Size', options: [{ label: 'M', price_modifier: 0 }] }
		];
		const result = updateOptionColorHex(rows, 0, 0, '#ffffff');
		expect(result[1].options[0].label).toBe('M');
		expect(result[1].options[0].colorHex).toBeUndefined();
	});

	it('leaves other options in the same variant untouched', () => {
		const result = updateOptionColorHex(base, 0, 0, '#0000ff');
		// Option at index 1 ('Red') must be unchanged
		expect(result[0].options[1].label).toBe('Red');
		expect(result[0].options[1].colorHex).toBe('#ff0000');
	});
});
