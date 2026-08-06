import { describe, it, expect, vi } from 'vitest';
import { assembleAzureResult, scrapeViaAzure, scrapeWithFallback } from './azureYallaMotorScraper';
import type { DetailSpecs } from '@parsers';
import type { Flow3Response, Flow3ScrapeResult } from './yallaMotorHttpScraper';
// Real live-captured JSON-LD fixtures (guide §7.5) + the spec-grid HTML slice.
import camryBlocks from '../../tests/fixtures/yallamotor-camry-search.jsonld.json';
import wranglerBlocks from '../../tests/fixtures/yallamotor-wrangler-detail.jsonld.json';
import detailSpecHtml from '../../tests/fixtures/wrangler-detail-spec-section.html?raw';

const wrap = (blocks: unknown[]) =>
  blocks.map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('');

const camrySearchHtml = `<html><head>${wrap(camryBlocks)}</head></html>`;
const wranglerDetailHtml = `<html><head>${wrap(wranglerBlocks)}</head></html>${detailSpecHtml}`;

const PARAMS = { make: 'Jeep', model: 'Wrangler', trim: '3.6L Automatic', year: 2021 };
const BASE = 'https://mock.azurewebsites.net/api/probe_py';

/** Returns a fetch mock serving each HTML payload in sequence (one per probe). */
function fakeFetch(htmls: string[]) {
  return vi.fn(async () => {
    const html = htmls.shift();
    if (html === undefined) {
      return new Response('{"error":"no more responses"}', { status: 500 });
    }
    return new Response(
      JSON.stringify({ html, httpStatus: 200, blocked: false, hasJsonLd: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  });
}

const blockedFetch = vi.fn(async () =>
  new Response(JSON.stringify({ httpStatus: 403, blocked: true, reason: 'challenge page, no content' }), {
    status: 403,
  }),
);

describe('assembleAzureResult', () => {
  it('merges search summary + detail specs + cylinders into a Flow3ScrapeResult', () => {
    const specs: DetailSpecs = {
      bodyType: 'SUV / Crossover',
      fuelType: 'Petrol',
      engineSize: '3600',
      regionalSpecs: 'GCC Specs',
    };
    const result = assembleAzureResult(
      { count: 1, minPrice: 93000, maxPrice: 93000, heading: '1 listing' },
      specs,
      '6',
      PARAMS,
    );
    expect(result).toMatchObject({
      success: true,
      count: 1,
      minPrice: 93000,
      maxPrice: 93000,
      bodyType: 'SUV / Crossover',
      fuelType: 'Petrol',
      engineSize: '3600',
      regionalSpecs: 'GCC Specs',
      cylinders: '6',
    });
    expect(result.seats).toBeUndefined();
  });

  it('omits spec labels that are empty', () => {
    const result = assembleAzureResult(
      { count: 0, minPrice: 0, maxPrice: 0, heading: '' },
      {},
      undefined,
      PARAMS,
    );
    expect(result.bodyType).toBeUndefined();
    expect(result.cylinders).toBeUndefined();
  });
});

describe('scrapeViaAzure', () => {
  it('returns a complete result when search + detail probes succeed', async () => {
    const fetchFn = fakeFetch([camrySearchHtml, wranglerDetailHtml]);
    const result = await scrapeViaAzure(PARAMS, { fetchFn, functionBaseUrl: BASE });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.count).toBe(503);
    expect(result.minPrice).toBe(120);
    expect(result.maxPrice).toBe(350000);
    expect(result.cylinders).toBe('6');
    expect(result.bodyType).toBe('SUV / Crossover');
    expect(result.engineSize).toBe('3600');
    expect(result.sourceUrl).toBe(
      'https://uae.yallamotor.com/used-cars/jeep/wrangler/vr_3-6l-automatic/yr_2021_2021',
    );
    // Search + detail → two probes
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('returns an error (not throw) when the probe is blocked', async () => {
    const result = await scrapeViaAzure(PARAMS, { fetchFn: blockedFetch, functionBaseUrl: BASE });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('blocked');
    }
  });

  it('returns an error when no probe URL is configured', async () => {
    const result = await scrapeViaAzure(PARAMS, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not configured');
    }
  });

  it('returns an error when the search yields no listings', async () => {
    const fetchFn = fakeFetch(['<html><head></head></html>']);
    const result = await scrapeViaAzure(PARAMS, { fetchFn, functionBaseUrl: BASE });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('no listings');
    }
  });
});

describe('scrapeWithFallback', () => {
  it('uses Azure when it succeeds — transport: azure, Flow 3 untouched', async () => {
    const fetchFn = fakeFetch([camrySearchHtml, wranglerDetailHtml]);
    const flow3 = vi.fn(async (): Promise<Flow3Response> => ({ success: false, error: 'should not run' }));
    const result = await scrapeWithFallback(PARAMS, { fetchFn, functionBaseUrl: BASE, flow3 });

    expect(result.transport).toBe('azure');
    expect(result.success).toBe(true);
    expect(flow3).not.toHaveBeenCalled();
  });

  it('falls back to Flow 3 when Azure fails — transport: flow3', async () => {
    const flow3Success: Flow3ScrapeResult = {
      success: true,
      make: PARAMS.make,
      model: PARAMS.model,
      trim: PARAMS.trim,
      year: PARAMS.year,
      count: 7,
      minPrice: 100,
      maxPrice: 200,
      heading: '7 listings · AED 100 – 200',
      sourceUrl: 'https://uae.yallamotor.com/used-cars/jeep/wrangler/vr_3-6l-automatic/yr_2021_2021',
    };
    const flow3 = vi.fn(async (): Promise<Flow3Response> => flow3Success);
    const result = await scrapeWithFallback(PARAMS, { fetchFn: blockedFetch, functionBaseUrl: BASE, flow3 });

    expect(result.transport).toBe('flow3');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.count).toBe(7);
    }
  });

  it('reports the Flow 3 error when both transports fail', async () => {
    const flow3 = vi.fn(async (): Promise<Flow3Response> => ({ success: false, error: 'Flow 3 down' }));
    const result = await scrapeWithFallback(PARAMS, { fetchFn: blockedFetch, functionBaseUrl: BASE, flow3 });

    expect(result.transport).toBe('flow3');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Flow 3 down');
    }
  });
});