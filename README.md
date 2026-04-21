# RoCrack

Roblox script aggregator with a secured admin CMS, two-provider offer wall
(AdBlueMedia **or** OGAds — togglable at runtime), SQLite persistence, and
full Coolify-ready Docker image.

- **Admin panel** — add / edit / hide / delete scripts, manage hubs (versions),
  upload icons, configure per-script required leads and offer counts.
- **General Settings** — flip the offer provider between AdBlueMedia and OGAds
  with a radio button; the change takes effect site-wide on the next offer load.
- **All secrets in `.env`** — API keys, JWT/CSRF/cookie secrets and admin credentials
  never touch the database.
- **Security hardening** — Helmet CSP, double-submit CSRF, rate-limited login,
  bcrypt password hash, HTTP-only signed session cookie, audit log.

---

## Quick start (local, Windows / macOS / Linux)

```bash
# 1. Install deps
npm install

# 2. Create your .env
cp .env.example .env        # or: copy .env.example .env   on Windows

# 3. Generate a bcrypt hash for your admin password and paste into ADMIN_PASSWORD_HASH
npm run hash -- "YourStrongPasswordHere"

# 4. Generate the three secrets (64 hex chars each) for JWT / CSRF / COOKIE
node -e "for(let i=0;i<3;i++)console.log(require('crypto').randomBytes(48).toString('hex'))"

# 5. Run
npm start
```

Then visit:

- `http://localhost:3000/` — public site
- `http://localhost:3000/scripts` — dynamic script listing
- `http://localhost:3000/admin` — admin panel (configurable via `ADMIN_PATH`)

The first boot auto-seeds the 14 existing scripts (blox, garden, deadrails, …)
into the DB as **Legacy** entries. Their static HTML pages under `scripts/<slug>/`
are preserved; only the niche / offer-count / required-leads config is editable
from the admin.

---

## Environment variables

See `.env.example` — copy it to `.env` and fill in. Summary of the important ones:

| Variable | Purpose |
|---|---|
| `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` | Admin login. Hash is bcrypt (`npm run hash`). |
| `ADMIN_PATH` | URL of the admin panel. Defaults `/admin`. Use something non-obvious for extra security. |
| `JWT_SECRET`, `CSRF_SECRET`, `COOKIE_SECRET` | Three independent random 64-char secrets. |
| `SESSION_TTL` | Session lifetime in seconds (default `28800` = 8h). |
| `DEFAULT_PROVIDER` | `adbluemedia` or `ogads`. Initial value — can be flipped in admin UI. |
| `ADBLUE_USER_ID`, `ADBLUE_API_KEY` | AdBlueMedia credentials (niche → `s1`). |
| `OGADS_API_KEY`, `OGADS_ENDPOINT` | OGAds credentials (niche → `aff_sub4`, Bearer auth). |
| `DEFAULT_MAX_OFFERS`, `DEFAULT_MIN_OFFERS`, `DEFAULT_REQUIRED_LEADS` | Fallbacks when a niche doesn't match a DB script. |
| `DATA_DIR`, `UPLOADS_DIR` | Paths to the persisted volumes. Defaults to `./data` and `./uploads`. |
| `TRUST_PROXY` | Set to `true` behind Cloudflare / Coolify proxy so real client IPs are read from `X-Forwarded-For`. |

---

## Deploying on Coolify

1. **Create** a new Application in Coolify pointing at this repo (or push its Docker image).
2. **Dockerfile** — already included, Coolify will auto-detect it.
3. **Port** — container listens on `3000`.
4. **Persistent volumes** (critical — otherwise the DB and uploaded icons are lost on restart):
   - `/app/data`     → persistent volume (SQLite file lives here)
   - `/app/uploads`  → persistent volume (script icons live here)
5. **Environment variables** — paste every variable from `.env.example`. Fill in:
   - your bcrypt hash (generate locally with `npm run hash -- "password"`)
   - three distinct 64-char random secrets
   - the AdBlue and OGAds credentials
   - `NODE_ENV=production`, `TRUST_PROXY=true`
6. **Domain + HTTPS** — use Coolify's automatic TLS. Once HTTPS is live, session
   cookies automatically become `Secure` (because `NODE_ENV=production`).

That's it. After first boot the database seeds the 14 existing scripts
automatically. Log in at `https://yoursite/admin` to start adding new scripts.

### Database choice: SQLite vs Postgres

This project ships with **SQLite** (via `better-sqlite3`) for maximum simplicity —
a single file on a volume, zero moving parts, zero additional Coolify services,
nightly backups are trivial (`cp data/rocrack.sqlite`). For this workload (a few
dozen scripts and a few thousand visits/day), SQLite is more than enough and is
actually *faster* than Postgres over the network because it's in-process.

If you later grow to the point where you need Postgres, the `src/db.js` module
is isolated — swapping it for a Postgres client is a contained change. But
there's no reason to do that now.

---

## Adding a new script through the admin

1. Log in to `/admin`.
2. Click **+ New Script**.
3. Fill in:
   - **Display Name** (e.g. *Arsenal*)
   - **Slug** — auto-derived from name, but editable. Will become `/scripts/arsenal`.
   - **Niche / Sub-ID** — e.g. `CrackArsenal`. Passed to the offer API as `s1` (AdBlueMedia) or `aff_sub4` (OGAds).
   - **Icon Image** — PNG/JPG/WEBP/SVG up to 3 MB. Stored in `/app/uploads`.
   - **Tagline** — one-line subtitle shown under the name.
   - **Required Leads** — how many offers must be completed to unlock.
   - **Max Offers Shown / Min Offers** — these **always** win over whatever the
     client page requests. You can freely lower or raise them without changing
     any HTML.
   - **Hubs / Versions** — repeating rows for the "Available Hubs" section.
   - **Description** — long HTML body shown on the script page.
4. Click **Create Script**. A new public page is instantly available at
   `/scripts/<slug>` plus an unlock page at `/scripts/<slug>/locker`.

### Why are legacy scripts different?

The 14 existing scripts (`blox`, `garden`, …) have thousands of words of
carefully-crafted SEO content in their static HTML files. The seeder registers
them in the DB so that you can still change their **niche / required leads /
max offers / active state** from the admin, but leaves their static HTML files
untouched to preserve SEO. Only brand-new scripts added through the admin are
rendered fully dynamically from templates.

---

## Switching offer provider

**Settings → Offer Delivery Provider → AdBlueMedia / OGAds → Save**.

The change is live immediately. The existing 14 legacy locker pages use a
common `/api/offers` endpoint, so they benefit from the toggle too — no code or
HTML changes needed.

---

## Security notes

- Admin credentials are **bcrypt-hashed** (cost 12). The plaintext password
  never exists in the repository or the database.
- All admin-mutating requests require a **double-submit CSRF token**.
- Login endpoint is **rate-limited** (10 attempts / 10 min per IP).
- Session is an **HS256 JWT** in an **HttpOnly, SameSite=Lax, signed cookie**,
  marked `Secure` in production. Logout clears it server-side.
- Helmet sets a strict Content-Security-Policy, disables `X-Powered-By`, etc.
- Admin path is configurable — change `ADMIN_PATH=/your-secret-path` in `.env`
  if you want the login page to be harder to discover.
- Uploaded icons are served from `/uploads/*` only — the server NEVER serves
  arbitrary files from outside the workspace. Dotfiles (`/.env`) are explicitly
  denied.
- `data/` and `uploads/` are in `.gitignore` — never commit runtime data.
- All offer API credentials are read from environment only; they are not
  writable from the admin dashboard.

### Rotating the admin password

```bash
npm run hash -- "NewStrongPassword"
# paste the output into ADMIN_PASSWORD_HASH in .env and redeploy
```

### Logs / audit trail

The `admin_audit` table records every login (success & fail), logout, and
script / settings mutation, with IP and user-agent. To inspect:

```bash
sqlite3 data/rocrack.sqlite "SELECT datetime(created_at,'unixepoch'), action, details, ip FROM admin_audit ORDER BY id DESC LIMIT 50;"
```

---

## Project layout

```
server.js                     - Express bootstrap + offer API
src/
  db.js                       - SQLite schema and queries
  auth.js                     - JWT cookie session, bcrypt verification
  providers.js                - Unified AdBlueMedia + OGAds offer fetchers
  routes_admin.js             - /admin/* routes
  routes_public.js            - dynamic /scripts/* routes
  seed.js                     - first-boot seeder for legacy scripts
views/admin/*.ejs             - admin panel templates
views/public/*.ejs            - public dynamic page templates
scripts/<slug>/               - legacy static script pages (preserved)
scripts-cli/                  - CLI helpers (hash-password, seed)
data/                         - SQLite file (volume in prod)
uploads/                      - user-uploaded script icons (volume in prod)
Dockerfile                    - Coolify-ready Node 20 image
.env.example                  - template for .env
```
