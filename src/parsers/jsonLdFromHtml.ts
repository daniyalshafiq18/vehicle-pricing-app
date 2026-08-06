/**
 * HTML → JSON-LD block extraction.
 *
 * Promotes the `<script type="application/ld+json">…</script>` regex that once
 * lived only in `scripts/probe-yallamotor.mjs` into a tested, transport-agnostic
 * helper shared by the Azure adapter (`src/lib/azureYallaMotorScraper.ts`).
 */

const JSON_LD_RE =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Extract every parseable `application/ld+json` block from an HTML document.
 * Malformed blocks are skipped rather than thrown. Returns `[]` on empty input.
 */
export function extractJsonLdBlocks(html: string | null | undefined): unknown[] {
  if (!html) {
    return [];
  }
  const blocks: unknown[] = [];
  for (const match of html.matchAll(JSON_LD_RE)) {
    const raw = match[1];
    if (!raw) {
      continue;
    }
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // skip unparsable JSON-LD blocks (e.g. non-JSON fragment)
    }
  }
  return blocks;
}