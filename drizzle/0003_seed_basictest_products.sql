-- Seed the basictest store, its owner, its categories, and 9 published
-- products so that AC-5 is satisfied: 8-10 products visible at /products,
-- spanning ≥ 2 categories.  Two products carry a sale_price to exercise
-- the "on sale" filter.
--
-- Dependency order:
--   users  →  stores  →  categories  →  products
--
-- All statements are idempotent: ON CONFLICT DO NOTHING.

-- ── 1. Seed owner user ────────────────────────────────────────────────────────
INSERT INTO users (id, email, email_verified, name, created_at, updated_at)
VALUES (
  'user-basictest-owner',
  'basictest@example.com',
  true,
  'Basictest Owner',
  now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Seed store ─────────────────────────────────────────────────────────────
INSERT INTO stores (
  id, owner_id, subdomain, name,
  theme, is_active,
  shipping_fee, tax_rate,
  announcement_enabled,
  created_at, updated_at
) VALUES (
  'basic-theme-store-001',
  'user-basictest-owner',
  'basictest',
  'Basictest Store',
  'basic', true,
  '0', '0',
  false,
  now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Seed categories ────────────────────────────────────────────────────────
INSERT INTO categories (id, store_id, name, slug, sort_order, created_at)
VALUES
  ('cat-basic-1', 'basic-theme-store-001', 'Tops',    'tops',    0, now()),
  ('cat-basic-2', 'basic-theme-store-001', 'Bottoms', 'bottoms', 1, now()),
  ('cat-basic-3', 'basic-theme-store-001', 'Shoes',   'shoes',   2, now())
ON CONFLICT (id) DO NOTHING;

-- ── 4. Seed products ──────────────────────────────────────────────────────────
-- Spread across all three categories (Tops / Bottoms / Shoes).
-- Two products carry a sale_price to exercise the "on sale" filter.

INSERT INTO products (
  id, store_id, category_id,
  title, slug, description,
  base_price, sale_price,
  images, stock_qty,
  is_published, sort_order
) VALUES
  -- ── Tops (cat-basic-1) ────────────────────────────────────────────────────
  (
    'prod-basic-001', 'basic-theme-store-001', 'cat-basic-1',
    'Classic White T-Shirt', 'classic-white-t-shirt',
    'A timeless white tee crafted from 100% combed cotton.',
    '1200', NULL,
    '[{"url":"https://picsum.photos/seed/tshirt1/400/400","alt":"Classic White T-Shirt","order":0}]',
    50, true, 0
  ),
  (
    'prod-basic-002', 'basic-theme-store-001', 'cat-basic-1',
    'Striped Polo Shirt', 'striped-polo-shirt',
    'Casual striped polo for everyday wear — now on sale.',
    '1800', '1400',
    '[{"url":"https://picsum.photos/seed/polo1/400/400","alt":"Striped Polo Shirt","order":0}]',
    30, true, 1
  ),
  (
    'prod-basic-003', 'basic-theme-store-001', 'cat-basic-1',
    'Graphic Print Tee', 'graphic-print-tee',
    'Bold graphic print on ultra-soft cotton jersey.',
    '1500', NULL,
    '[{"url":"https://picsum.photos/seed/graphic1/400/400","alt":"Graphic Print Tee","order":0}]',
    25, true, 2
  ),
  -- ── Bottoms (cat-basic-2) ─────────────────────────────────────────────────
  (
    'prod-basic-004', 'basic-theme-store-001', 'cat-basic-2',
    'Slim Fit Jeans', 'slim-fit-jeans',
    'Classic slim-fit denim jeans in a versatile dark wash.',
    '3500', NULL,
    '[{"url":"https://picsum.photos/seed/jeans1/400/400","alt":"Slim Fit Jeans","order":0}]',
    20, true, 0
  ),
  (
    'prod-basic-005', 'basic-theme-store-001', 'cat-basic-2',
    'Chino Trousers', 'chino-trousers',
    'Smart-casual chino trousers, perfect for any occasion.',
    '2800', '2200',
    '[{"url":"https://picsum.photos/seed/chino1/400/400","alt":"Chino Trousers","order":0}]',
    15, true, 1
  ),
  (
    'prod-basic-006', 'basic-theme-store-001', 'cat-basic-2',
    'Jogger Pants', 'jogger-pants',
    'Comfortable jogger pants with an elasticated waistband.',
    '2000', NULL,
    '[{"url":"https://picsum.photos/seed/jogger1/400/400","alt":"Jogger Pants","order":0}]',
    35, true, 2
  ),
  -- ── Shoes (cat-basic-3) ───────────────────────────────────────────────────
  (
    'prod-basic-007', 'basic-theme-store-001', 'cat-basic-3',
    'Canvas Sneakers', 'canvas-sneakers',
    'Lightweight canvas sneakers for all-day comfort.',
    '4500', NULL,
    '[{"url":"https://picsum.photos/seed/sneaker1/400/400","alt":"Canvas Sneakers","order":0}]',
    18, true, 0
  ),
  (
    'prod-basic-008', 'basic-theme-store-001', 'cat-basic-3',
    'Leather Loafers', 'leather-loafers',
    'Premium leather loafers for a polished, effortless look.',
    '6500', NULL,
    '[{"url":"https://picsum.photos/seed/loafer1/400/400","alt":"Leather Loafers","order":0}]',
    12, true, 1
  ),
  (
    'prod-basic-009', 'basic-theme-store-001', 'cat-basic-3',
    'Sport Running Shoes', 'sport-running-shoes',
    'Performance running shoes with cushioned responsive soles.',
    '5000', NULL,
    '[{"url":"https://picsum.photos/seed/runner1/400/400","alt":"Sport Running Shoes","order":0}]',
    22, true, 2
  )
ON CONFLICT (id) DO NOTHING;
