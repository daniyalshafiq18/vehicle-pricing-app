#!/usr/bin/env node
/**
 * probe-yallamotor.mjs — call the deployed Azure probe (scraper-service
 * `probe_py` cloudscraper transport), extract the YallaMotor JSON-LD from the
 * returned HTML, and save it as a fresh fixture for the in-repo parsers.
 *
 * The point: prove the Azure transport reproduces the same markup the Flow-3
 * fixtures were captured from, so `src/parsers` (already tested) extracts the
 * same fields — a live comparison against the Power Automate Flow 3 path.
 *
 * Usage:
 *   node scripts/probe-yallamotor.mjs <functionBaseUrl> <yallamotorUrl> [--out <file.json>]
 *
 * Example:
 *   node scripts/probe-yallamotor.mjs https://vpi-probe-py.azurewebsites.net/api/probe_py \
 *     "https://uae.yallamotor.com/used-cars/jeep/wrangler/2021/used-jeep-wrangler-2021-dubai-2111111" \
 *     --out tests/fixtures/azure-probe.json
 *
 * Prints a summary of the JSON-LD blocks found; writes the block array to
 * `--out` (default tests/fixtures/azure-probe.json). Requires Node 18+ (global
 * fetch).
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_DEFAULT = resolve('tests/fixtures/azure-probe.json');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outFile = outIdx >= 0 && args[outIdx + 1] ? resolve(args[outIdx + 1]) : OUT_DEFAULT;
const positionals = args.filter((a) => a !== '--out' && a !== args[outIdx + 1]);
const [fnBase, targetUrl] = positionals;

if (!fnBase || !targetUrl) {
  console.error('usage: node scripts/probe-yallamotor.mjs <functionBaseUrl> <yallamotorUrl> [--out <file.json>]');
  process.exit(1);
}

const api = `${fnBase}?url=${encodeURIComponent(targetUrl)}&client=cloudscraper`;
console.log(`→ probe: ${api}`);

const res = await fetch(api);
const body = await res.json();
console.log(
  `  httpStatus=${body.httpStatus} blocked=${body.blocked} hasJsonLd=${body.hasJsonLd} bytes=${body.bytes} ms=${body.ms}`,
);

if (!res.ok || body.blocked || typeof body.html !== 'string') {
  console.error(`✖ probe did not deliver HTML (${body.reason ?? res.status}). No fixture written.`);
  process.exit(1);
}

// Extract <script type="application/ld+json">…</script> blocks.
const LD_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const blocks = [];
for (const m of body.html.matchAll(LD_RE)) {
  try {
    blocks.push(JSON.parse(m[1]));
  } catch (e) {
    console.warn(`  ! skipped unparsable JSON-LD block: ${e.message}`);
  }
}

if (blocks.length === 0) {
  console.error('✖ no application/ld+json blocks found in the delivered HTML.');
  process.exit(1);
}

const hasType = (t) =>
  blocks.some((b) => {
    const ty = b['@type'];
    return (Array.isArray(ty) ? ty : [ty]).includes(t);
  });

const types = blocks.map((b) => (Array.isArray(b['@type']) ? b['@type'].join('|') : b['@type'] ?? '(none)'));
console.log(`✓ ${blocks.length} JSON-LD blocks: ${types.join(', ')}`);
console.log(
  `  Car/Product=${hasType('Car') || hasType('Product')} CollectionPage=${hasType('CollectionPage')} ItemList=${hasType('ItemList')}`,
);

writeFileSync(outFile, JSON.stringify(blocks, null, 2) + '\n');
console.log(`✓ wrote ${outFile}`);
