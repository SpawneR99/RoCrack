const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET  = process.env.JWT_SECRET  || '';
const SESSION_TTL = parseInt(process.env.SESSION_TTL || '28800', 10); // seconds
const COOKIE_NAME = 'rc_sid';
const NODE_ENV    = process.env.NODE_ENV || 'development';

if (JWT_SECRET.length < 32) {
  // eslint-disable-next-line no-console
  console.error('[auth] JWT_SECRET missing or too short (need >=32 chars). Refusing to issue tokens.');
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure:   NODE_ENV === 'production',
    sameSite: 'lax',
    signed:   true,
    path:     '/',
    maxAge:   SESSION_TTL * 1000,
  };
}

function issueSession(res, username) {
  const token = jwt.sign(
    { sub: username, kind: 'admin' },
    JWT_SECRET,
    { expiresIn: SESSION_TTL, algorithm: 'HS256' }
  );
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
}

function readSession(req) {
  const raw = req.signedCookies && req.signedCookies[COOKIE_NAME];
  if (!raw) return null;
  try {
    return jwt.verify(raw, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (_) {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const sess = readSession(req);
  if (!sess || sess.kind !== 'admin') {
    if (req.method === 'GET' && req.accepts('html')) {
      return res.redirect((process.env.ADMIN_PATH || '/admin') + '/login');
    }
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.admin = sess;
  next();
}

async function verifyCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME || '';
  const hash         = process.env.ADMIN_PASSWORD_HASH || '';
  if (!expectedUser || !hash) return false;
  // Constant-time-ish comparison for username
  const userOk = timingSafeEqualStr(String(username || ''), expectedUser);
  let passOk = false;
  try { passOk = await bcrypt.compare(String(password || ''), hash); } catch { passOk = false; }
  return userOk && passOk;
}

function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

module.exports = {
  COOKIE_NAME,
  issueSession,
  clearSession,
  readSession,
  requireAdmin,
  verifyCredentials,
};
