/**
 * Seeds the DB with metadata for the 14 existing ("legacy") scripts so the
 * admin can configure their niche / required_leads / max_offers / active.
 *
 * The actual static HTML files under /scripts/<slug>/ keep serving the heavy
 * SEO content — this seeder only registers their existence in the CMS.
 */

const db = require('./db');

const LEGACY = [
  { slug: 'blox',           name: 'Blox Fruits',         niche: 'RoCrackFruits',       sort_order: 10 },
  { slug: 'garden',         name: 'Grow a Garden',       niche: 'CrackGarden',         sort_order: 20 },
  { slug: 'deadrails',      name: 'Dead Rails',          niche: 'CrackDeadRails',      sort_order: 30 },
  { slug: 'brainrot',       name: 'Steal a Brainrot',    niche: 'CrackStealBrainrot',  sort_order: 40 },
  { slug: 'forest',         name: '99 Nights Forest',    niche: 'CrackForest',         sort_order: 50 },
  { slug: 'forsaken',       name: 'Forsaken',            niche: 'CrackForsaken',       sort_order: 60 },
  { slug: 'island',         name: 'Build An Island',     niche: 'CrackIsland',         sort_order: 70 },
  { slug: 'plantsbrainrots',name: 'Plants vs Brainrots', niche: 'CrackPlantsBrainrots',sort_order: 80 },
  { slug: 'fishit',         name: 'Fish It',             niche: 'CrackFishIt',         sort_order: 90 },
  { slug: 'rivals',         name: 'Rivals',              niche: 'CrackRivals',         sort_order: 100 },
  { slug: 'arise',          name: 'Arise Crossover',     niche: 'CrackArise',          sort_order: 110 },
  { slug: 'brookhaven',     name: 'Brookhaven',          niche: 'CrackBrookhaven',     sort_order: 120 },
  { slug: 'volleyball',     name: 'Volleyball Legends',  niche: 'CrackVolleyball',     sort_order: 130 },
  { slug: 'fisch',          name: 'Fisch',               niche: 'CrackFisch',          sort_order: 140 },
];

function seedIfEmpty() {
  const existing = db.listScripts();
  if (existing.length > 0) return { seeded: 0, reason: 'db already populated' };

  let seeded = 0;
  for (const row of LEGACY) {
    try {
      db.createScript({
        slug:           row.slug,
        name:           row.name,
        niche:          row.niche,
        icon_path:      `/scripts/${row.slug}/blox.png`,
        tagline:        `${row.name} script for Roblox — auto farm, ESP & more.`,
        description:    '',
        meta_title:     '',
        meta_description: '',
        meta_keywords:  '',
        video_url:      '',
        required_leads: 2,
        max_offers:     4,
        min_offers:     2,
        hubs:           [],
        is_legacy:      true,
        active:         true,
        sort_order:     row.sort_order,
      });
      seeded++;
    } catch (e) {
      console.error(`[seed] failed to insert ${row.slug}:`, e.message);
    }
  }
  return { seeded };
}

if (require.main === module) {
  const r = seedIfEmpty();
  console.log('[seed]', r);
  process.exit(0);
}

module.exports = { seedIfEmpty };
