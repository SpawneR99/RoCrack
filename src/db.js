const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'rocrack.sqlite');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS scripts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT    NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    niche           TEXT    NOT NULL,
    icon_path       TEXT    NOT NULL DEFAULT '/logo.png',
    tagline         TEXT    DEFAULT '',
    description     TEXT    DEFAULT '',
    meta_title      TEXT    DEFAULT '',
    meta_description TEXT   DEFAULT '',
    meta_keywords   TEXT    DEFAULT '',
    video_url       TEXT    DEFAULT '',
    required_leads  INTEGER NOT NULL DEFAULT 2,
    max_offers      INTEGER NOT NULL DEFAULT 4,
    min_offers      INTEGER NOT NULL DEFAULT 2,
    hubs_json       TEXT    NOT NULL DEFAULT '[]',
    is_legacy       INTEGER NOT NULL DEFAULT 0,
    active          INTEGER NOT NULL DEFAULT 1,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_scripts_active ON scripts(active);
  CREATE INDEX IF NOT EXISTS idx_scripts_sort   ON scripts(sort_order);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_audit (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    action     TEXT    NOT NULL,
    details    TEXT    DEFAULT '',
    ip         TEXT    DEFAULT '',
    user_agent TEXT    DEFAULT '',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`);

const stmts = {
  getSetting:    db.prepare('SELECT value FROM settings WHERE key = ?'),
  setSetting:    db.prepare(`INSERT INTO settings(key,value) VALUES(?,?)
                             ON CONFLICT(key) DO UPDATE SET value=excluded.value`),
  allScripts:    db.prepare('SELECT * FROM scripts ORDER BY sort_order ASC, name ASC'),
  activeScripts: db.prepare('SELECT * FROM scripts WHERE active = 1 ORDER BY sort_order ASC, name ASC'),
  scriptBySlug:  db.prepare('SELECT * FROM scripts WHERE slug = ?'),
  scriptById:    db.prepare('SELECT * FROM scripts WHERE id = ?'),
  insertScript:  db.prepare(`
    INSERT INTO scripts
      (slug, name, niche, icon_path, tagline, description,
       meta_title, meta_description, meta_keywords, video_url,
       required_leads, max_offers, min_offers, hubs_json,
       is_legacy, active, sort_order, updated_at)
    VALUES
      (@slug, @name, @niche, @icon_path, @tagline, @description,
       @meta_title, @meta_description, @meta_keywords, @video_url,
       @required_leads, @max_offers, @min_offers, @hubs_json,
       @is_legacy, @active, @sort_order, strftime('%s','now'))
  `),
  updateScript:  db.prepare(`
    UPDATE scripts SET
      slug=@slug, name=@name, niche=@niche, icon_path=@icon_path,
      tagline=@tagline, description=@description,
      meta_title=@meta_title, meta_description=@meta_description, meta_keywords=@meta_keywords,
      video_url=@video_url,
      required_leads=@required_leads, max_offers=@max_offers, min_offers=@min_offers,
      hubs_json=@hubs_json, active=@active, sort_order=@sort_order,
      updated_at=strftime('%s','now')
    WHERE id=@id
  `),
  deleteScript:  db.prepare('DELETE FROM scripts WHERE id = ?'),
  audit:         db.prepare(`INSERT INTO admin_audit (action, details, ip, user_agent)
                             VALUES (?, ?, ?, ?)`),
};

function getSetting(key, fallback = null) {
  const row = stmts.getSetting.get(key);
  return row ? row.value : fallback;
}
function setSetting(key, value) {
  stmts.setSetting.run(key, String(value));
}

function listScripts({ onlyActive = false } = {}) {
  const rows = (onlyActive ? stmts.activeScripts : stmts.allScripts).all();
  return rows.map(hydrate);
}
function getScriptBySlug(slug) {
  const row = stmts.scriptBySlug.get(slug);
  return row ? hydrate(row) : null;
}
function getScriptById(id) {
  const row = stmts.scriptById.get(id);
  return row ? hydrate(row) : null;
}
function createScript(data) {
  const payload = normalizeScript(data);
  const info = stmts.insertScript.run(payload);
  return getScriptById(info.lastInsertRowid);
}
function updateScript(id, data) {
  const existing = getScriptById(id);
  if (!existing) return null;
  const payload = normalizeScript({ ...existing, ...data, id });
  stmts.updateScript.run(payload);
  return getScriptById(id);
}
function deleteScript(id) {
  stmts.deleteScript.run(id);
}
function audit(action, details, ip, userAgent) {
  try {
    stmts.audit.run(
      String(action).slice(0, 120),
      String(details ?? '').slice(0, 2000),
      String(ip ?? '').slice(0, 80),
      String(userAgent ?? '').slice(0, 400)
    );
  } catch (_) { /* never let audit break a request */ }
}

function hydrate(row) {
  let hubs = [];
  try { hubs = JSON.parse(row.hubs_json || '[]'); } catch (_) { hubs = []; }
  return {
    ...row,
    hubs,
    active:    !!row.active,
    is_legacy: !!row.is_legacy,
  };
}

function normalizeScript(src) {
  const n = (v, d) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : d;
  };
  const hubs = Array.isArray(src.hubs) ? src.hubs :
               (typeof src.hubs_json === 'string' ? safeJson(src.hubs_json, []) : []);
  return {
    id:               src.id ?? null,
    slug:             String(src.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    name:             String(src.name || '').trim().slice(0, 200),
    niche:            String(src.niche || '').trim().slice(0, 120) || 'RoCrack',
    icon_path:        String(src.icon_path || '/logo.png').trim().slice(0, 500),
    tagline:          String(src.tagline || '').slice(0, 500),
    description:      String(src.description || '').slice(0, 200000),
    meta_title:       String(src.meta_title || '').slice(0, 300),
    meta_description: String(src.meta_description || '').slice(0, 500),
    meta_keywords:    String(src.meta_keywords || '').slice(0, 500),
    video_url:        String(src.video_url || '').slice(0, 500),
    required_leads:   n(src.required_leads, 2),
    max_offers:       n(src.max_offers, 4),
    min_offers:       n(src.min_offers, 2),
    hubs_json:        JSON.stringify(sanitizeHubs(hubs)),
    is_legacy:        src.is_legacy ? 1 : 0,
    active:           src.active === false || src.active === 0 || src.active === '0' ? 0 : 1,
    sort_order:       n(src.sort_order, 0),
  };
}

function safeJson(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }
function sanitizeHubs(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(h => ({
      name:      String(h?.name || '').trim().slice(0, 120),
      downloads: String(h?.downloads || '').trim().slice(0, 40),
    }))
    .filter(h => h.name.length > 0)
    .slice(0, 50);
}

module.exports = {
  db,
  getSetting,
  setSetting,
  listScripts,
  getScriptBySlug,
  getScriptById,
  createScript,
  updateScript,
  deleteScript,
  audit,
};
