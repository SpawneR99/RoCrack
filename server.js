require('dotenv').config();

const path          = require('path');
const fs            = require('fs');
const express       = require('express');
const helmet        = require('helmet');
const cookieParser  = require('cookie-parser');
const rateLimit     = require('express-rate-limit');
const { doubleCsrf } = require('csrf-csrf');

const db          = require('./src/db');
const auth        = require('./src/auth');
const { fetchOffers, buildOgadsButtonUrl } = require('./src/providers');
const { seedIfEmpty } = require('./src/seed');
const buildAdminRouter  = require('./src/routes_admin');
const buildPublicRouter = require('./src/routes_public');

// ---------------------------------------------------------------------------
// Required secrets check — we refuse to start without them in production
// ---------------------------------------------------------------------------
const SECRETS_32  = ['JWT_SECRET', 'CSRF_SECRET', 'COOKIE_SECRET'];
const REQUIRED_ANY = ['ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH'];
const weakSecrets  = SECRETS_32.filter(k => !process.env[k] || process.env[k].length < 32);
const missingAny   = REQUIRED_ANY.filter(k => !process.env[k]);
const problems     = [...weakSecrets.map(k => `${k} (need ≥32 chars)`), ...missingAny.map(k => `${k} (missing)`)];
if (problems.length) {
  const msg = `[boot] env problems: ${problems.join('; ')}`;
  if (process.env.NODE_ENV === 'production') {
    console.error(msg + ' — refusing to start in production.');
    process.exit(1);
  } else {
    console.warn(msg + ' — continuing in DEVELOPMENT ONLY.');
  }
}

// ---------------------------------------------------------------------------
const ROOT        = __dirname;
const PORT        = parseInt(process.env.PORT || '3000', 10);
const HOST        = '0.0.0.0';
const ADMIN_PATH  = '/admin';
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(ROOT, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Seed legacy scripts into DB on first boot
try { seedIfEmpty(); } catch (e) { console.error('[seed]', e); }

const app = express();

if (String(process.env.TRUST_PROXY || '').toLowerCase() === 'true') {
  app.set('trust proxy', 1);
}

app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// Security headers (Helmet)
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src":   ["'self'"],
      "script-src":    ["'self'", "'unsafe-inline'", "https://ajax.googleapis.com", "https://analytics.rocrack.com", "https://cloud.umami.is"],
      // Allow inline event handlers (onclick="...", onload="...") used by legacy script pages.
      // Without this, Helmet's default "script-src-attr 'none'" silently breaks every onclick.
      "script-src-attr": ["'unsafe-inline'"],
      "style-src":     ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src":      ["'self'", "https://fonts.gstatic.com", "data:"],
      "img-src":       ["'self'", "data:", "blob:", "https:"],
      "connect-src":   ["'self'", "https:"],
      "frame-src":     ["'self'", "https:"],
      "object-src":    ["'none'"],
      "base-uri":      ["'self'"],
      "form-action":   ["'self'"],
      "frame-ancestors": ["'self'"],
      "upgrade-insecure-requests": [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Global rate limit (generous; login has its own stricter limiter)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(cookieParser(process.env.COOKIE_SECRET || 'insecure-dev-cookie-secret-change-me-now-please-0000'));

// CSRF (double-submit cookie pattern)
const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'insecure-dev-csrf-secret-change-me-now-please-0000000000',
  cookieName: process.env.NODE_ENV === 'production' ? '__Host-rc.csrf' : 'rc.csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/',
  },
  size: 64,
  getTokenFromRequest: (req) =>
    (req.body && req.body._csrf) ||
    req.headers['x-csrf-token'] ||
    req.headers['csrf-token'],
});

// JSON for /api/*
app.use('/api', express.json({ limit: '32kb' }));

// ---------------------------------------------------------------------------
// Admin routes (mounted first so they take precedence)
// ---------------------------------------------------------------------------
app.use(ADMIN_PATH, buildAdminRouter({
  csrfProtection: doubleCsrfProtection,
  csrfToken: generateToken,
}));

// ---------------------------------------------------------------------------
// Public dynamic routes
// ---------------------------------------------------------------------------
app.use(buildPublicRouter());

// ---------------------------------------------------------------------------
// /api/offers — unified endpoint, respects provider setting
// ---------------------------------------------------------------------------
app.get('/api/offers', async (req, res) => {
  try {
    const niche = String(req.query.niche || '').slice(0, 120) || 'RoCrack';

    // Admin is ALWAYS the source of truth. Order of precedence:
    //   1. Per-script config from DB (if this niche matches a DB script)
    //   2. Global defaults from Settings (DB `default_*_offers`)
    // Client-provided ?max / ?min query params are intentionally ignored so
    // legacy pages that hardcode e.g. `max=6` cannot override the admin.
    const script = db.listScripts().find(s => s.niche === niche);
    const defMax = parseInt(db.getSetting('default_max_offers', '4'), 10) || 4;
    const defMin = parseInt(db.getSetting('default_min_offers', '2'), 10) || 2;

    let maxOffers = script ? script.max_offers : defMax;
    let minOffers = script ? script.min_offers : defMin;
    maxOffers = Math.max(1, Math.min(20, maxOffers));
    minOffers = Math.max(1, Math.min(maxOffers, minOffers));

    const provider = db.getSetting('provider', 'adbluemedia');
    const requiredLeads = script
      ? script.required_leads
      : (parseInt(db.getSetting('default_required_leads', '2'), 10) || 2);

    // OGAds mode: we don't pull a list of offers — we send the user to a
    // single OGAds landing page with aff_sub4=<niche>. The client renders a
    // big "Click Here" CTA. One click counts as the unlock action.
    if (provider === 'ogads') {
      res.set('Cache-Control', 'no-store');
      return res.json({
        success: true,
        provider: 'ogads',
        mode: 'button',
        niche,
        requiredLeads: 1,
        buttonUrl: buildOgadsButtonUrl(niche),
        offers: [],
      });
    }

    // AdBlueMedia mode: classic offer list.
    const ip        = getIp(req);
    const userAgent = String(req.headers['user-agent'] || '');
    const offers = await fetchOffers({ provider, niche, ip, userAgent, maxOffers, minOffers });

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      provider,
      mode: 'list',
      niche,
      requiredLeads,
      offers,
    });
  } catch (err) {
    console.error('[/api/offers]', err.message);
    res.status(502).json({ success: false, error: err.message, offers: [] });
  }
});

// ---------------------------------------------------------------------------
// Decorative existing endpoints (kept for compatibility)
// ---------------------------------------------------------------------------
app.get('/api/user/:id', (req, res) => {
  const userId = String(req.params.id || '').replace(/[^0-9]/g, '').slice(0, 16);
  setTimeout(() => {
    res.json({
      success: true,
      user: {
        id: userId,
        found: true,
        username: `Player_${userId}`,
        avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150`,
      },
    });
  }, 300);
});

app.get('/api/stats', (_req, res) => {
  res.json({
    onlineUsers: Math.floor(Math.random() * 100) + 800,
    totalDownloads: '12.4M',
    lastUpdate: new Date().toISOString(),
  });
});

app.get('/api/generate-key', (_req, res) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'KEY_';
  for (let i = 0; i < 16; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
  res.json({ success: true, key, expiresIn: 300 });
});

// ---------------------------------------------------------------------------
// Static assets (root website + uploaded icons) — mounted LAST so dynamic
// routes take precedence.
// ---------------------------------------------------------------------------
app.use('/uploads', express.static(UPLOADS_DIR, {
  fallthrough: false,
  maxAge: '30d',
  index: false,
  dotfiles: 'deny',
}));

// Serve static root files (index.html, privacy.html, terms.html, logo.png,
// existing legacy script folders, etc.) but NEVER the .env / data / src dirs.
app.use(express.static(ROOT, {
  index: 'index.html',
  dotfiles: 'deny',
  setHeaders: (res, filePath) => {
    if (/\.(html?)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=300');
  },
}));

// Explicit root (in case express.static index is disabled by something)
app.get('/', (_req, res) => res.sendFile(path.join(ROOT, 'index.html')));

// ---------------------------------------------------------------------------
// 404 + error handlers
// ---------------------------------------------------------------------------
app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).sendFile(path.join(ROOT, 'index.html'));
  res.status(404).json({ error: 'not_found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[error]', err);
  if (err && err.code === 'EBADCSRFTOKEN' || err && err.code === 'ERR_BAD_CSRF_TOKEN' ||
      err && err.message && err.message.toLowerCase().includes('csrf')) {
    return res.status(403).json({ error: 'invalid_csrf_token' });
  }
  if (err && err.message === 'Unsupported image type')        return res.status(415).json({ error: err.message });
  if (err && err.code === 'LIMIT_FILE_SIZE')                  return res.status(413).json({ error: 'file_too_large' });
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, HOST, () => {
  console.log(`\n🎮 RoCrack server ready`);
  console.log(`   Listening   : http://${HOST}:${PORT}`);
  console.log(`   Admin panel : ${ADMIN_PATH}`);
  console.log(`   Provider    : ${db.getSetting('provider', 'adbluemedia')}`);
  console.log(`   DB file     : ${path.join(process.env.DATA_DIR || path.join(ROOT, 'data'), 'rocrack.sqlite')}`);
  console.log(`   Uploads dir : ${UPLOADS_DIR}\n`);
});

// ---------------------------------------------------------------------------
function getIp(req) {
  return (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim()
      || req.headers['x-real-ip']
      || req.ip
      || '';
}

