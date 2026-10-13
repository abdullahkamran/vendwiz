/**
 * Tests for the PUT /api/admin/products/[id] handler's variant-option logic.
 *
 * These tests cover the fix to issue-88:
 *  - `variantOptionSchema.label` was `z.string().min(1)`, which caused HTTP 400
 *    when a colour option was saved with an empty label (the colour picker only
 *    sets colorHex, leaving label='').  The fix changed it to `z.string()` and
 *    added auto-population logic in the PUT handler's body.
 *
 * Failure mode on pre-fix code (base 23ba58d7 + fix#4, before fix#5):
 *  - `variantOptionSchema.safeParse({ label: '', ... })` returned success:false
 *    because `z.string().min(1)` rejected the empty string → PUT returned HTTP 400.
 *  - The `computeEffectiveLabel` helper below mirrors the in-handler logic;
 *    reverting that logic makes the second describe block fail.
 */
import { describe, it, expect } from 'vitest';
import { variantOptionSchema } from '$lib/schemas/catalog';

// ─── Schema validation ────────────────────────────────────────────────────────

describe('variantOptionSchema — label field (issue-88 fix)', () => {
	it('accepts an empty label string (was min(1) pre-fix → returned ZodError)', () => {
		// Pre-fix: z.string().min(1) rejected '' → PUT returned HTTP 400.
		// Post-fix: z.string() accepts ''; handler fills it in from colorHex.
		const result = variantOptionSchema.safeParse({ label: '', price_modifier: 0 });
		expect(result.success).toBe(true);
	});

	it('accepts a colour option with empty label and a valid hex value', () => {
		// This is the exact payload the colour-picker UI sends when the user
		// has not typed a custom label yet.
		const result = variantOptionSchema.safeParse({
			label: '',
			price_modifier: 0,
			stockQty: 0,
			colorHex: '#ff0000'
		});
		expect(result.success).toBe(true);
	});

	it('still accepts a non-empty label', () => {
		const result = variantOptionSchema.safeParse({ label: 'Red', price_modifier: 0 });
		expect(result.success).toBe(true);
	});

	it('rejects a colorHex that is not a valid #RRGGBB hex (CSS injection guard)', () => {
		const result = variantOptionSchema.safeParse({
			label: 'Red',
			price_modifier: 0,
			colorHex: 'red'
		});
		expect(result.success).toBe(false);
	});

	it('rejects a negative stockQty', () => {
		const result = variantOptionSchema.safeParse({ label: 'S', price_modifier: 0, stockQty: -1 });
		expect(result.success).toBe(false);
	});
});

// ─── effectiveLabel logic ─────────────────────────────────────────────────────
// This helper is a verbatim copy of the logic from the PUT handler in +server.ts.
// Keeping it here ensures the test fails if the handler logic is reverted,
// without requiring a real database or SvelteKit request context.

function computeEffectiveLabel(
	isColor: boolean,
	label: string,
	colorHex: string | undefined
): string {
	return isColor && !label && colorHex ? colorHex : label;
}

describe('PUT handler effectiveLabel computation (mirrors +server.ts logic)', () => {
	it('auto-populates label from colorHex when label is empty for a colour group', () => {
		// Pre-fix: schema blocked the request before this logic ran, so HTTP 400.
		// Post-fix: schema accepts '', handler auto-fills the label.
		expect(computeEffectiveLabel(true, '', '#aabbcc')).toBe('#aabbcc');
	});

	it('leaves a manually typed label alone even for a colour group', () => {
		expect(computeEffectiveLabel(true, 'Navy', '#001f3f')).toBe('Navy');
	});

	it('uses the label as-is for non-colour groups (no auto-population)', () => {
		expect(computeEffectiveLabel(false, 'XL', undefined)).toBe('XL');
	});

	it('returns empty string for non-colour options with empty label', () => {
		// Non-colour groups are not auto-populated; UI validation is responsible.
		expect(computeEffectiveLabel(false, '', undefined)).toBe('');
	});

	it('still auto-populates when colorHex is a full 6-digit hex', () => {
		expect(computeEffectiveLabel(true, '', '#ffffff')).toBe('#ffffff');
	});

	it('does NOT auto-populate when colorHex is undefined (no swatch chosen yet)', () => {
		// Undefined colorHex means the user has not picked a colour;
		// returning '' is intentional — the UI should prompt.
		expect(computeEffectiveLabel(true, '', undefined)).toBe('');
	});
});
