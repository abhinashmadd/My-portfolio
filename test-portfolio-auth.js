/**
 * COMPREHENSIVE SECURITY AUDIT & AUTHENTICATION TEST SUITE - ABHINASH MADDHESHIYA PORTFOLIO
 * Verifies all 20 Security Hardening Requirements:
 * 1. Strict CORS Origin Whitelisting (Reject untrusted origins)
 * 2. HTTP Security Headers (CSP, X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
 * 3. Static File Jail & Traversal Prevention (.env, server.js, data, dotfiles)
 * 4. Input Sanitization & Form Validation (XSS Prevention & Email format checking)
 * 5. Authentication & Smooth Role Mapping (Admin, Recruiter, Guest)
 * 6. HMAC-SHA256 Token Signing & Tamper Resistance
 * 7. Protected Admin Routes & RBAC Guards (Delete/Patch protection)
 * 8. Broken Object-Level Authorization (BOLA) Defense on individual records
 * 9. Anti-CSRF Token Generation & Cross-Site Request Rejection
 * 10. Session Invalidation & Token Revocation on Logout
 * 11. RFC 6238 TOTP Multi-Factor Authentication (Setup, Verify, Validate, Recovery Key, Disable)
 * 12. In-Memory Rate Limiting (429 on abuse)
 * 13. Legal Pages & Brand Assets
 */

const http = require('node:http');
const assert = require('node:assert');
const crypto = require('node:crypto');

// Configure test port and test environment
const PORT = 3001;
process.env.PORT = String(PORT);
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test_secret_hardening_8a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d';
process.env.WEBHOOK_SECRET = 'test_webhook_secret_12345678901234567890123456789012';
process.env.ADMIN_PASSWORD = 'Abhi0819@';
process.env.RECRUITER_PASSWORD = 'Recruiter2026';

// Boot backend server
require('./server.js');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function doRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:${PORT}${path}`, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// Client-side TOTP calculation helper for test verification
function computeTestTotp(secretBase32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = secretBase32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = chars.indexOf(clean[i]);
    if (val !== -1) bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  const key = Buffer.from(bytes);

  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  let cur = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = cur & 0xff;
    cur = Math.floor(cur / 256);
  }

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeNum = ((hmac[offset] & 0x7f) << 24) |
                  ((hmac[offset + 1] & 0xff) << 16) |
                  ((hmac[offset + 2] & 0xff) << 8) |
                  (hmac[offset + 3] & 0xff);
  return (codeNum % 1000000).toString().padStart(6, '0');
}

async function runTests() {
  await delay(1000); // Allow server startup
  console.log('--- Starting Portfolio Full Production Security & Auth Test Suite ---\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
      failed++;
    }
  }

  // ========================================================================
  // [1] CORS & ORIGIN WHITELISTING
  // ========================================================================
  console.log('[1] CORS Origin Whitelisting & Preflight:');

  await test('OPTIONS with whitelisted origin returns 204 and echoes origin with credentials', async () => {
    const res = await doRequest('/api/admin/login', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://abhinashmadd.github.io',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert.strictEqual(res.statusCode, 204);
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://abhinashmadd.github.io');
    assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
  });

  await test('OPTIONS with untrusted origin is rejected with 403 Forbidden', async () => {
    const res = await doRequest('/api/admin/login', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://malicious-phishing-site.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert.strictEqual(res.statusCode, 403);
    assert(!res.headers['access-control-allow-origin']);
  });

  // ========================================================================
  // [2] HTTP SECURITY HEADERS
  // ========================================================================
  console.log('\n[2] HTTP Security Headers:');

  await test('Root request returns complete suite of security headers', async () => {
    const res = await doRequest('/', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');
    assert.strictEqual(res.headers['x-xss-protection'], '1; mode=block');
    assert.strictEqual(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert(res.headers['strict-transport-security']);
    assert(res.headers['content-security-policy'].includes("default-src 'self'"));
    assert(res.headers['content-security-policy'].includes("frame-ancestors 'none'"));
  });

  // ========================================================================
  // [3] STATIC FILE JAIL & SENSITIVE FILE PROTECTION
  // ========================================================================
  console.log('\n[3] Static File Jail & Sensitive Exposure Protection:');

  await test('GET /server.js is blocked with 403 Forbidden', async () => {
    const res = await doRequest('/server.js', { method: 'GET' });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('GET /.env is blocked with 403 Forbidden', async () => {
    const res = await doRequest('/.env', { method: 'GET' });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('GET /data/messages.json is blocked with 403 Forbidden', async () => {
    const res = await doRequest('/data/messages.json', { method: 'GET' });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('GET /package.json is blocked with 403 Forbidden', async () => {
    const res = await doRequest('/package.json', { method: 'GET' });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('GET /test-portfolio-auth.js is blocked with 403 Forbidden', async () => {
    const res = await doRequest('/test-portfolio-auth.js', { method: 'GET' });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('GET /data/mfa.json is blocked with 403 Forbidden', async () => {
    const res = await doRequest('/data/mfa.json', { method: 'GET' });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('GET /script.sh is blocked with 403 Forbidden', async () => {
    const res = await doRequest('/script.sh', { method: 'GET' });
    assert.strictEqual(res.statusCode, 403);
  });

  // ========================================================================
  // [4] INPUT SANITIZATION & CONTACT FORM
  // ========================================================================
  console.log('\n[4] Form Sanitization & XSS Protection:');

  await test('POST /api/contact rejects missing required fields with 400', async () => {
    const res = await doRequest('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Alice', email: 'alice@example.com' }
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
  });

  await test('POST /api/contact rejects invalid email format with 400', async () => {
    const res = await doRequest('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: 'Bob',
        email: 'invalid-email-address',
        subject: 'Inquiry',
        message: 'This is a test message for testing.'
      }
    });
    assert.strictEqual(res.statusCode, 400);
    assert(res.data.error.includes('valid email'));
  });

  let createdMessageId = '';

  await test('POST /api/contact accepts valid submission and sanitizes HTML/XSS characters', async () => {
    const res = await doRequest('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: 'Carol <script>alert(1)</script>',
        email: 'carol@test.com',
        subject: 'Partnership & Collaboration',
        message: 'Hello, looking forward to discussing project milestones.'
      }
    });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.success, true);
    assert(res.data.id && res.data.id.startsWith('msg_'));
    createdMessageId = res.data.id;
  });

  // ========================================================================
  // [5] AUTHENTICATION & ROLE MAPPING
  // ========================================================================
  console.log('\n[5] Authentication & HMAC Tokens:');

  let adminToken = '';
  let recruiterToken = '';
  let guestToken = '';

  await test('Admin login with master password generates signed HMAC token & admin role', async () => {
    const res = await doRequest('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: 'Abhi0819@' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'admin');
    assert.strictEqual(res.data.roleMapping.role, 'admin');
    assert(res.data.roleMapping.permissions.includes('delete'));
    assert(res.data.token && res.data.token.startsWith('am_tok_'));
    assert(res.data.token.includes('.'));
    adminToken = res.data.token;
  });

  await test('Recruiter login generates signed HMAC token & recruiter role', async () => {
    const res = await doRequest('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { role: 'recruiter' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'recruiter');
    assert(!res.data.roleMapping.permissions.includes('delete'));
    recruiterToken = res.data.token;
  });

  await test('Guest login generates signed HMAC token & guest role', async () => {
    const res = await doRequest('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { role: 'guest' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'guest');
    guestToken = res.data.token;
  });

  // ========================================================================
  // [6] TOKEN INTEGRITY & ANTI-TAMPERING
  // ========================================================================
  console.log('\n[6] Token Integrity & Tamper Resistance:');

  await test('GET /api/admin/me with valid Admin token verifies successfully', async () => {
    const res = await doRequest('/api/admin/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.user.role, 'admin');
  });

  await test('GET /api/admin/me rejects tampered token payload with 401 Unauthorized', async () => {
    const parts = recruiterToken.replace('am_tok_', '').split('.');
    const fakePayload = Buffer.from(JSON.stringify({ username: 'hacker', role: 'admin', exp: Date.now() + 100000 })).toString('base64url');
    const forgedToken = `am_tok_${fakePayload}.${parts[1]}`;

    const res = await doRequest('/api/admin/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${forgedToken}` }
    });
    assert.strictEqual(res.statusCode, 401);
  });

  await test('GET /api/admin/me rejects modified signature with 401 Unauthorized', async () => {
    const parts = adminToken.split('.');
    const tamperedSigToken = `${parts[0]}.bad_signature_xyz`;

    const res = await doRequest('/api/admin/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tamperedSigToken}` }
    });
    assert.strictEqual(res.statusCode, 401);
  });

  await test('GET /api/admin/me rejects legacy static_token_ok with 401 Unauthorized', async () => {
    const res = await doRequest('/api/admin/me', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer static_token_ok' }
    });
    assert.strictEqual(res.statusCode, 401);
  });

  // ========================================================================
  // [7] PROTECTED ADMIN ROUTES & BOLA DEFENSE
  // ========================================================================
  console.log('\n[7] Protected Admin Routes & BOLA Defense:');

  await test('GET /api/messages WITHOUT token is rejected with 401 Unauthorized', async () => {
    const res = await doRequest('/api/messages', { method: 'GET' });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.data.success, false);
  });

  await test('GET /api/messages WITH valid Admin token returns 200 and messages', async () => {
    const res = await doRequest('/api/messages', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert(Array.isArray(res.data.messages));
  });

  await test('GET /api/messages/:id (BOLA) retrieves specific message for Admin', async () => {
    const res = await doRequest(`/api/messages/${createdMessageId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.item.id, createdMessageId);
    assert.strictEqual(res.data.item.email, 'carol@test.com');
  });

  await test('GET /api/messages/:id masks email address for Guest role', async () => {
    const res = await doRequest(`/api/messages/${createdMessageId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${guestToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.item.email.includes('*'));
  });

  await test('Recruiter DELETE request is rejected with 403 Forbidden', async () => {
    const res = await doRequest('/api/messages/dummy_id', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${recruiterToken}` }
    });
    assert.strictEqual(res.statusCode, 403);
    assert(res.data.error.includes('Permission denied'));
  });

  await test('Guest PATCH request is rejected with 403 Forbidden', async () => {
    const res = await doRequest('/api/messages/dummy_id', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${guestToken}`,
        'Content-Type': 'application/json'
      },
      body: { isRead: true }
    });
    assert.strictEqual(res.statusCode, 403);
  });

  // ========================================================================
  // [8] ANTI-CSRF PROTECTION
  // ========================================================================
  console.log('\n[8] Anti-CSRF Protection:');

  await test('GET /api/csrf-token issues cryptographically signed anti-CSRF token', async () => {
    const res = await doRequest('/api/csrf-token', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.csrfToken && res.data.csrfToken.includes('.'));
  });

  await test('State mutation with unauthorized cross-site Origin is rejected with 403', async () => {
    const res = await doRequest('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://attacker-origin.xyz'
      },
      body: { name: 'Evil', email: 'evil@x.com', subject: 'Spam', message: 'Spam message here' }
    });
    assert.strictEqual(res.statusCode, 403);
  });

  // ========================================================================
  // [9] TOKEN REVOCATION & LOGOUT
  // ========================================================================
  console.log('\n[9] Token Revocation & Logout:');

  await test('POST /api/admin/logout revokes session token', async () => {
    // Generate a temporary session to revoke
    const loginRes = await doRequest('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { role: 'guest' }
    });
    const tempTok = loginRes.data.token;

    // Call logout
    const logoutRes = await doRequest('/api/admin/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tempTok}` }
    });
    assert.strictEqual(logoutRes.statusCode, 200);
    assert.strictEqual(logoutRes.data.success, true);

    // Verify revoked token is now rejected on protected endpoint
    const checkRes = await doRequest('/api/admin/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tempTok}` }
    });
    assert.strictEqual(checkRes.statusCode, 401);
  });

  // ========================================================================
  // [10] RFC 6238 TOTP MULTI-FACTOR AUTHENTICATION (MFA)
  // ========================================================================
  console.log('\n[10] RFC 6238 TOTP Multi-Factor Authentication:');

  let totpSecret = '';
  let recoveryCodes = [];

  await test('POST /api/admin/mfa/setup generates TOTP key and recovery codes', async () => {
    const res = await doRequest('/api/admin/mfa/setup', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.secret && res.data.secret.length >= 16);
    assert(res.data.otpauthUrl.startsWith('otpauth://totp/'));
    assert(Array.isArray(res.data.recoveryCodes) && res.data.recoveryCodes.length === 8);
    totpSecret = res.data.secret;
    recoveryCodes = res.data.recoveryCodes;
  });

  await test('POST /api/admin/mfa/verify activates MFA with valid TOTP code', async () => {
    const validCode = computeTestTotp(totpSecret);
    const res = await doRequest('/api/admin/mfa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: {
        secret: totpSecret,
        code: validCode,
        recoveryCodes
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
  });

  await test('GET /api/admin/mfa/status confirms MFA is active', async () => {
    const res = await doRequest('/api/admin/mfa/status', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.mfaEnabled, true);
  });

  let mfaTempToken = '';

  await test('Login with MFA enabled prompts for second factor (mfaRequired)', async () => {
    const res = await doRequest('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: 'Abhi0819@' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.mfaRequired, true);
    assert(res.data.tempToken && res.data.tempToken.startsWith('am_mfa_tmp_'));
    mfaTempToken = res.data.tempToken;
  });

  await test('POST /api/admin/mfa/validate validates code and issues full session token', async () => {
    const validCode = computeTestTotp(totpSecret);
    const res = await doRequest('/api/admin/mfa/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        tempToken: mfaTempToken,
        code: validCode
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.role, 'admin');
    assert(res.data.token && res.data.token.startsWith('am_tok_'));
    // Update admin token for subsequent calls
    adminToken = res.data.token;
  });

  await test('POST /api/admin/mfa/disable disables 2FA with admin password confirmation', async () => {
    const res = await doRequest('/api/admin/mfa/disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: { password: 'Abhi0819@' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
  });

  // ========================================================================
  // [11] RATE LIMITING
  // ========================================================================
  console.log('\n[11] In-Memory Rate Limiting:');

  await test('Burst login requests trigger 429 Too Many Requests', async () => {
    let triggeredRateLimit = false;
    for (let i = 0; i < 4; i++) {
      const res = await doRequest('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { password: 'wrong_password' }
      });
      if (res.statusCode === 429) {
        triggeredRateLimit = true;
        assert(res.headers['retry-after']);
        break;
      }
    }
    assert.strictEqual(triggeredRateLimit, true, 'Rate limiter should return 429 after exceeding limit');
  });

  // ========================================================================
  // [12] LEGAL PAGES & BRAND ASSETS
  // ========================================================================
  console.log('\n[12] Legal Pages & Brand Assets:');

  await test('GET /privacy-policy returns 200 OK with privacy text', async () => {
    const res = await doRequest('/privacy-policy', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.includes('Privacy Policy'));
  });

  await test('GET /terms-of-service returns 200 OK with terms of service text', async () => {
    const res = await doRequest('/terms-of-service', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.includes('Terms of Service') || res.data.includes('Terms'));
  });

  await test('GET /terms-and-conditions returns 200 OK with terms text', async () => {
    const res = await doRequest('/terms-and-conditions', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.includes('Terms &amp; Conditions') || res.data.includes('Terms'));
  });

  await test('GET /refund-policy returns 200 OK with refund terms', async () => {
    const res = await doRequest('/refund-policy', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.includes('Refund &amp; Service Policy') || res.data.includes('Refund'));
  });

  await test('GET /cookie-policy returns 200 OK with cookie disclosure', async () => {
    const res = await doRequest('/cookie-policy', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert(res.data.includes('Cookie &amp; Storage Policy') || res.data.includes('Cookie'));
  });

  await test('GET /favicon.svg returns 200 OK with SVG type', async () => {
    const res = await doRequest('/favicon.svg', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'image/svg+xml');
  });


  await test('GET /api/compliance returns 200 OK with business details and legal routes', async () => {
    const res = await doRequest('/api/compliance', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.businessDetails.contactEmail, 'absmadd@gmail.com');
    assert.strictEqual(res.data.routes.privacyPolicy, '/privacy-policy');
  });

  await test('GET /api/business-details returns 200 OK with direct contact information', async () => {
    const res = await doRequest('/api/business-details', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.email, 'absmadd@gmail.com');
  });

  await test('GET /assets/code2career-hackathon-certificate.png returns 200 OK with image/png type', async () => {
    const res = await doRequest('/assets/code2career-hackathon-certificate.png', { method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'image/png');
  });

  // ========================================================================
  // [13] COMPLIANCE: DATA DELETION & AGE CONSENT
  // ========================================================================
  console.log('\n[13] Compliance: Data Deletion & Age Consent:');

  await test('POST /api/contact with ageConsent: false is rejected with 400', async () => {
    const res = await doRequest('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: 'Underage User',
        email: 'minor@example.com',
        subject: 'Inquiry',
        message: 'This is a message from a minor without age consent.',
        ageConsent: false
      }
    });
    assert.strictEqual(res.statusCode, 400);
    assert(res.data.error.includes('16 years of age'));
  });

  await test('POST /api/data-deletion-request with invalid email is rejected with 400', async () => {
    const res = await doRequest('/api/data-deletion-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Test', email: 'invalid-email' }
    });
    assert.strictEqual(res.statusCode, 400);
  });

  await test('POST /api/data-deletion-request processes and purges user records with 200', async () => {
    const res = await doRequest('/api/data-deletion-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Carol Test', email: 'carol@test.com' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert(res.data.message.includes('Data deletion request processed'));
  });

  // ========================================================================
  // [14] WEBHOOK SIGNATURE VERIFICATION & REPLAY DEFENSE
  // ========================================================================
  console.log('\n[14] Webhook Signature Verification & Replay Defense:');

  const webhookSecret = process.env.WEBHOOK_SECRET;
  const webhookBody = JSON.stringify({ event: 'test_ping', eventId: 'evt_991823' });
  const validTimestamp = String(Date.now());
  const validSignature = crypto.createHmac('sha256', webhookSecret)
    .update(`${validTimestamp}.${webhookBody}`)
    .digest('hex');

  await test('POST /api/webhooks with valid signature and timestamp returns 200', async () => {
    const res = await doRequest('/api/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': validSignature,
        'X-Webhook-Timestamp': validTimestamp
      },
      body: webhookBody
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.verified, true);
  });

  await test('POST /api/webhooks without signature headers is rejected with 401', async () => {
    const res = await doRequest('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: webhookBody
    });
    assert.strictEqual(res.statusCode, 401);
  });

  await test('POST /api/webhooks with expired timestamp (>5m) is rejected with 400 (replay defense)', async () => {
    const oldTimestamp = String(Date.now() - (10 * 60 * 1000)); // 10 minutes ago
    const sig = crypto.createHmac('sha256', webhookSecret)
      .update(`${oldTimestamp}.${webhookBody}`)
      .digest('hex');
    const res = await doRequest('/api/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': sig,
        'X-Webhook-Timestamp': oldTimestamp
      },
      body: webhookBody
    });
    assert.strictEqual(res.statusCode, 400);
    assert(res.data.error.includes('replay attack'));
  });

  await test('POST /api/webhooks with tampered signature is rejected with 403', async () => {
    const res = await doRequest('/api/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': 'invalid_signature_hex_0000000000000000000000000000000000000000000000000000000000000000',
        'X-Webhook-Timestamp': validTimestamp
      },
      body: webhookBody
    });
    assert.strictEqual(res.statusCode, 403);
  });

  // ========================================================================
  // [15] SSRF DEFENSE & URL WHITELISTING
  // ========================================================================
  console.log('\n[15] SSRF Defense & URL Whitelisting:');

  await test('POST /api/validate-url allows public HTTPS domains', async () => {
    const res = await doRequest('/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { url: 'https://abhinashmaddheshiya.dev' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.safe, true);
  });

  await test('POST /api/validate-url blocks loopback address (127.0.0.1) with 400', async () => {
    const res = await doRequest('/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { url: 'http://127.0.0.1:8080/internal' }
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.safe, false);
  });

  await test('POST /api/validate-url blocks cloud metadata address (169.254.169.254) with 400', async () => {
    const res = await doRequest('/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { url: 'http://169.254.169.254/latest/meta-data/' }
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.safe, false);
  });

  await test('POST /api/validate-url blocks RFC 1918 private IP address with 400', async () => {
    const res = await doRequest('/api/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { url: 'http://192.168.1.1/admin' }
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.safe, false);
  });

  // ========================================================================
  // [16] SOURCE MAP PROTECTION
  // ========================================================================
  console.log('\n[16] Source Map Shielding:');

  await test('GET /bundle.js.map is blocked by static jail with 403 Forbidden', async () => {
    const res = await doRequest('/bundle.js.map', { method: 'GET' });
    assert.strictEqual(res.statusCode, 403);
    assert(res.data.includes('Access Denied'));
  });

  console.log(`\n=======================================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`=======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
