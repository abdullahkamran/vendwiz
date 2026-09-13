/**
 * WhatsApp notification helpers.
 *
 * For now, this generates the pre-filled wa.me links that can be triggered
 * from the admin dashboard. When a WhatsApp Business API key is configured
 * (WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID), it sends via the Cloud API.
 */

import type { OrderWithItems } from '$lib/types';

const WA_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

function buildOrderConfirmationMessage(order: OrderWithItems, storeName: string): string {
	const itemsText = order.items
		.map((i) => `• ${i.productTitle}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.quantity} — ${i.unitPrice}`)
		.join('\n');

	return [
		`Hello ${order.customerName}! 👋`,
		``,
		`Thank you for your order at *${storeName}*.`,
		``,
		`📦 *Order #${order.orderNumber}*`,
		itemsText,
		``,
		`💰 Subtotal: ${order.subtotal}`,
		order.discountAmount && parseFloat(order.discountAmount) > 0
			? `🏷️ Discount: -${order.discountAmount}` : null,
		`🚚 Shipping: ${order.shippingFee}`,
		`🧾 Tax: ${order.taxAmount}`,
		`*Total: ${order.total}*`,
		``,
		`📍 Delivery to: ${order.shippingAddress}`,
		``,
		`We'll contact you shortly to coordinate payment and delivery. Thank you! 🙏`
	].filter(Boolean).join('\n');
}

export function getOrderWhatsAppUrl(order: OrderWithItems, storeName: string, phone: string): string {
	const message = buildOrderConfirmationMessage(order, storeName);
	const cleaned = phone.replace(/\D/g, '');
	return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/**
 * Send order confirmation via WhatsApp Cloud API.
 * Returns true if sent successfully, false if not configured / failed.
 */
export async function sendOrderConfirmationWA(
	order: OrderWithItems,
	storeName: string,
	customerPhone: string
): Promise<boolean> {
	if (!WA_TOKEN || !WA_PHONE_ID) return false;

	const message = buildOrderConfirmationMessage(order, storeName);
	const to = customerPhone.replace(/\D/g, '');

	try {
		const res = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${WA_TOKEN}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				messaging_product: 'whatsapp',
				to,
				type: 'text',
				text: { body: message }
			})
		});

		return res.ok;
	} catch {
		return false;
	}
}
