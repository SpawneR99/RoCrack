const express = require('express');
const path    = require('path');
const fs      = require('fs');

const db = require('./db');

const ROOT = path.join(__dirname, '..');

module.exports = function buildPublicRouter() {
  const router = express.Router();

  // Dynamic scripts listing — replaces the static /scripts/index.html
  router.get('/scripts', (req, res) => {
    const scripts = db.listScripts({ onlyActive: true });
    res.render('public/scripts-index', {
      title: 'Free Roblox Scripts Library — RoCrack',
      scripts,
    });
  });
  router.get('/scripts/', (_req, res) => res.redirect(301, '/scripts'));

  // Dynamic script page for DB-only (non-legacy) scripts
  router.get('/scripts/:slug', (req, res, next) => {
    const s = db.getScriptBySlug(req.params.slug);
    if (!s || !s.active) return next();

    // Legacy scripts have real static files under /scripts/<slug>/ — let static serve
    if (s.is_legacy) {
      const legacyIndex = path.join(ROOT, 'scripts', s.slug, 'index.html');
      if (fs.existsSync(legacyIndex)) return res.sendFile(legacyIndex);
    }
    renderScriptPage(res, s);
  });
  router.get('/scripts/:slug/', (req, res, next) => {
    const s = db.getScriptBySlug(req.params.slug);
    if (!s || !s.active) return next();
    if (s.is_legacy) {
      const legacyIndex = path.join(ROOT, 'scripts', s.slug, 'index.html');
      if (fs.existsSync(legacyIndex)) return res.sendFile(legacyIndex);
    }
    renderScriptPage(res, s);
  });

  // Dynamic locker for non-legacy scripts
  router.get('/scripts/:slug/locker', (req, res, next) => {
    const s = db.getScriptBySlug(req.params.slug);
    if (!s || !s.active) return next();
    if (s.is_legacy) {
      const legacyLocker = path.join(ROOT, 'scripts', s.slug, 'locker.html');
      if (fs.existsSync(legacyLocker)) return res.sendFile(legacyLocker);
    }
    renderLockerPage(res, s);
  });

  return router;
};

function renderScriptPage(res, s) {
  res.render('public/script-page', {
    title: s.meta_title || `${s.name} Script — RoCrack`,
    s,
  });
}

function renderLockerPage(res, s) {
  res.render('public/locker-page', {
    title: `Unlock ${s.name} — RoCrack`,
    s,
  });
}
