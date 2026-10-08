# VendWiz: Product Requirements Document (PRD)

**Platform Name:** Vendwiz
**Platform Format:** Progressive Web App (PWA)
**Primary Goal:** Enable merchants to instantly create and manage a no-payment e-commerce store hosted on a subdomain, providing a seamless, app-like experience for customers.

---

## 1. User Roles

- **Store Owner (Admin):** The merchant who signs up, configures their store, inputs their platform verification code, uploads products, manages inventory, and processes orders.
- **Customer:** The end-user who browses a specific store's subdomain, adds products to their cart, submits guest checkouts, and can track orders or leave reviews.

---

## 2. Store Owner (Admin) Features

### 2.1 Onboarding, Licensing & Store Configuration

- **Authentication:** Standard sign-up and login (Email/Password or Social Auth).
- **Platform Licensing / Earning Model:** Store owners input a unique verification code provided by Vendwiz to confirm payment/subscription for the service, unlocking or keeping their store active.
- **Subdomain Claiming:** Admin can search for and claim a unique subdomain (e.g., mystore.vendwiz.com).
- **Branding:** Upload fields for Store Logo and Favicon.
- **Theme Selection & Generation:** Choose from pre-defined UI themes (e.g., Minimal, Bold, Playful) or utilize dynamically generated themes powered by Claude Design to customize color palettes, typography, and component layouts.
- **Social Links:** Input fields for WhatsApp, Instagram, Facebook, and standard contact details to be displayed on the storefront footer/header.
- **Store Policies:** WYSIWYG editors to generate "Return & Refund Policy," "Shipping Information," "Terms of Service," and "FAQ" pages.

### 2.2 Catalog & Product Management

- **Category Management:** Create, edit, and organize product categories.
- **Product Creation:** Standard fields including Title, Description, and Price.
- **Product Variants:** Ability to define variant options (e.g., Size: S, M, L; Color: Red, Blue) with distinct pricing if necessary.
- **Product Attributes & Specifications:** Define structured attribute tables (e.g., Material, Weight, Dimensions) for detailed product specifications.
- **Media Management:**
  - Images: Upload and reorder multiple product images.
  - Videos: URL input for YouTube/YouTube Shorts to be natively embedded on the product page.
- **Inventory Tracking & Low Stock Alerts:** Automated stock management. Admin sets stock quantity; system deducts upon ordering, flags items as "Out of Stock" at zero, and triggers a dashboard notification/badge when stock falls below a low-stock threshold.
- **SEO Configuration:** Input fields for custom Meta Titles and Meta Descriptions per product and for the overall store.

### 2.3 Marketing & Sales Tools

- **Discount Engine:** Generate custom promotional codes (e.g., "WINTER20") with defined fixed or percentage-based discounts.
- **Announcement Bar:** Customizable top-bar banner for global store announcements (e.g., "Free Shipping over $50").
- **Shipping/Delivery Fees & Taxes:** Configuration for flat-rate delivery charges, conditional free shipping thresholds, and configurable flat-percentage tax rates (GST/VAT/Sales Tax) calculated at checkout.

### 2.4 Order & Review Management

| Feature | Description |
|---|---|
| Order Dashboard | Centralized view of all incoming orders containing customer details, cart contents, itemized taxes/shipping, and calculated totals. |
| Order Workflows | Status updates from Pending → Processing → Dispatched → Completed / Cancelled. |
| Notifications & WhatsApp Confirmation | PWA push/email alerts for admins (including low-stock warnings). Automated WhatsApp message trigger sent to the customer upon order submission to confirm details; manual override/trigger available in dashboard if needed. |
| Review Moderation | Dedicated dashboard tab to view, approve, hide, or delete customer product ratings and reviews. |
| Basic Analytics | Overview metrics displaying "Total Orders," "Total Sales Value," and "Top Selling Products" over filtered time ranges. |

---

## 3. Customer Storefront Features (The PWA)

### 3.1 Core PWA Experience & Discovery

- **Installability:** "Add to Home Screen" prompt for mobile users to install the store as a standalone application.
- **Global Search:** Persistent search bar in the header allowing customers to find products via keywords.
- **Product Listing Page (PLP):** Supports filtering (Category, Price Range) and sorting (Price Low/High, Newest, Alphabetical).
- **Order Tracking Page:** Public lookup page where customers can enter their Order ID and Email address to check live dispatch status without needing an account.

### 3.2 Product Detail Page (PDP)

- **Media Gallery:** Swipeable image carousel and integrated YouTube video/shorts player.
- **Variant Selection & Specs:** Interactive selectors for size/color variants and a clear specification attribute table (e.g., dimensions, materials).
- **Ratings & Reviews:** Aggregated star ratings, text review display, and a form for customers to submit new 1-5 star reviews.
- **Cross-Selling:** "You Might Also Like" section dynamically displaying related products to increase basket size.

### 3.3 Cart & Checkout (Guest Only)

- **Persistent Cart:** Allows users to review items, apply promo/discount codes, and view calculated flat-rate shipping fees and taxes.
- **Online Order Submission (No Payment Gateway):** Checkout acts as an online order form collecting Full Name, Phone Number, Email, and Complete Shipping Address.
- **Order Confirmation & Verification Trigger:** Post-submission screen providing an order reference. Automatically dispatches an order-confirmation WhatsApp message to the customer (with manual fallback triggers available to the admin). Instructs the customer that the store owner will coordinate directly for payment and fulfillment.

---

## 4. Out of Scope (V1)

- Payment gateway integrations (Stripe, PayPal, etc.)
- Customer account creation and authentication (Guest checkout only)
- Automated shipping rate calculators via courier APIs
- Direct video file hosting
- Custom domain mapping (users are restricted to the provided subdomain)
- Digital / downloadable product fulfillment
