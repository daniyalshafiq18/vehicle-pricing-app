/**
 * LIVE side-by-side proof — Azure (PRIMARY) vs Power Automate Flow 3 (fallback).
 *
 * These tests hit the REAL deployed infrastructure — the Azure probe at
 * `VITE_AZURE_FUNCTION_URL` and the real Flow 3 trigger at `VITE_FLOW3_URL` —
 * and are SKIPPED unless `LIVE_AZURE_PROBE=1`. They exist to fill the §7 live
 * cell in docs/azure-functions-scraper-implementation-report.md, and are
 * re-runnable whenever you want to re-verify the live path.
 *
 * Run from the repo root with the live URLs exported:
 *   LIVE_AZURE_PROBE=1 \
 *   VITE_AZURE_FUNCTION_URL="$(sed -n 's/^VITE_AZURE_FUNCTION_URL=//p' .env.local)" \
 *   VITE_FLOW3_URL="$(sed -n 's/^VITE_FLOW3_URL=//p' .env.local)" \
 *   npx vitest run src/lib/azureLiveProbe.test.ts
 */
import { describe, it, expect } from 'vitest';
import { scrapeViaAzure, scrapeWithFallback } from './azureYallaMotorScraper';

const LIVE = !!process.env.LIVE_AZURE_PROBE;

const PARAMS = { make: 'Jeep', model: 'Wrangler', trim: '3.6L Automatic', year: 2021 };

describe.skipIf(!LIVE)('LIVE side-by-side proof (real Azure + real Flow 3)', () => {
  it('primary transport: real Azure probe → transport=azure + cylinders populated (retries past CF challenge)', { timeout: 300000 }, async () => {
    // YallaMotor intermittently Cloudflare-challenges cloudscraper on the first
    // probe (cold start), so retry a few times — direct retries pass 3/3.
    let r: Awaited<ReturnType<typeof scrapeViaAzure>> | undefined;
    for (let i = 1; i <= 5; i++) {
      r = await scrapeViaAzure(PARAMS);
      if (r.success) break;
      console.log(`[LIVE azure] attempt ${i} shortfall: ${r.statusCode ?? r.error}`);
    }
    if (!r) {
      throw new Error('Azure probe produced no result across 5 attempts');
    }
    if (!r.success) {
      throw new Error(`Azure probe blocked live across 5 attempts: ${r.error}`);
    }
    // The whole point of the Azure path: cylinders come from the HTML spec grid,
    // which Flow 3 could never deliver. Its absence means the detail probe failed.
    expect(r.cylinders).toBeTruthy();
    console.log('[LIVE azure]', JSON.stringify({
      transport: 'azure',
      count: r.count,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
      cylinders: r.cylinders,
      bodyType: r.bodyType,
      sourceUrl: r.sourceUrl,
    }, null, 2));
  });

  it('fallback transport: broken Azure URL → falls back to Flow 3 (live smoker)', { timeout: 180000 }, async () => {
    // Proves the routing: with Azure disabled, the code selects the Flow 3
    // transport. Whether the Flow 3 endpoint itself returns live data depends on
    // the Power Automate host being reachable from the calling network (it is
    // unreachable from this dev box — see report §8); that half is a portal click.
    const r = await scrapeWithFallback(PARAMS, {
      functionBaseUrl: 'https://does-not-exist.invalid/api/probe_py',
    });
    expect(r.transport).toBe('flow3');
    console.log('[LIVE flow3]', JSON.stringify({
      transport: 'flow3',
      success: r.success,
      count: r.success ? r.count : undefined,
      heading: r.success ? r.heading : undefined,
      error: r.success ? undefined : r.error,
    }, null, 2));
  });
});
