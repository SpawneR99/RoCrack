/**
 * One-off utility: patches every legacy locker.html so the client reads
 * `requiredLeads` from the /api/offers response and updates the progress UI
 * accordingly. Admin Settings then control required / max / min site-wide.
 *
 * Safe to re-run: each insertion checks for a sentinel marker.
 *
 * Usage:  node scripts-cli/patch-lockers.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'script/locker.html',
  'scripts/blox/locker.html',
  'scripts/arise/locker.html',
  'scripts/brainrot/locker.html',
  'scripts/deadrails/locker.html',
  'scripts/fisch/locker.html',
  'scripts/brookhaven/locker.html',
  'scripts/fishit/locker.html',
  'scripts/forsaken/locker.html',
  'scripts/garden/locker.html',
  'scripts/forest/locker.html',
  'scripts/island/locker.html',
  'scripts/volleyball/locker.html',
  'scripts/rivals/locker.html',
  'scripts/plantsbrainrots/locker.html',
];

const SENTINEL = '/* rc-patch:required-from-api */';

const INSERT = `
                // ${SENTINEL}  sync required-leads from server (admin is source of truth)
                if (typeof data.requiredLeads === 'number' && data.requiredLeads > 0) {
                    CONFIG.requiredLeads = data.requiredLeads;
                    if (typeof updateProgress === 'function') updateProgress();
                }`;

let patched = 0, skipped = 0, notFound = 0;

for (const rel of FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) { console.warn('  missing:', rel); notFound++; continue; }

  let src = fs.readFileSync(full, 'utf8');

  if (src.includes(SENTINEL)) { skipped++; continue; }

  // Insert right after the "const data = await response.json();" line inside loadOffers
  const re = /(const\s+data\s*=\s*await\s+response\.json\(\)\s*;)/;
  if (!re.test(src)) {
    console.warn('  no loadOffers parse site found in:', rel);
    notFound++; continue;
  }

  src = src.replace(re, `$1${INSERT}`);
  fs.writeFileSync(full, src);
  patched++;
  console.log('  patched:', rel);
}

console.log(`\n[patch-lockers] patched=${patched} skipped=${skipped} notFound=${notFound}`);
