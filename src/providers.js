/**
 * Unified offer provider layer.
 * Both providers return a normalized offer shape:
 *
 *   {
 *     id:          string        - stable offer identifier
 *     title:       string        - short headline
 *     description: string        - FULL offer description (multi-line safe)
 *     image:       string        - icon/thumbnail URL
 *     url:         string        - click URL (user is redirected here)
 *     payout:      string|null   - "0.39" etc., optional
 *     country:     string|null
 *     device:      string|null
 *   }
 *
 * Which provider is used is decided from the `provider` setting in DB
 * (admin panel → Settings toggles this; defaults to "adbluemedia" on fresh install).
 */

const ADBLUE = {
  endpoint: process.env.ADBLUE_ENDPOINT
    || 'https://d1y3y09sav47f5.cloudfront.net/public/offers/feed.php',
  userId:   process.env.ADBLUE_USER_ID   || '',
  apiKey:   process.env.ADBLUE_API_KEY   || '',
  // Landing URL the user is sent to when AdBlueMedia is active. Niche flows into s1.
  buttonUrl: process.env.ADBLUE_BUTTON_URL || 'https://devicegetty.com/3211251',
};

const OGADS = {
  endpoint: process.env.OGADS_ENDPOINT   || 'https://checkmyapp.space/api/v2',
  apiKey:   process.env.OGADS_API_KEY    || '',
  // Landing URL the user is sent to when OGAds is active. Niche flows into aff_sub4.
  buttonUrl: process.env.OGADS_BUTTON_URL || 'https://devicevrfy.net/cl/i/7jvwdk',
};

function buildOgadsButtonUrl(niche) {
  const base = OGADS.buttonUrl.replace(/\?.*$/, '');
  const sub  = encodeURIComponent(String(niche || 'RoCrack'));
  return `${base}?aff_sub4=${sub}`;
}

function buildAdBlueButtonUrl(niche) {
  const base = ADBLUE.buttonUrl.replace(/\?.*$/, '');
  const sub  = encodeURIComponent(String(niche || 'RoCrack'));
  return `${base}?s1=${sub}`;
}

async function fetchAdBlue({ niche, ip, userAgent, maxOffers }) {
  const params = new URLSearchParams({
    user_id: ADBLUE.userId,
    api_key: ADBLUE.apiKey,
    s1: niche || '',
  });
  if (ip)        params.append('ip', ip);
  if (userAgent) params.append('user_agent', userAgent);

  const url = `${ADBLUE.endpoint}?${params.toString()}`;
  const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`AdBlueMedia HTTP ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw)) throw new Error('AdBlueMedia returned non-array payload');

  const normalized = raw.map((o) => {
    const title       = String(o.anchor || o.name || 'Offer');
    const description = String(o.conversion || o.description || 'Complete this offer');
    const image       = o.network_icon || o.picture || '';
    const url         = String(o.url || o.link || '#');
    return {
      id:          String(o.offerid || o.id || o.anchor || ''),
      title, description, image, url,
      payout:      o.amount || o.payout || null,
      country:     o.country || null,
      device:      o.device  || null,
      // Legacy aliases kept for backwards compatibility with existing
      // static locker.html pages that read raw AdBlueMedia field names.
      anchor:       title,
      conversion:   description,
      network_icon: image,
    };
  });

  return normalized.slice(0, Math.max(1, maxOffers || 4));
}

async function fetchOgAds({ niche, ip, userAgent, maxOffers, minOffers }) {
  if (!OGADS.apiKey) throw new Error('OGAds API key is not configured');
  const params = new URLSearchParams();
  if (ip)        params.append('ip', ip);
  if (userAgent) params.append('user_agent', userAgent);
  if (maxOffers) params.append('max', String(maxOffers));
  if (minOffers) params.append('min', String(minOffers));
  if (niche)     params.append('aff_sub4', niche);

  const url = `${OGADS.endpoint}?${params.toString()}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${OGADS.apiKey}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`OGAds HTTP ${res.status}`);
  const data = await res.json();
  if (!data || data.success === false) {
    throw new Error(`OGAds error: ${data && data.error ? data.error : 'unknown'}`);
  }
  const list = Array.isArray(data.offers) ? data.offers : [];

  return list.map((o) => {
    const title       = String(o.name_short || o.name || 'Offer');
    const description = cleanHtml(o.adcopy || o.description || 'Complete this offer');
    const image       = o.picture || '';
    const url         = String(o.link || '#');
    return {
      id:          String(o.offerid || ''),
      title, description, image, url,
      payout:      o.payout || null,
      country:     o.country || null,
      device:      o.device  || null,
      // Legacy aliases — legacy static locker pages read these names.
      anchor:       title,
      conversion:   description,
      network_icon: image,
    };
  });
}

/** Strip HTML tags but preserve line breaks for description display. */
function cleanHtml(s) {
  return String(s)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * High-level API used by routes.
 * `provider` explicitly overrides the configured provider if present.
 */
async function fetchOffers({ provider, niche, ip, userAgent, maxOffers, minOffers }) {
  const p = String(provider || '').toLowerCase();
  if (p === 'ogads')       return fetchOgAds({ niche, ip, userAgent, maxOffers, minOffers });
  if (p === 'adbluemedia') return fetchAdBlue({ niche, ip, userAgent, maxOffers });
  throw new Error(`Unknown provider: ${provider}`);
}

module.exports = { fetchOffers, fetchAdBlue, fetchOgAds, buildOgadsButtonUrl, buildAdBlueButtonUrl };
