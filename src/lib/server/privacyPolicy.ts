// Standard privacy policy shown at /policies/privacy until the owner writes their own
// (Admin → Settings → Policies → Privacy Policy). Google Play requires every app to link one,
// so the page must always exist. Describes the data the storefront actually collects.

type StoreInfo = {
	name: string;
	contactEmail: string | null;
	contactPhone: string | null;
	whatsapp: string | null;
};

export function defaultPrivacyPolicy(store: StoreInfo): string {
	const contact =
		[
			store.contactEmail && `email **${store.contactEmail}**`,
			store.contactPhone && `call **${store.contactPhone}**`,
			store.whatsapp && `message us on WhatsApp at **${store.whatsapp}**`
		]
			.filter(Boolean)
			.join(', ') || 'use the details on our Contact page';

	return `This policy explains what information **${store.name}** collects when you use our website or app, and how we use it.

## Information we collect

- **Order details** — your name, phone number, email address (if given) and delivery address, which you enter at checkout.
- **Order history** — the products you buy, prices paid and the payment method you choose (cash on delivery or bank transfer). We do not collect or store card numbers.
- **Reviews** — the name and text you submit with a product review.
- **Basic technical data** — such as your IP address and browser type, used to keep the site secure and working.

Your cart is kept on your own device until you place an order.

## How we use it

We use this information only to process and deliver your orders, contact you about them, send order confirmations and updates, prevent fraud, and improve our store.

## Sharing

We do not sell your personal information. We share it only with the people who need it to fulfil your order, such as delivery partners, and with service providers that host our store and send our emails, who may use it only for that purpose. We may also disclose it when required by law.

## Retention and security

We keep order records for as long as needed for delivery, returns, accounting and legal requirements. All data is sent over an encrypted (HTTPS) connection.

## Your choices

You can ask us to see, correct or delete the personal information we hold about you. To do so, ${contact}.

## Children

Our store is not directed at children under 13, and we do not knowingly collect their information.

## Changes

We may update this policy from time to time. The current version is always available on this page.`;
}
