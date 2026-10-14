/**
 * Countries offered for phone numbers at checkout. Front-end only: the chosen dial code is
 * merged into the stored phone number (e.g. "+923001234567"), never saved on its own.
 */
export type Country = { iso: string; name: string; dial: string; flag: string };

export const COUNTRIES: Country[] = [
	{ iso: 'PK', name: 'Pakistan', dial: '92', flag: '🇵🇰' },
	{ iso: 'IN', name: 'India', dial: '91', flag: '🇮🇳' },
	{ iso: 'BD', name: 'Bangladesh', dial: '880', flag: '🇧🇩' },
	{ iso: 'LK', name: 'Sri Lanka', dial: '94', flag: '🇱🇰' },
	{ iso: 'NP', name: 'Nepal', dial: '977', flag: '🇳🇵' },
	{ iso: 'AF', name: 'Afghanistan', dial: '93', flag: '🇦🇫' },
	{ iso: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪' },
	{ iso: 'SA', name: 'Saudi Arabia', dial: '966', flag: '🇸🇦' },
	{ iso: 'QA', name: 'Qatar', dial: '974', flag: '🇶🇦' },
	{ iso: 'KW', name: 'Kuwait', dial: '965', flag: '🇰🇼' },
	{ iso: 'OM', name: 'Oman', dial: '968', flag: '🇴🇲' },
	{ iso: 'BH', name: 'Bahrain', dial: '973', flag: '🇧🇭' },
	{ iso: 'JO', name: 'Jordan', dial: '962', flag: '🇯🇴' },
	{ iso: 'TR', name: 'Türkiye', dial: '90', flag: '🇹🇷' },
	{ iso: 'EG', name: 'Egypt', dial: '20', flag: '🇪🇬' },
	{ iso: 'US', name: 'United States', dial: '1', flag: '🇺🇸' },
	{ iso: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦' },
	{ iso: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧' },
	{ iso: 'IE', name: 'Ireland', dial: '353', flag: '🇮🇪' },
	{ iso: 'DE', name: 'Germany', dial: '49', flag: '🇩🇪' },
	{ iso: 'FR', name: 'France', dial: '33', flag: '🇫🇷' },
	{ iso: 'IT', name: 'Italy', dial: '39', flag: '🇮🇹' },
	{ iso: 'ES', name: 'Spain', dial: '34', flag: '🇪🇸' },
	{ iso: 'NL', name: 'Netherlands', dial: '31', flag: '🇳🇱' },
	{ iso: 'SE', name: 'Sweden', dial: '46', flag: '🇸🇪' },
	{ iso: 'CH', name: 'Switzerland', dial: '41', flag: '🇨🇭' },
	{ iso: 'AU', name: 'Australia', dial: '61', flag: '🇦🇺' },
	{ iso: 'NZ', name: 'New Zealand', dial: '64', flag: '🇳🇿' },
	{ iso: 'MY', name: 'Malaysia', dial: '60', flag: '🇲🇾' },
	{ iso: 'SG', name: 'Singapore', dial: '65', flag: '🇸🇬' },
	{ iso: 'ID', name: 'Indonesia', dial: '62', flag: '🇮🇩' },
	{ iso: 'PH', name: 'Philippines', dial: '63', flag: '🇵🇭' },
	{ iso: 'CN', name: 'China', dial: '86', flag: '🇨🇳' },
	{ iso: 'JP', name: 'Japan', dial: '81', flag: '🇯🇵' },
	{ iso: 'KR', name: 'South Korea', dial: '82', flag: '🇰🇷' },
	{ iso: 'ZA', name: 'South Africa', dial: '27', flag: '🇿🇦' },
	{ iso: 'NG', name: 'Nigeria', dial: '234', flag: '🇳🇬' },
	{ iso: 'KE', name: 'Kenya', dial: '254', flag: '🇰🇪' },
	{ iso: 'BR', name: 'Brazil', dial: '55', flag: '🇧🇷' },
	{ iso: 'MX', name: 'Mexico', dial: '52', flag: '🇲🇽' }
];

const CURRENCY_TO_COUNTRY: Record<string, string> = {
	PKR: 'PK',
	INR: 'IN',
	BDT: 'BD',
	AED: 'AE',
	SAR: 'SA',
	USD: 'US',
	CAD: 'CA',
	GBP: 'GB',
	AUD: 'AU'
};

/** The country to preselect for a store, guessed from its currency (Pakistan by default). */
export function defaultCountryIso(currencyCode: string | null | undefined): string {
	return CURRENCY_TO_COUNTRY[currencyCode ?? ''] ?? 'PK';
}

export function findCountry(iso: string): Country {
	return COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0];
}
