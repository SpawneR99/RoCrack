/**
 * One-off utility: patches every legacy locker.html so:
 *   1. (rc-patch:required-from-api) The client reads `requiredLeads` from the
 *      /api/offers response and updates the progress UI accordingly.
 *   2. (rc-patch:ogads-button) When the server responds with mode='button'
 *      (OGAds provider), the page renders a single big "Click Here" CTA
 *      instead of an offer list. One click + short wait unlocks the script.
 *   3. (rc-patch:ogads-helper) Injects a self-contained helper + CSS that
 *      draws the CTA, animates it, and handles the unlock lifecycle.
 *
 * Safe to re-run: each injection is guarded by a sentinel.
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

const SENTINEL_A = 'rc-patch:required-from-api';
const SENTINEL_B = 'rc-patch:ogads-button';
const SENTINEL_C = 'rc-patch:ogads-helper';

/* ─── Block 1 (A + B combined) — inserted inside loadOffers ─────────────── */
const COMBINED_AB = `
                // /* ${SENTINEL_A} */  sync required-leads from server (admin is source of truth)
                if (typeof data.requiredLeads === 'number' && data.requiredLeads > 0) {
                    CONFIG.requiredLeads = data.requiredLeads;
                    if (typeof updateProgress === 'function') updateProgress();
                }
                // /* ${SENTINEL_B} */  OGAds mode: render single CTA instead of offer list
                if (data && data.mode === 'button' && data.buttonUrl) {
                    if (window.rcRenderOgAdsButton) window.rcRenderOgAdsButton(data.buttonUrl, CONFIG);
                    return;
                }`;

/* ─── Block 2 (B-only upgrade) — for files that already had A ───────────── */
const B_ONLY = `
                // /* ${SENTINEL_B} */  OGAds mode: render single CTA instead of offer list
                if (data && data.mode === 'button' && data.buttonUrl) {
                    if (window.rcRenderOgAdsButton) window.rcRenderOgAdsButton(data.buttonUrl, CONFIG);
                    return;
                }`;

/* ─── Helper script — injected once per file, before </body> ────────────── */
const HELPER = `
<!-- /* ${SENTINEL_C} */ -->
<script>
(function() {
  if (window.rcRenderOgAdsButton) return;

  function injectCss() {
    if (document.getElementById('rc-ogads-cta-css')) return;
    var s = document.createElement('style');
    s.id = 'rc-ogads-cta-css';
    s.textContent = [
      "@keyframes rcCtaPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.035)} }",
      "@keyframes rcCtaGlow  { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }",
      "@keyframes rcCursorBounce { 0%,100%{transform:translate(0,0) rotate(-15deg)} 50%{transform:translate(6px,-6px) rotate(-15deg)} }",
      "@keyframes rcLastStepPulse { 0%,100%{opacity:0.75} 50%{opacity:1} }",
      ".rc-ogads-wrap{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;gap:1rem;padding:2.5rem 1rem 1rem;position:relative}",
      ".rc-ogads-lastbadge{font-family:'JetBrains Mono',ui-monospace,monospace;letter-spacing:3px;text-transform:uppercase;color:#00ff6a;font-size:0.72rem;font-weight:800;display:flex;align-items:center;gap:0.7rem;animation:rcLastStepPulse 1.8s ease-in-out infinite}",
      ".rc-ogads-lastbadge::before,.rc-ogads-lastbadge::after{content:'';height:1px;width:36px;background:linear-gradient(90deg,transparent,rgba(0,255,106,0.7),transparent)}",
      ".rc-ogads-cta{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:0.85rem;padding:1.3rem 3rem;font-family:'Inter',system-ui,sans-serif;font-size:1.3rem;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#03140c;background:linear-gradient(135deg,#10b981,#00ff6a);border:none;border-radius:16px;cursor:pointer;text-decoration:none;box-shadow:0 12px 48px -12px rgba(16,185,129,0.75),inset 0 1px 0 rgba(255,255,255,0.35);transition:transform 0.2s ease,box-shadow 0.2s ease;overflow:hidden;animation:rcCtaPulse 2.4s ease-in-out infinite;z-index:1}",
      ".rc-ogads-cta::before{content:'';position:absolute;inset:-3px;border-radius:19px;background:linear-gradient(135deg,#10b981,#00ff6a,#10b981);background-size:200% 200%;z-index:-1;animation:rcCtaGlow 3s linear infinite;filter:blur(16px);opacity:0.75}",
      ".rc-ogads-cta:hover{transform:translateY(-3px);box-shadow:0 20px 64px -10px rgba(0,255,106,0.9),inset 0 1px 0 rgba(255,255,255,0.4)}",
      ".rc-ogads-cta:active{transform:translateY(-1px) scale(0.99)}",
      ".rc-ogads-cta svg{width:22px;height:22px;transform:rotate(-15deg);animation:rcCursorBounce 1.6s ease-in-out infinite}",
      ".rc-ogads-help{font-family:'Inter',system-ui,sans-serif;color:rgba(255,255,255,0.6);font-size:0.88rem;line-height:1.55;text-align:center;max-width:440px;margin:0.25rem auto 0}",
      ".rc-ogads-help strong{color:#00ff6a;font-weight:600}",
      ".rc-ogads-pending{display:none;margin-top:0.5rem;font-family:'JetBrains Mono',monospace;font-size:0.8rem;letter-spacing:1.5px;color:#00ff6a;text-transform:uppercase}",
      ".rc-ogads-pending.show{display:inline-flex;align-items:center;gap:0.6rem}",
      ".rc-ogads-pending .dot{width:8px;height:8px;border-radius:50%;background:#00ff6a;box-shadow:0 0 12px #00ff6a;animation:rcLastStepPulse 1s ease-in-out infinite}"
    ].join('\\n');
    document.head.appendChild(s);
  }

  function findEl(ids, selectors) {
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) return el;
    }
    for (var j = 0; j < selectors.length; j++) {
      var q = document.querySelector(selectors[j]);
      if (q) return q;
    }
    return null;
  }

  window.rcRenderOgAdsButton = function(buttonUrl, CONFIG) {
    injectCss();
    CONFIG.requiredLeads = 1;

    // Hide copy that talks about "multiple offers / list below".
    var HIDE = ['.warning-banner', '.steps-box', '.video-tutorial'];
    HIDE.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) { el.style.display = 'none'; });
    });

    // Update the intro copy.
    var lockDesc = document.querySelector('.lock-description');
    if (lockDesc) lockDesc.textContent = 'Click the button below and follow the instructions on the next page to unlock your script.';

    var offersTitle = document.querySelector('.offers-title');
    if (offersTitle) offersTitle.textContent = 'Last Step';

    var offerCount = document.getElementById('offerCount');
    if (offerCount) offerCount.textContent = '1 Step';

    // Update the progress "0 / N completed" text to 0 / 1.
    var progressText = document.getElementById('progressText');
    if (progressText) progressText.textContent = '0 / 1 completed';

    // Replace the offers grid with a single CTA.
    var grid = findEl(['offersGrid'], ['.offers-grid', '#offers-container', '#offerContainer']);
    if (!grid) return;

    grid.innerHTML =
      '<div class="rc-ogads-wrap">' +
        '<div class="rc-ogads-lastbadge"><span>Last Step</span></div>' +
        '<a href="' + encodeURI(buttonUrl) + '" target="_blank" rel="noopener sponsored" class="rc-ogads-cta" id="rcOgClick">' +
          '<span>Click Here</span>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14l9 1 1 9 10-12-10-1z"/></svg>' +
        '</a>' +
        '<p class="rc-ogads-help">Click the button, <strong>follow the instructions on the next page</strong>, and come back. Your script will unlock automatically when you return.</p>' +
        '<div class="rc-ogads-pending" id="rcOgPending"><span class="dot"></span><span>Verifying completion…</span></div>' +
      '</div>';

    var key = 'rc_ogclick_' + CONFIG.niche;
    var btn = document.getElementById('rcOgClick');
    var pending = document.getElementById('rcOgPending');

    btn.addEventListener('click', function() {
      try { localStorage.setItem(key, String(Date.now())); } catch(_) {}
      if (pending) pending.classList.add('show');
    });

    function maybeUnlock() {
      if (window.__rcOgUnlocked) return;
      var ts = 0;
      try { ts = parseInt(localStorage.getItem(key) || '0', 10); } catch(_) {}
      if (!ts) return;
      var elapsed = Date.now() - ts;
      if (elapsed < 10000) return;
      window.__rcOgUnlocked = true;
      try { window.completedLeads = 1; } catch(_) {}
      // Try common unlock function names used across locker variants.
      if (typeof unlockContent === 'function') { try { unlockContent(); return; } catch(_) {} }
      if (typeof unlock        === 'function') { try { unlock();        return; } catch(_) {} }
      // Fallback: populate progress UI manually.
      var pf = document.getElementById('progressFill');
      var pt = document.getElementById('progressText');
      if (pf) pf.style.width = '100%';
      if (pt) pt.textContent = '1 / 1 completed — Unlocked!';
    }

    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) maybeUnlock();
    });
    setInterval(maybeUnlock, 2000);
    // Immediate check (in case the user already clicked in a previous session)
    maybeUnlock();
  };
})();
</script>
`;

let patched = 0, upgraded = 0, skipped = 0, notFound = 0;

for (const rel of FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) { console.warn('  missing:', rel); notFound++; continue; }

  let src = fs.readFileSync(full, 'utf8');
  const hasA = src.includes(SENTINEL_A);
  const hasB = src.includes(SENTINEL_B);
  const hasC = src.includes(SENTINEL_C);

  // ── Block A+B injection ────────────────────────────────────────────────
  if (!hasA && !hasB) {
    const re = /(const\s+data\s*=\s*await\s+response\.json\(\)\s*;)/;
    if (!re.test(src)) { console.warn('  no loadOffers anchor in:', rel); notFound++; continue; }
    src = src.replace(re, `$1${COMBINED_AB}`);
    patched++;
    console.log('  patched A+B:', rel);
  } else if (hasA && !hasB) {
    // Upgrade: file already has A, insert B right after the A block's closing brace.
    const upRe = new RegExp(
      '(/\\*\\s*' + SENTINEL_A + '\\s*\\*/[\\s\\S]*?\\n\\s*})',
      ''
    );
    if (!upRe.test(src)) {
      // Fallback: just append B right after the parse line.
      const re = /(const\s+data\s*=\s*await\s+response\.json\(\)\s*;)/;
      src = src.replace(re, `$1${B_ONLY}`);
    } else {
      src = src.replace(upRe, '$1' + B_ONLY);
    }
    upgraded++;
    console.log('  upgraded +B:', rel);
  } else {
    skipped++;
  }

  // ── Helper block injection (idempotent) ────────────────────────────────
  if (!hasC && !src.includes(SENTINEL_C)) {
    if (/<\/body>/i.test(src)) {
      src = src.replace(/<\/body>/i, HELPER + '\n</body>');
    } else {
      src += HELPER;
    }
    console.log('  injected helper:', rel);
  }

  fs.writeFileSync(full, src);
}

console.log(`\n[patch-lockers] patched=${patched} upgraded=${upgraded} skipped=${skipped} notFound=${notFound}`);
