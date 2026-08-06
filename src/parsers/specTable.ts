/**
 * YallaMotor detail-page spec-table extraction.
 *
 * YallaMotor's JSON-LD has no `cylinders` — the value lives only in the rendered
 * spec grid (React/Next.js tiles). Each tile is:
 *
 *   <div class="mb-1 … capitalize" title="Number of Cylinders">Number of Cylinders</div>
 *   <div class="text-base …" title="6">6</div>
 *
 * We anchor on the label div's `title` and read the following value div's `title`
 * (falling back to its text). Confirmed from a raw Azure-probe capture of the
 * Wrangler detail page (2026-08-06).
 */

const CYLINDERS_TILE_RE =
  /title=["']Number of Cylinders["'][^>]*>\s*[^<]*<\/div>\s*<div[^>]*title=["']([^"']*)["'][^>]*>([\s\S]*?)<\/div>/i;

/**
 * Return the cylinder count string (e.g. "6") from a YallaMotor detail page, or
 * `undefined` when the spec tile is absent.
 */
export function extractCylinders(html: string | null | undefined): string | undefined {
  if (!html) {
    return undefined;
  }
  const match = CYLINDERS_TILE_RE.exec(html);
  if (!match) {
    return undefined;
  }
  const fromTitle = match[1]?.trim();
  if (fromTitle) {
    return fromTitle;
  }
  const fromText = match[2]?.replace(/<[^>]*>/g, '').trim();
  return fromText || undefined;
}