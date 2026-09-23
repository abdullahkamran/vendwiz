/**
 * Storefront CSS custom-property token maps.
 *
 * Every theme defines all 20 --sf-* variables so that
 * getComputedStyle(document.documentElement) always returns a value for each one.
 * The server-side layout injects these as a <style> block in <head>.
 */

export interface ThemeTokens {
  '--sf-bg': string;
  '--sf-surface': string;
  '--sf-text': string;
  '--sf-muted': string;
  '--sf-border': string;
  '--sf-primary': string;
  '--sf-on-primary': string;
  '--sf-radius': string;
  '--sf-radius-lg': string;
  '--sf-pill': string;
  '--sf-font': string;
  '--sf-heading-font': string;
  '--sf-heading-weight': string;
  '--sf-letter-spacing': string;
  '--sf-card-shadow': string;
  '--sf-card-border': string;
  '--sf-btn-transform': string;
  '--sf-btn-weight': string;
  '--sf-announce-bg': string;
  '--sf-announce-text': string;
  '--sf-error': string;
  '--sf-success': string;
  '--sf-error-tint': string;
  '--sf-success-tint': string;
  '--sf-overlay': string;
}

export interface DarkTokens {
  '--sf-bg': string;
  '--sf-surface': string;
  '--sf-text': string;
  '--sf-muted': string;
  '--sf-border': string;
}

// ─── basic ────────────────────────────────────────────────────────────────────
const basic: ThemeTokens = {
  '--sf-bg': '#ffffff',
  '--sf-surface': '#f8f9fa',
  '--sf-text': '#212529',
  '--sf-muted': '#6c757d',
  '--sf-border': '#dee2e6',
  '--sf-primary': '#0d6efd',
  '--sf-on-primary': '#ffffff',
  '--sf-radius': '6px',
  '--sf-radius-lg': '12px',
  '--sf-pill': '9999px',
  '--sf-font': 'system-ui, -apple-system, sans-serif',
  '--sf-heading-font': 'system-ui, -apple-system, sans-serif',
  '--sf-heading-weight': '700',
  '--sf-letter-spacing': '0',
  '--sf-card-shadow': '0 1px 3px rgba(0,0,0,0.08)',
  '--sf-card-border': '1px solid #dee2e6',
  '--sf-btn-transform': 'none',
  '--sf-btn-weight': '600',
  '--sf-announce-bg': '#0d6efd',
  '--sf-announce-text': '#ffffff',
  '--sf-error': '#dc2626',
  '--sf-success': '#16a34a',
  '--sf-error-tint': '#dc26261a',
  '--sf-success-tint': '#16a34a1f',
  '--sf-overlay': 'rgba(0,0,0,0.45)'
};

const basicDark: DarkTokens = {
  '--sf-bg': '#0d1117',
  '--sf-surface': '#161b22',
  '--sf-text': '#e6edf3',
  '--sf-muted': '#8b949e',
  '--sf-border': '#30363d'
};

// ─── minimal ──────────────────────────────────────────────────────────────────
const minimal: ThemeTokens = {
  '--sf-bg': '#fafafa',
  '--sf-surface': '#ffffff',
  '--sf-text': '#111827',
  '--sf-muted': '#6b7280',
  '--sf-border': '#e5e7eb',
  '--sf-primary': '#111827',
  '--sf-on-primary': '#ffffff',
  '--sf-radius': '4px',
  '--sf-radius-lg': '8px',
  '--sf-pill': '9999px',
  '--sf-font': '"Poppins", system-ui, sans-serif',
  '--sf-heading-font': '"Playfair Display", serif',
  '--sf-heading-weight': '800',
  '--sf-letter-spacing': '-0.02em',
  '--sf-card-shadow': 'none',
  '--sf-card-border': '1px solid #e5e7eb',
  '--sf-btn-transform': 'none',
  '--sf-btn-weight': '500',
  '--sf-announce-bg': '#111827',
  '--sf-announce-text': '#ffffff',
  '--sf-error': '#dc2626',
  '--sf-success': '#16a34a',
  '--sf-error-tint': '#dc26261a',
  '--sf-success-tint': '#16a34a1f',
  '--sf-overlay': 'rgba(0,0,0,0.45)'
};

const minimalDark: DarkTokens = {
  '--sf-bg': '#0f0f0f',
  '--sf-surface': '#1a1a1a',
  '--sf-text': '#f9fafb',
  '--sf-muted': '#9ca3af',
  '--sf-border': '#374151'
};

// ─── bold ─────────────────────────────────────────────────────────────────────
const bold: ThemeTokens = {
  '--sf-bg': '#0f172a',
  '--sf-surface': '#1e293b',
  '--sf-text': '#f1f5f9',
  '--sf-muted': '#94a3b8',
  '--sf-border': '#334155',
  '--sf-primary': '#f97316',
  '--sf-on-primary': '#ffffff',
  '--sf-radius': '0px',
  '--sf-radius-lg': '4px',
  '--sf-pill': '4px',
  '--sf-font': '"DM Sans", system-ui, sans-serif',
  '--sf-heading-font': '"Barlow Condensed", system-ui, sans-serif',
  '--sf-heading-weight': '900',
  '--sf-letter-spacing': '0.04em',
  '--sf-card-shadow': '4px 4px 0 #f97316',
  '--sf-card-border': '2px solid #f97316',
  '--sf-btn-transform': 'uppercase',
  '--sf-btn-weight': '900',
  '--sf-announce-bg': '#f97316',
  '--sf-announce-text': '#0f172a',
  '--sf-error': '#fca5a5',
  '--sf-success': '#86efac',
  '--sf-error-tint': '#fca5a51a',
  '--sf-success-tint': '#86efac1f',
  '--sf-overlay': 'rgba(0,0,0,0.6)'
};

const boldDark: DarkTokens = {
  '--sf-bg': '#040810',
  '--sf-surface': '#0f172a',
  '--sf-text': '#f8fafc',
  '--sf-muted': '#cbd5e1',
  '--sf-border': '#1e293b'
};

// ─── playful ──────────────────────────────────────────────────────────────────
const playful: ThemeTokens = {
  '--sf-bg': '#fdf4ff',
  '--sf-surface': '#ffffff',
  '--sf-text': '#2d1b4e',
  '--sf-muted': '#7c6d8a',
  '--sf-border': '#e9d5ff',
  '--sf-primary': '#7c3aed',
  '--sf-on-primary': '#ffffff',
  '--sf-radius': '16px',
  '--sf-radius-lg': '24px',
  '--sf-pill': '9999px',
  '--sf-font': '"Nunito", system-ui, sans-serif',
  '--sf-heading-font': '"Raleway", system-ui, sans-serif',
  '--sf-heading-weight': '800',
  '--sf-letter-spacing': '0',
  '--sf-card-shadow': '0 8px 24px rgba(124,58,237,0.12)',
  '--sf-card-border': 'none',
  '--sf-btn-transform': 'none',
  '--sf-btn-weight': '700',
  '--sf-announce-bg': '#7c3aed',
  '--sf-announce-text': '#ffffff',
  '--sf-error': '#dc2626',
  '--sf-success': '#16a34a',
  '--sf-error-tint': '#dc26261a',
  '--sf-success-tint': '#16a34a1f',
  '--sf-overlay': 'rgba(0,0,0,0.45)'
};

const playfulDark: DarkTokens = {
  '--sf-bg': '#1a0533',
  '--sf-surface': '#2d1b4e',
  '--sf-text': '#f5e6ff',
  '--sf-muted': '#c4b5fd',
  '--sf-border': '#5b21b6'
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const THEME_TOKENS: Record<string, ThemeTokens> = {
  basic,
  minimal,
  bold,
  playful,
  custom: basic
};

export const DARK_TOKENS: Record<string, DarkTokens> = {
  basic: basicDark,
  minimal: minimalDark,
  bold: boldDark,
  playful: playfulDark,
  custom: basicDark
};

/**
 * Hex equivalents of --sf-primary for use in manifest.json theme_color.
 */
export const THEME_HEX: Record<string, string> = {
  basic: '#0d6efd',
  minimal: '#111827',
  bold: '#f97316',
  playful: '#7c3aed',
  custom: '#0d6efd'
};

/**
 * Serialise a token map into CSS custom-property declarations (no selector).
 */
export function tokensToCSS(tokens: Partial<ThemeTokens> | DarkTokens): string {
  return Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
}

/** Returns the full :root block for the given theme slug. */
export function themeRootCSS(theme: string): string {
  const tokens = THEME_TOKENS[theme] ?? THEME_TOKENS.basic;
  return `:root {\n${tokensToCSS(tokens)}\n}`;
}

/** Returns the dark-mode override block for the given theme slug. */
export function themeDarkCSS(theme: string): string {
  const tokens = DARK_TOKENS[theme] ?? DARK_TOKENS.basic;
  return `[data-dark] {\n${tokensToCSS(tokens)}\n}`;
}
