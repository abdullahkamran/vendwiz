/**
 * Phone helpers. Numbers are stored as one string with the country code included
 * ("+923001234567"); there is no separate country-code column.
 */

/** Digits typed by the customer without the local trunk prefix ("0300 1234567" → "3001234567"). */
export function nationalDigits(input: string): string {
	return input.replace(/\D/g, '').replace(/^0+/, '');
}

/** Joins a dial code and what the customer typed into "+<code><number>"; '' when nothing was typed. */
export function composePhone(dial: string, nationalInput: string): string {
	const national = nationalDigits(nationalInput);
	return national ? `+${dial}${national}` : '';
}

/** The digits-only international number WhatsApp's wa.me links expect. */
export function whatsappDigits(phone: string): string {
	const raw = phone.trim();
	const digits = raw.replace(/\D/g, '');
	// "00" is the international call prefix, equivalent to "+"
	return raw.startsWith('+') ? digits : digits.replace(/^00/, '');
}
