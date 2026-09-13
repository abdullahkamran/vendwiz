/**
 * Slugify a string to URL-safe format
 */
export function slugify(str: string): string {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/[\s_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number | string, currency = 'PKR'): string {
	const num = typeof amount === 'string' ? parseFloat(amount) : amount;
	return new Intl.NumberFormat('en-PK', { style: 'currency', currency }).format(num);
}

/**
 * Generate a random order number
 */
export function generateOrderNumber(prefix = 'ORD'): string {
	const timestamp = Date.now().toString(36).toUpperCase();
	const random = Math.random().toString(36).substring(2, 5).toUpperCase();
	return `${prefix}-${timestamp}${random}`;
}

/**
 * Extract YouTube video ID from a URL
 */
export function getYouTubeId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
		/youtube\.com\/shorts\/([^&\n?#]+)/
	];
	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}
	return null;
}

/**
 * Build a WhatsApp message URL
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
	const cleaned = phone.replace(/\D/g, '');
	return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 3) + '...';
}
