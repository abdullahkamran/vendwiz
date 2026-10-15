/**
 * Customer-facing order emails: "order placed" (sent automatically at checkout) and
 * "status update" (sent manually from the admin order page).
 *
 * Both share one layout: store header, content, store footer (website, contact, social links).
 * Styles are inline and table-based so Gmail/Outlook render them; every email also gets a
 * plain-text twin.
 */

import { env } from '$env/dynamic/private';
import { themeColorFor } from '$lib/seo';
import { bankDetailRows, hasBankDetails, paymentLabel, type BankFields } from '$lib/paymentInfo';

export function htmlEscape(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// ── Types ────────────────────────────────────────────────────────────────────

export type EmailStore = BankFields & {
	name: string;
	subdomain: string;
	theme: string;
	customTheme?: unknown;
	logoUrl?: string | null;
	currencySymbol?: string | null;
	taxLabel?: string | null;
	whatsapp?: string | null;
	instagram?: string | null;
	facebook?: string | null;
	contactEmail?: string | null;
	contactPhone?: string | null;
};

export type EmailLine = {
	title: string;
	variantLabel?: string | null;
	quantity: number;
	unitPrice: number | string;
	imageUrl?: string | null;
};

export type EmailOrder = {
	orderNumber: string;
	customerName: string;
	customerPhone?: string | null;
	shippingAddress?: string | null;
	paymentMethod?: string | null;
	status: string;
	subtotal: number | string;
	discountAmount?: number | string | null;
	shippingFee: number | string;
	taxAmount: number | string;
	total: number | string;
};

export type BuiltEmail = { subject: string; html: string; text: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;

/** The origin the app is served from (used for absolute links/images in emails). */
function appUrl(): URL {
	try {
		return new URL(env.PUBLIC_APP_URL || 'http://localhost:5173');
	} catch {
		return new URL('http://localhost:5173');
	}
}

/** Public URL of the store's storefront. Local dev uses the /store/<slug> path fallback. */
export function storeBaseUrl(subdomain: string): string {
	const app = appUrl();
	const root = import.meta.env.VITE_ROOT_DOMAIN ?? 'vendwiz.com';
	if (root === 'localhost' || app.hostname === 'localhost' || /^[\d.]+$/.test(app.hostname)) {
		return `${app.origin}/store/${subdomain}`;
	}
	return `${app.protocol}//${subdomain}.${root}`;
}

/** Makes an uploaded-file path ("/uploads/x.png") absolute so mail clients can load it. */
function absoluteUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	if (/^https?:\/\//i.test(url)) return url;
	if (url.startsWith('/')) return `${appUrl().origin}${url}`;
	return null;
}

function socialUrl(base: string, value: string): string {
	const v = value.trim();
	if (/^https?:\/\//i.test(v)) return v;
	return `${base}/${v.replace(/^@/, '').replace(/^\/+/, '')}`;
}

function socialLinks(store: EmailStore): Array<{ label: string; url: string }> {
	const links: Array<{ label: string; url: string }> = [];
	if (store.whatsapp) {
		const digits = store.whatsapp.replace(/\D/g, '');
		if (digits) links.push({ label: 'WhatsApp', url: `https://wa.me/${digits}` });
	}
	if (store.instagram) links.push({ label: 'Instagram', url: socialUrl('https://instagram.com', store.instagram) });
	if (store.facebook) links.push({ label: 'Facebook', url: socialUrl('https://facebook.com', store.facebook) });
	return links;
}

function money(store: EmailStore, amount: number | string): string {
	const symbol = store.currencySymbol ?? '';
	return `${symbol} ${num(amount).toFixed(2)}`.trim();
}

// ── Layout ───────────────────────────────────────────────────────────────────

function layout(store: EmailStore, heading: string, bodyHtml: string): string {
	const color = themeColorFor(store);
	const base = storeBaseUrl(store.subdomain);
	const logo = absoluteUrl(store.logoUrl);
	const links = socialLinks(store);

	const header = logo
		? `<img src="${htmlEscape(logo)}" alt="${htmlEscape(store.name)}" height="44" style="display:block;margin:0 auto 8px;max-height:44px;width:auto;border:0;">`
		: '';

	const contact = [
		store.contactEmail
			? `<a href="mailto:${htmlEscape(store.contactEmail)}" style="color:#6b7280;text-decoration:underline;">${htmlEscape(store.contactEmail)}</a>`
			: '',
		store.contactPhone ? htmlEscape(store.contactPhone) : ''
	].filter(Boolean);

	const socials = links
		.map(
			(l) =>
				`<a href="${htmlEscape(l.url)}" style="color:${color};text-decoration:none;font-weight:600;margin:0 8px;">${l.label}</a>`
		)
		.join('');

	return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1f2937;">
<tr><td align="center" style="background:${color};padding:24px 20px;color:#ffffff;">
${header}<div style="font-size:20px;font-weight:700;color:#ffffff;">${htmlEscape(store.name)}</div>
</td></tr>
<tr><td style="padding:28px 24px 8px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">${htmlEscape(heading)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:8px 24px 28px;" align="center">
<a href="${htmlEscape(base)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;">Visit our store</a>
</td></tr>
<tr><td align="center" style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 24px;font-size:13px;color:#6b7280;line-height:1.7;">
<div style="font-weight:600;color:#374151;">${htmlEscape(store.name)}</div>
<div><a href="${htmlEscape(base)}" style="color:#6b7280;text-decoration:underline;">${htmlEscape(base.replace(/^https?:\/\//, ''))}</a></div>
${contact.length ? `<div>${contact.join(' &nbsp;·&nbsp; ')}</div>` : ''}
${socials ? `<div style="margin-top:10px;">${socials}</div>` : ''}
<div style="margin-top:12px;font-size:12px;color:#9ca3af;">${store.contactEmail ? 'Questions about your order? Just reply to this email.' : 'This is an automated message about your order.'}</div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function footerText(store: EmailStore): string {
	const base = storeBaseUrl(store.subdomain);
	return [
		'',
		'--',
		store.name,
		base,
		store.contactEmail,
		store.contactPhone,
		...socialLinks(store).map((l) => `${l.label}: ${l.url}`),
		'',
		store.contactEmail ? 'Questions about your order? Just reply to this email.' : 'This is an automated message about your order.'
	]
		.filter((l): l is string => l != null)
		.join('\n');
}

// ── Sections ─────────────────────────────────────────────────────────────────

function itemsTable(store: EmailStore, lines: EmailLine[]): string {
	if (!lines.length) return '';
	const rows = lines
		.map((l) => {
			const img = absoluteUrl(l.imageUrl);
			const lineTotal = num(l.unitPrice) * l.quantity;
			return `<tr>
<td width="56" style="padding:10px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">${
				img
					? `<img src="${htmlEscape(img)}" alt="" width="48" height="48" style="display:block;width:48px;height:48px;object-fit:cover;border-radius:6px;border:0;">`
					: ''
			}</td>
<td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:14px;">
<div style="font-weight:600;color:#111827;">${htmlEscape(l.title)}</div>
${l.variantLabel ? `<div style="font-size:12px;color:#6b7280;">${htmlEscape(l.variantLabel)}</div>` : ''}
<div style="font-size:12px;color:#6b7280;">Qty ${l.quantity} × ${htmlEscape(money(store, l.unitPrice))}</div>
</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:14px;font-weight:600;white-space:nowrap;">${htmlEscape(money(store, lineTotal))}</td>
</tr>`;
		})
		.join('');
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">${rows}</table>`;
}

function totalsTable(store: EmailStore, order: EmailOrder): string {
	const row = (label: string, value: string, bold = false) =>
		`<tr><td style="padding:4px 0;font-size:14px;color:${bold ? '#111827' : '#6b7280'};${bold ? 'font-weight:700;font-size:16px;' : ''}">${htmlEscape(label)}</td>
<td align="right" style="padding:4px 0;font-size:14px;${bold ? 'font-weight:700;font-size:16px;color:#111827;' : 'color:#374151;'}">${htmlEscape(value)}</td></tr>`;
	const discount = num(order.discountAmount);
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
${row('Subtotal', money(store, order.subtotal))}
${discount > 0 ? row('Discount', `-${money(store, discount)}`) : ''}
${row('Shipping', money(store, order.shippingFee))}
${num(order.taxAmount) > 0 ? row(store.taxLabel || 'Tax', money(store, order.taxAmount)) : ''}
${row('Total', money(store, order.total), true)}
</table>`;
}

function detailsBlock(order: EmailOrder): string {
	const parts: string[] = [];
	if (order.shippingAddress) {
		parts.push(
			`<div style="margin-bottom:8px;"><strong>Delivery address</strong><br>${htmlEscape(order.shippingAddress).replace(/\n/g, '<br>')}</div>`
		);
	}
	if (order.customerPhone) {
		parts.push(`<div style="margin-bottom:8px;"><strong>Phone</strong><br>${htmlEscape(order.customerPhone)}</div>`);
	}
	parts.push(`<div><strong>Payment</strong><br>${htmlEscape(paymentLabel(order.paymentMethod))}</div>`);
	return `<div style="background:#f9fafb;border-radius:8px;padding:14px 16px;font-size:14px;line-height:1.5;margin:0 0 20px;">${parts.join('')}</div>`;
}

function bankBlock(store: EmailStore, order: EmailOrder): string {
	if (order.paymentMethod !== 'bank_transfer' || !hasBankDetails(store)) return '';
	const rows = bankDetailRows(store)
		.map((r) => `${htmlEscape(r.label)}: <strong>${htmlEscape(r.value)}</strong>`)
		.join('<br>');
	return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;font-size:14px;line-height:1.6;margin:0 0 20px;">
<div style="font-weight:600;margin-bottom:6px;">Bank transfer details</div>${rows}
<div style="margin-top:8px;color:#6b7280;font-size:13px;">Please send your payment screenshot to our WhatsApp so we can confirm it.</div>
</div>`;
}

const STEPS = [
	{ status: 'pending', label: 'Placed' },
	{ status: 'processing', label: 'Preparing' },
	{ status: 'dispatched', label: 'On the way' },
	{ status: 'completed', label: 'Delivered' }
];

function progressBar(store: EmailStore, status: string): string {
	const idx = STEPS.findIndex((s) => s.status === status);
	if (idx === -1) return '';
	const color = themeColorFor(store);
	const cells = STEPS.map((s, i) => {
		const done = i <= idx;
		return `<td align="center" width="25%" style="padding:0 2px;">
<div style="height:6px;border-radius:3px;background:${done ? color : '#e5e7eb'};"></div>
<div style="font-size:11px;margin-top:6px;color:${done ? '#111827' : '#9ca3af'};font-weight:${i === idx ? '700' : '400'};">${s.label}</div></td>`;
	}).join('');
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>${cells}</tr></table>`;
}

function itemsText(store: EmailStore, lines: EmailLine[]): string[] {
	return lines.map(
		(l) =>
			`- ${l.title}${l.variantLabel ? ` (${l.variantLabel})` : ''} x${l.quantity} — ${money(store, num(l.unitPrice) * l.quantity)}`
	);
}

function totalsText(store: EmailStore, order: EmailOrder): string[] {
	const discount = num(order.discountAmount);
	return [
		`Subtotal: ${money(store, order.subtotal)}`,
		discount > 0 ? `Discount: -${money(store, discount)}` : '',
		`Shipping: ${money(store, order.shippingFee)}`,
		num(order.taxAmount) > 0 ? `${store.taxLabel || 'Tax'}: ${money(store, order.taxAmount)}` : '',
		`Total: ${money(store, order.total)}`
	].filter(Boolean);
}

// ── Emails ───────────────────────────────────────────────────────────────────

/** Sent automatically when a customer places an order. */
export function buildOrderPlacedEmail(store: EmailStore, order: EmailOrder, lines: EmailLine[]): BuiltEmail {
	const intro = `Thank you for placing your order! Your order has been placed and we are preparing it.`;
	const body = `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${htmlEscape(order.customerName)},<br>${htmlEscape(intro)}</p>
<p style="margin:0 0 12px;font-size:14px;color:#6b7280;">Order number <strong style="color:#111827;">#${htmlEscape(order.orderNumber)}</strong></p>
${progressBar(store, 'pending')}
${itemsTable(store, lines)}
${totalsTable(store, order)}
${detailsBlock(order)}
${bankBlock(store, order)}`;

	const bank =
		order.paymentMethod === 'bank_transfer' && hasBankDetails(store)
			? [
					'',
					'Bank transfer details:',
					...bankDetailRows(store).map((r) => `${r.label}: ${r.value}`),
					'Please send your payment screenshot to our WhatsApp so we can confirm it.'
				]
			: [];
	const text = [
		`Hi ${order.customerName},`,
		intro,
		'',
		`Order #${order.orderNumber}`,
		...itemsText(store, lines),
		'',
		...totalsText(store, order),
		'',
		order.shippingAddress ? `Delivery address: ${order.shippingAddress}` : '',
		order.customerPhone ? `Phone: ${order.customerPhone}` : '',
		`Payment: ${paymentLabel(order.paymentMethod)}`,
		...bank,
		footerText(store)
	].join('\n');

	return {
		subject: `Order placed – #${order.orderNumber}`,
		html: layout(store, 'Thanks for your order!', body),
		text
	};
}

const STATUS_COPY: Record<string, { subject: string; heading: string; body: string }> = {
	pending: {
		subject: 'received',
		heading: 'We have your order',
		body: 'We have received your order and will start working on it shortly.'
	},
	processing: {
		subject: 'is being prepared',
		heading: 'Your order is being prepared',
		body: 'Good news — we are preparing your order.'
	},
	dispatched: {
		subject: 'is on its way',
		heading: 'Your order is on its way',
		body: 'Your order has been dispatched and is on its way to you.'
	},
	completed: {
		subject: 'is complete',
		heading: 'Your order is complete',
		body: 'Your order has been delivered and completed. We hope you enjoy it!'
	},
	cancelled: {
		subject: 'has been cancelled',
		heading: 'Your order was cancelled',
		body: 'Your order has been cancelled. If you have any questions, please get in touch with us.'
	}
};

/** Sent manually by the store owner from the admin order page. */
export function buildStatusEmail(store: EmailStore, order: EmailOrder, lines: EmailLine[]): BuiltEmail {
	const copy = STATUS_COPY[order.status] ?? {
		subject: `status: ${order.status}`,
		heading: 'Order update',
		body: `Your order status is now: ${order.status}.`
	};
	const body = `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${htmlEscape(order.customerName)},<br>${htmlEscape(copy.body)}</p>
<p style="margin:0 0 12px;font-size:14px;color:#6b7280;">Order number <strong style="color:#111827;">#${htmlEscape(order.orderNumber)}</strong></p>
${progressBar(store, order.status)}
${itemsTable(store, lines)}
${totalsTable(store, order)}
${order.shippingAddress ? detailsBlock(order) : ''}`;

	const text = [
		`Hi ${order.customerName},`,
		copy.body,
		'',
		`Order #${order.orderNumber} — status: ${order.status}`,
		...itemsText(store, lines),
		'',
		...totalsText(store, order),
		footerText(store)
	].join('\n');

	return {
		subject: `Order #${order.orderNumber} ${copy.subject} – ${store.name}`,
		html: layout(store, copy.heading, body),
		text
	};
}
