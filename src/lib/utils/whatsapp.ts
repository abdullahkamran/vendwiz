/**
 * Build a wa.me deep-link URL.
 * If phone is null/empty the URL omits the number (opens WhatsApp
 * with the message pre-filled but no pre-selected contact).
 */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
	if (!phone) {
		return `https://wa.me/?text=${encodeURIComponent(message)}`;
	}
	const clean = phone.replace(/\D/g, '');
	return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
