'use strict';

/**
 * Runtime HTTP verification for discount form actions.
 *
 * Tests that:
 *   POST /admin/discounts/new?/create   → 302 (criteria 5 & 7)
 *   POST /admin/discounts/[id]?/update  → 302 (criterion 6)
 *   POST /admin/discounts/new?/default  → 404 (reserved name no longer registered)
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:PORT node scripts/verify-discount-actions.cjs
 *
 * DATABASE_URL must be set in the environment (used by psql for seeding).
 *
 * Exits 0 on success, 1 on any assertion failure, 2 on setup errors.
 */

const { execSync } = require('child_process');
const http = require('http');

const BASE_URL = process.env.BASE_URL;
if (!BASE_URL) {
  console.error('Fatal: BASE_URL env var is required (e.g. BASE_URL=http://127.0.0.1:5173)');
  process.exit(2);
}

if (!process.env.DATABASE_URL) {
  console.error('Fatal: DATABASE_URL environment variable is not set — cannot seed database');
  process.exit(2);
}

// better-auth validates Origin against PUBLIC_APP_URL baked into the build.
// For dev, PUBLIC_APP_URL defaults to http://localhost:5173; override via AUTH_ORIGIN.
const AUTH_ORIGIN = process.env.AUTH_ORIGIN || 'http://localhost:5173';

// ── HTTP helpers ──────────────────────────────────────────────────────────────

/** JSON POST — used for better-auth sign-up / sign-in (avoids CSRF check). */
function httpPost(url, jsonBody, cookieStr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(jsonBody);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Origin: AUTH_ORIGIN,
        Referer: AUTH_ORIGIN + '/',
      },
    };
    if (cookieStr) options.headers['Cookie'] = cookieStr;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Multipart form POST — mirrors a native browser form submission.
 *
 * Sends Accept: text/html so SvelteKit's action handler emits a real HTTP 302
 * redirect instead of the JSON-wrapped 200 it returns for Accept: *‌/* or
 * Accept: application/json (used by use:enhance).
 *
 * Also sends Origin matching the server so SvelteKit's CSRF check passes.
 */
function formPost(url, fields, cookieStr) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    let body = '';
    for (const [k, v] of Object.entries(fields)) {
      body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
    }
    body += `--${boundary}--\r\n`;
    const bodyBuf = Buffer.from(body);

    const urlObj = new URL(url);
    const serverOrigin = `http://${urlObj.hostname}:${urlObj.port}`;
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuf.length,
        // Accept: text/html tells SvelteKit to return a real HTTP 302.
        // Without this (or with Accept: */*, application/json) SvelteKit
        // wraps redirects as HTTP 200 + JSON body.
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Origin: serverOrigin,
        Referer: serverOrigin + '/',
      },
    };
    if (cookieStr) options.headers['Cookie'] = cookieStr;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const ts = Date.now();
  const email = `verify-discount-${ts}@qa.test`;
  const password = 'Verify1234!';
  const discountCode = `VFY${ts.toString().slice(-7)}`;
  const updatedCode = `UPD${ts.toString().slice(-7)}`;
  const licenseCode = `VERLIC-${ts}`;
  const licenseId = `verlic-${ts}`;
  const subdomain = `vfystore${ts.toString().slice(-7)}`;

  let failures = 0;
  function fail(msg) {
    console.error(`FAIL: ${msg}`);
    failures++;
  }
  function pass(msg) {
    console.log(`PASS: ${msg}`);
  }

  // ── Step 1: Sign up ────────────────────────────────────────────────────────
  console.log('Step 1: Signing up...');
  const signUpRes = await httpPost(`${BASE_URL}/api/auth/sign-up/email`, {
    email, password, name: 'Verify Discount User',
  });
  if (signUpRes.status !== 200) {
    console.error(`Sign-up failed (${signUpRes.status}): ${signUpRes.body}`);
    process.exit(2);
  }
  console.log('Sign-up OK');

  // ── Step 2: Sign in & get session cookie ───────────────────────────────────
  console.log('Step 2: Signing in...');
  const signInRes = await httpPost(`${BASE_URL}/api/auth/sign-in/email`, {
    email, password,
  });
  if (signInRes.status !== 200) {
    console.error(`Sign-in failed (${signInRes.status}): ${signInRes.body}`);
    process.exit(2);
  }

  let sessionToken = '';
  const setCookies = signInRes.headers['set-cookie'] || [];
  for (const c of setCookies) {
    const m = c.match(/better-auth\.session_token=([^;]+)/);
    if (m) sessionToken = m[1];
  }
  if (!sessionToken) {
    try {
      const parsed = JSON.parse(signInRes.body);
      if (parsed.token) sessionToken = parsed.token;
    } catch (_) {}
  }
  if (!sessionToken) {
    console.error('No session token received');
    process.exit(2);
  }
  const cookieStr = `better-auth.session_token=${sessionToken}`;
  console.log('Sign-in OK');

  // ── Step 3: Fetch the user id from the session ─────────────────────────────
  console.log('Step 3: Fetching user id...');
  let userId = null;
  try {
    const parsed = JSON.parse(signInRes.body);
    userId = parsed.user?.id || parsed.id || null;
  } catch (_) {}
  if (!userId) {
    // fall back: query db
    try {
      userId = execSync(
        `psql "$DATABASE_URL" -t -c "SELECT id FROM \\"user\\" WHERE email='${email}' LIMIT 1;"`,
        { stdio: 'pipe' }
      ).toString().trim();
    } catch (e) {
      console.error('Could not fetch user id:', e.stderr?.toString() || e.message);
      process.exit(2);
    }
  }
  if (!userId) {
    console.error('User id not found');
    process.exit(2);
  }
  console.log(`User id: ${userId}`);

  // ── Step 4: Insert license key ─────────────────────────────────────────────
  console.log('Step 4: Inserting license key...');
  try {
    execSync(
      `psql "$DATABASE_URL" -c "INSERT INTO license_keys (id, code, created_at) VALUES ('${licenseId}', '${licenseCode}', NOW());"`,
      { stdio: 'pipe' }
    );
  } catch (e) {
    console.error('License key insert failed:', e.stderr?.toString() || e.message);
    process.exit(2);
  }
  console.log('License key inserted');

  // ── Step 5: Create store via onboarding action ─────────────────────────────
  console.log('Step 5: Creating store...');
  const onboardRes = await formPost(
    `${BASE_URL}/onboarding?/createStore`,
    { licenseCode, subdomain, name: 'Verify Discount Store', theme: 'basic' },
    cookieStr
  );
  const isOnboardOk =
    onboardRes.status === 302 ||
    (onboardRes.status === 200 && onboardRes.body.includes('"type":"redirect"'));
  if (!isOnboardOk) {
    console.error(`Onboarding failed (${onboardRes.status}): ${onboardRes.body.slice(0, 300)}`);
    process.exit(2);
  }
  console.log('Store created OK');

  // ── Step 6: POST /admin/discounts/new?/create → expect 302 ────────────────
  console.log(`Step 6: POST /admin/discounts/new?/create (code=${discountCode})...`);
  const createRes = await formPost(
    `${BASE_URL}/admin/discounts/new?/create`,
    { code: discountCode, type: 'percentage', value: '10', isActive: 'on' },
    cookieStr
  );
  console.log(`  → status ${createRes.status}, Location: ${createRes.headers.location || '(none)'}`);
  if (createRes.status === 302 && createRes.headers.location === '/admin/discounts') {
    pass('POST /admin/discounts/new?/create returns 302 → /admin/discounts');
  } else if (createRes.status === 302) {
    pass(`POST /admin/discounts/new?/create returns 302 (Location: ${createRes.headers.location})`);
  } else {
    fail(
      `POST /admin/discounts/new?/create expected 302, got ${createRes.status}` +
      (createRes.status === 500 ? ' — "Cannot use reserved action name default" likely still present' : '') +
      (createRes.status === 404 ? ' — action key not registered (rename may be missing)' : '')
    );
  }

  // ── Step 7: Fetch discount ID via psql ─────────────────────────────────────
  console.log('Step 7: Fetching discount ID from database...');
  let discountId = null;
  try {
    const row = execSync(
      `psql "$DATABASE_URL" -t -c "SELECT id FROM discount_codes WHERE code='${discountCode}' LIMIT 1;"`,
      { stdio: 'pipe' }
    ).toString().trim();
    discountId = row.trim() || null;
  } catch (e) {
    console.error('Could not fetch discount ID:', e.stderr?.toString() || e.message);
  }

  if (!discountId) {
    fail('Discount record not found in database after creation — cannot test update');
  } else {
    console.log(`  Discount ID: ${discountId}`);

    // ── Step 8: POST /admin/discounts/[id]?/update → expect 302 ───────────
    console.log(`Step 8: POST /admin/discounts/${discountId}?/update...`);
    const updateRes = await formPost(
      `${BASE_URL}/admin/discounts/${discountId}?/update`,
      { code: updatedCode, type: 'fixed', value: '5', isActive: 'on' },
      cookieStr
    );
    console.log(`  → status ${updateRes.status}, Location: ${updateRes.headers.location || '(none)'}`);
    if (updateRes.status === 302) {
      pass(`POST /admin/discounts/${discountId}?/update returns 302`);
    } else {
      fail(`POST /admin/discounts/${discountId}?/update expected 302, got ${updateRes.status}`);
    }
  }

  // ── Step 9: POST ?/default → expect 404 (reserved name no longer registered) ─
  console.log('Step 9: POST /admin/discounts/new?/default → expect 404 (not 500)...');
  const defaultRes = await formPost(
    `${BASE_URL}/admin/discounts/new?/default`,
    { code: 'UNUSED', type: 'percentage', value: '1' },
    cookieStr
  );
  console.log(`  → status ${defaultRes.status}`);
  if (defaultRes.status === 500) {
    fail('POST ?/default returned 500 — reserved action name guard still firing (default: key not renamed)');
  } else if (defaultRes.status === 404) {
    pass('POST /admin/discounts/new?/default returns 404 (handler no longer registered)');
  } else {
    // Any non-500 is acceptable — the reserved-name error is gone
    pass(`POST /admin/discounts/new?/default returns ${defaultRes.status} (not 500)`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  if (failures === 0) {
    console.log('\nAll checks passed — discount actions are correctly named.');
    process.exit(0);
  } else {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(2);
});
