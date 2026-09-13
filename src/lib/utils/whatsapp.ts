import type { Order, OrderItem } from '$lib/db/schema';

export function buildOrderConfirmationMessage(order: Order): string {
	const items = (order.items as OrderItem[])
		.map((i) => `• ${i.title} x${i.quantity} — PKR ${i.price * i.quantity}`)
		.join('\n');

	return (
		`🛍️ *New Order: #${order.orderRef}*\n\n` +
		`*Customer:* ${order.customerName}\n` +
		`*Phone:* ${order.customerPhone}\n` +
		`*Address:* ${order.shippingAddress}\n\n` +
		`*Items:*\n${items}\n\n` +
		`*Total:* PKR ${order.total}\n` +
		(order.discountCode ? `*Discount:* ${order.discountCode} (-PKR ${order.discountAmount})\n` : '') +
		`\nThank you for your order! 🙏`
	);
}

export function buildWhatsAppUrl(phone: string, message: string): string {
	const clean = phone.replace(/\D/g, '');
	return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
