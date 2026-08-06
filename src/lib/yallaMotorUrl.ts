/**
 * YallaMotor search-URL builder.
 *
 * The `slugify` + `vr_/yr_` URL pattern was lifted verbatim from the old
 * Power Automate-only scraper and is now the single shared source used by both
 * transports (`scrapeViaFlow3` and the Azure adapter), so every path produces
 * the exact same `sourceUrl` for a given make/model/trim/year.
 */

/** Replace any sequence of non-alphanumeric characters with a single hyphen. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildYallaMotorSearchUrl(params: {
  make: string;
  model: string;
  trim: string;
  year: number;
}): string {
  return (
    `https://uae.yallamotor.com/used-cars/${slugify(params.make)}/` +
    `${slugify(params.model)}/vr_${slugify(params.trim)}/` +
    `yr_${params.year}_${params.year}`
  );
}