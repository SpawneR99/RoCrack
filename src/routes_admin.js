const express = require('express');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const multer  = require('multer');
const rateLimit = require('express-rate-limit');

const db   = require('./db');
const auth = require('./auth');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.png').toLowerCase().replace(/[^a-z0-9.]/g, '');
      const id  = crypto.randomBytes(12).toString('hex');
      cb(null, `${Date.now()}_${id}${ext}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) return cb(new Error('Unsupported image type'));
    cb(null, true);
  },
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
});

module.exports = function buildAdminRouter({ csrfProtection, csrfToken }) {
  const router = express.Router();
  const ADMIN_PATH = '/admin';

  router.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Parse urlencoded bodies for ALL admin routes BEFORE csrfProtection runs,
  // so the double-submit middleware can read `_csrf` from req.body.
  // For multipart forms (icon upload), multer runs first and populates req.body as well.
  const urlenc = express.urlencoded({ extended: false, limit: '200kb' });

  router.get('/login', csrfProtection, (req, res) => {
    if (auth.readSession(req)) return res.redirect(ADMIN_PATH);
    res.render('admin/login', {
      title: 'Admin Login',
      error: null,
      csrfToken: csrfToken(req, res),
      adminPath: ADMIN_PATH,
    });
  });

  router.post('/login', loginLimiter, urlenc, csrfProtection, async (req, res) => {
    const { username, password } = req.body || {};
    const ok = await auth.verifyCredentials(username, password);
    const ip = getIp(req);
    if (!ok) {
      db.audit('login_failed', JSON.stringify({ username: String(username || '').slice(0, 80) }), ip, req.headers['user-agent']);
      return res.status(401).render('admin/login', {
        title: 'Admin Login',
        error: 'Invalid username or password.',
        csrfToken: csrfToken(req, res),
        adminPath: ADMIN_PATH,
      });
    }
    auth.issueSession(res, username);
    db.audit('login_success', '', ip, req.headers['user-agent']);
    res.redirect(ADMIN_PATH);
  });

  router.post('/logout', auth.requireAdmin, urlenc, csrfProtection, (req, res) => {
    auth.clearSession(res);
    db.audit('logout', '', getIp(req), req.headers['user-agent']);
    res.redirect(ADMIN_PATH + '/login');
  });

  router.get('/', auth.requireAdmin, csrfProtection, (req, res) => {
    const scripts = db.listScripts();
    const provider = db.getSetting('provider', 'adbluemedia');
    res.render('admin/dashboard', {
      title: 'Dashboard',
      scripts,
      provider,
      csrfToken: csrfToken(req, res),
      flash: readFlash(req, res),
      adminPath: ADMIN_PATH,
    });
  });

  router.get('/settings', auth.requireAdmin, csrfProtection, (req, res) => {
    const provider       = db.getSetting('provider', 'adbluemedia');
    const defaultMax     = db.getSetting('default_max_offers', '4');
    const defaultMin     = db.getSetting('default_min_offers', '2');
    const defaultLeads   = db.getSetting('default_required_leads', '2');
    res.render('admin/settings', {
      title: 'Settings',
      provider, defaultMax, defaultMin, defaultLeads,
      csrfToken: csrfToken(req, res),
      flash: readFlash(req, res),
      adminPath: ADMIN_PATH,
    });
  });

  router.post('/settings', auth.requireAdmin, urlenc, csrfProtection, (req, res) => {
    const provider   = req.body.provider === 'ogads' ? 'ogads' : 'adbluemedia';
    const defaultMax = clampInt(req.body.default_max_offers,    1, 20, 4);
    const defaultMin = clampInt(req.body.default_min_offers,    1, 20, 2);
    const defaultLeads = clampInt(req.body.default_required_leads, 1, 50, 2);

    db.setSetting('provider', provider);
    db.setSetting('default_max_offers', defaultMax);
    db.setSetting('default_min_offers', defaultMin);
    db.setSetting('default_required_leads', defaultLeads);

    db.audit('settings_update', JSON.stringify({ provider, defaultMax, defaultMin, defaultLeads }),
             getIp(req), req.headers['user-agent']);
    writeFlash(res, 'Settings saved.');
    res.redirect(ADMIN_PATH + '/settings');
  });

  router.get('/scripts/new', auth.requireAdmin, csrfProtection, (req, res) => {
    res.render('admin/script-form', {
      title: 'New Script',
      mode: 'new',
      script: emptyScript(),
      csrfToken: csrfToken(req, res),
      errors: null,
      flash: readFlash(req, res),
      adminPath: ADMIN_PATH,
    });
  });

  router.post('/scripts/new', auth.requireAdmin, upload.single('icon'), csrfProtection, (req, res) => {
    // multer populates req.body for multipart forms, so csrfProtection can read _csrf
    const data = readScriptForm(req);
    const errors = validateScript(data);
    if (errors) {
      return res.status(400).render('admin/script-form', {
        title: 'New Script', mode: 'new',
        script: data, errors,
        csrfToken: csrfToken(req, res),
        flash: null, adminPath: ADMIN_PATH,
      });
    }
    if (db.getScriptBySlug(data.slug)) {
      return res.status(400).render('admin/script-form', {
        title: 'New Script', mode: 'new',
        script: data, errors: { slug: 'This slug already exists.' },
        csrfToken: csrfToken(req, res),
        flash: null, adminPath: ADMIN_PATH,
      });
    }
    if (req.file) data.icon_path = `/uploads/${req.file.filename}`;
    const created = db.createScript(data);
    db.audit('script_create', JSON.stringify({ id: created.id, slug: created.slug }),
             getIp(req), req.headers['user-agent']);
    writeFlash(res, `Script "${created.name}" created.`);
    res.redirect(ADMIN_PATH);
  });

  router.get('/scripts/:id/edit', auth.requireAdmin, csrfProtection, (req, res) => {
    const s = db.getScriptById(parseInt(req.params.id, 10));
    if (!s) return res.redirect(ADMIN_PATH);
    res.render('admin/script-form', {
      title: `Edit ${s.name}`,
      mode: 'edit',
      script: s,
      csrfToken: csrfToken(req, res),
      errors: null,
      flash: readFlash(req, res),
      adminPath: ADMIN_PATH,
    });
  });

  router.post('/scripts/:id/edit', auth.requireAdmin, upload.single('icon'), csrfProtection, (req, res) => {
    // multer handles multipart, populating req.body for csrfProtection
    const id = parseInt(req.params.id, 10);
    const existing = db.getScriptById(id);
    if (!existing) return res.redirect(ADMIN_PATH);

    const data = readScriptForm(req);
    data.id = id;
    data.is_legacy = existing.is_legacy; // legacy flag is immutable
    if (existing.is_legacy) {
      // For legacy scripts, only config fields are editable; keep original slug/name/icon
      data.slug      = existing.slug;
      data.name      = existing.name;
      data.icon_path = existing.icon_path;
    }

    const errors = validateScript(data);
    if (errors) {
      return res.status(400).render('admin/script-form', {
        title: `Edit ${existing.name}`, mode: 'edit',
        script: { ...existing, ...data }, errors,
        csrfToken: csrfToken(req, res), flash: null, adminPath: ADMIN_PATH,
      });
    }

    if (!existing.is_legacy && data.slug !== existing.slug && db.getScriptBySlug(data.slug)) {
      return res.status(400).render('admin/script-form', {
        title: `Edit ${existing.name}`, mode: 'edit',
        script: { ...existing, ...data }, errors: { slug: 'This slug is already used.' },
        csrfToken: csrfToken(req, res), flash: null, adminPath: ADMIN_PATH,
      });
    }

    if (req.file && !existing.is_legacy) data.icon_path = `/uploads/${req.file.filename}`;
    const updated = db.updateScript(id, data);
    db.audit('script_update', JSON.stringify({ id, slug: updated.slug }),
             getIp(req), req.headers['user-agent']);
    writeFlash(res, `Script "${updated.name}" saved.`);
    res.redirect(ADMIN_PATH);
  });

  router.post('/scripts/:id/delete', auth.requireAdmin, urlenc, csrfProtection, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const s = db.getScriptById(id);
    if (!s) return res.redirect(ADMIN_PATH);
    if (s.is_legacy) {
      writeFlash(res, `Cannot delete legacy script "${s.name}" — deactivate it instead.`);
      return res.redirect(ADMIN_PATH);
    }
    db.deleteScript(id);
    db.audit('script_delete', JSON.stringify({ id, slug: s.slug }),
             getIp(req), req.headers['user-agent']);
    writeFlash(res, `Script "${s.name}" deleted.`);
    res.redirect(ADMIN_PATH);
  });

  return router;
};

// -----------------------------------------------------------------------------

function emptyScript() {
  return {
    id: null, slug: '', name: '', niche: '', icon_path: '',
    tagline: '', description: '',
    meta_title: '', meta_description: '', meta_keywords: '',
    video_url: '',
    required_leads: 2, max_offers: 4, min_offers: 2,
    hubs: [{ name: '', downloads: '' }],
    is_legacy: false, active: true, sort_order: 0,
  };
}

function readScriptForm(req) {
  const b = req.body || {};
  const hubs = parseHubsFromForm(b);
  return {
    slug:             String(b.slug || ''),
    name:             String(b.name || ''),
    niche:            String(b.niche || ''),
    icon_path:        String(b.icon_path || ''),
    tagline:          String(b.tagline || ''),
    description:      String(b.description || ''),
    meta_title:       String(b.meta_title || ''),
    meta_description: String(b.meta_description || ''),
    meta_keywords:    String(b.meta_keywords || ''),
    video_url:        String(b.video_url || ''),
    required_leads:   parseInt(b.required_leads, 10),
    max_offers:       parseInt(b.max_offers, 10),
    min_offers:       parseInt(b.min_offers, 10),
    hubs,
    active:           b.active === 'on' || b.active === '1' || b.active === true,
    sort_order:       parseInt(b.sort_order, 10) || 0,
  };
}

function parseHubsFromForm(b) {
  const names = [].concat(b['hub_name'] || []);
  const dls   = [].concat(b['hub_downloads'] || []);
  const out = [];
  for (let i = 0; i < names.length; i++) {
    const n = String(names[i] || '').trim();
    const d = String((dls[i] ?? '')).trim();
    if (n) out.push({ name: n, downloads: d });
  }
  return out;
}

function validateScript(d) {
  const e = {};
  if (!d.name || d.name.length < 2)        e.name = 'Name is required.';
  if (!d.slug || !/^[a-z0-9][a-z0-9-]*$/.test(d.slug)) e.slug = 'Slug must be lowercase letters, digits and dashes.';
  if (!d.niche || d.niche.length < 2)      e.niche = 'Niche/sub-ID is required.';
  if (!(d.required_leads >= 1))            e.required_leads = 'Required leads must be >= 1.';
  if (!(d.max_offers >= 1))                e.max_offers = 'Max offers must be >= 1.';
  if (!(d.min_offers >= 1))                e.min_offers = 'Min offers must be >= 1.';
  if (d.max_offers < d.min_offers)         e.max_offers = 'Max offers must be >= min offers.';
  return Object.keys(e).length ? e : null;
}

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function writeFlash(res, msg) {
  res.cookie('rc_flash', encodeURIComponent(msg), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10_000,
    path: '/',
    signed: true,
  });
}
function readFlash(req, res) {
  const v = req.signedCookies && req.signedCookies['rc_flash'];
  if (!v) return null;
  res.clearCookie('rc_flash', { path: '/' });
  try { return decodeURIComponent(v); } catch { return null; }
}

function getIp(req) {
  return (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim()
      || req.headers['x-real-ip']
      || req.ip
      || '';
}
