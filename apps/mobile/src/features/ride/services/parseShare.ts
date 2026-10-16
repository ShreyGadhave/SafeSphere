/**
 * Reads what cab apps put in their "share trip" text. Only facts present in the text are returned;
 * anything missing stays null and the confirm screen asks the user (the old app invented a driver,
 * a plate and a destination 2 km away — never again).
 */

export type CabProvider = 'uber' | 'ola' | 'rapido' | 'other';

export type ParsedShare = {
  provider: CabProvider | null;
  trackingUrl: string | null;
  driverName: string | null;
  plate: string | null;
  vehicle: string | null;
  destination: string | null;
};

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

const PROVIDERS: [CabProvider, RegExp][] = [
  ['uber', /(^|\.)uber\.com|t\.uber\.com|\buber\b/i],
  ['ola', /olacabs|ola\.onelink\.me|olawebcdn|\bola\b/i],
  ['rapido', /rapido/i],
];

// Indian registration: state code, district number, series (1–4 letters, possibly split as in
// Delhi's "DL 3C AB 1234"), 4 digits.
const PLATE_RE = /\b([A-Z]{2})[\s-]?(\d{1,2})[\s-]?([A-Z](?:[\s-]?[A-Z]){0,3})[\s-]?(\d{4})\b/;

// Names are case-sensitive (capitalised word + optional capitalised surname or initial) so
// "Suresh in a…" stops at "Suresh"; only the keywords accept either case.
const NAME = String.raw`([A-Z][a-z]+(?: [A-Z](?:[a-z]+|\.)?)?)`;
const DRIVER_RES = [
  new RegExp(String.raw`\b[Dd]river(?:'s name)?\s*(?:is|:|-)\s*` + NAME),
  new RegExp(String.raw`\b[Yy]our driver,?\s+` + NAME),
  new RegExp(String.raw`\b` + NAME + String.raw`\s+is (?:your|my) driver\b`),
  new RegExp(String.raw`\b[Rr]iding with\s+` + NAME),
];

const DESTINATION_RE =
  /\b(?:trip|ride|journey|way|heading|going)\s+to\s+(.+?)(?=\s*(?:[.:\n]|https?:|\bfollow\b|\btrack\b|\bETA\b|\bin a\b|\bwith\b|$))/i;

const VEHICLE_RE = /\bin an?\s+((?:[A-Za-z]+\s){0,3}[A-Za-z0-9]+)(?=\s*(?:\(|,|\.|\bwith\b|\bnumber\b|\b[A-Z]{2}[\s-]?\d))/;

function clean(s: string | undefined | null): string | null {
  const v = s?.replace(/\s+/g, ' ').trim().replace(/[,;.]+$/, '');
  return v ? v : null;
}

export function normalizePlate(raw: string): string | null {
  const m = raw.toUpperCase().match(PLATE_RE);
  return m ? `${m[1]} ${m[2].padStart(2, '0')} ${m[3].replace(/[\s-]/g, '')} ${m[4]}` : null;
}

export function parseShareText(text: string): ParsedShare {
  const urls = text.match(URL_RE) ?? [];
  const provider = PROVIDERS.find(([, re]) => urls.some((u) => re.test(u)) || re.test(text))?.[0] ?? null;
  const trackingUrl =
    urls.find((u) => PROVIDERS.some(([, re]) => re.test(u))) ?? urls[0] ?? null;

  // Look for the plate outside URLs so tracking tokens can't be mistaken for one.
  const withoutUrls = text.replace(URL_RE, ' ');
  const plate = normalizePlate(withoutUrls);

  let driverName: string | null = null;
  for (const re of DRIVER_RES) {
    const m = withoutUrls.match(re);
    if (m) {
      driverName = clean(m[1]);
      break;
    }
  }

  return {
    provider: provider ?? (urls.length ? 'other' : null),
    trackingUrl,
    driverName,
    plate,
    vehicle: clean(withoutUrls.match(VEHICLE_RE)?.[1]),
    destination: clean(withoutUrls.match(DESTINATION_RE)?.[1]),
  };
}

/** True when the text looks like a shared cab trip (worth opening Safe Ride for). */
export function looksLikeTripShare(text: string): boolean {
  const p = parseShareText(text);
  return p.provider != null || p.plate != null || p.destination != null;
}
