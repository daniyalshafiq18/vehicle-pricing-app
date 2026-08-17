import { describe, expect, it, vi } from 'vitest';
import { processNextScrapeInboxItem, processScrapeInbox } from './multiSourceScraper';
import type { ScrapeResultUpdate } from './multiSourceScraper';
import type { MissingVehicleRequest } from '@types';
import camry2024Html from '../../tests/fixtures/drivearabia-camry-2024-pad.html?raw';

const BASE = 'https://mock.azurewebsites.net/api/probe_py';
const ITEM = {
  inboxId: 'abc123',
  source: 'drivearabia',
  url: 'https://www.drivearabia.com/carprices/uae/toyota/toyota-camry/2024/',
  searchUrl: '',
  kind: 'prices',
  status: 'Pending',
};

const REQUEST: MissingVehicleRequest = {
  id: 'mvr-1',
  make: 'Toyota',
  model: 'Camry',
  trim: '3.5L V6 Sport FWD',
  modelYear: 2024,
  bodyType: 'Sedan',
};

const SELECTED_REQUEST: MissingVehicleRequest = {
  ...REQUEST,
  id: 'mvr-selected',
  trim: '2.5L I4 SE FWD',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('processNextScrapeInboxItem', () => {
  it('matches a real DriveArabia capture, writes PAD provenance, and marks Complete', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(ITEM))
      .mockResolvedValueOnce(json({ ...ITEM, html: camry2024Html }))
      .mockResolvedValueOnce(json({ inboxId: ITEM.inboxId, status: 'Complete' }));
    const updateScrapeResult = vi.fn(async (_id: string, _fields: ScrapeResultUpdate) => undefined);

    const result = await processNextScrapeInboxItem({
      requests: [REQUEST],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult,
    });

    expect(result).toEqual({
      inboxId: ITEM.inboxId,
      status: 'complete',
      updatedRequestIds: [REQUEST.id],
    });
    expect(updateScrapeResult).toHaveBeenCalledTimes(1);
    const [, fields] = updateScrapeResult.mock.calls[0]!;
    expect(fields).toMatchObject({
      scrapedMinPrice: 130000,
      scrapedMaxPrice: 138900,
      scrapedSources: ITEM.url,
      scrapeStatusValue: 4,
    });
    expect(JSON.parse(fields.scrapedListings)).toMatchObject({
      source: 'DriveArabia',
      transport: 'pad',
      inboxId: ITEM.inboxId,
      trim: REQUEST.trim,
      year: 2024,
    });
    expect(fetchFn).toHaveBeenNthCalledWith(
      3,
      'https://mock.azurewebsites.net/api/inbox_status',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ inboxId: ITEM.inboxId, status: 'Complete' }),
      }),
    );
  });

  it('returns empty without attempting a Dataverse write', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(json({ error: 'no_pending' }, 404));
    const updateScrapeResult = vi.fn(async (_id: string, _fields: ScrapeResultUpdate) => undefined);

    await expect(
      processNextScrapeInboxItem({
        requests: [REQUEST],
        functionBaseUrl: BASE,
        fetchFn,
        updateScrapeResult,
      }),
    ).resolves.toEqual({ status: 'empty', updatedRequestIds: [] });
    expect(updateScrapeResult).not.toHaveBeenCalled();
  });

  it('writes structured specs only to the exact selected trim represented by JSON-LD', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(ITEM))
      .mockResolvedValueOnce(json({ ...ITEM, html: camry2024Html }))
      .mockResolvedValueOnce(json({ inboxId: ITEM.inboxId, status: 'Complete' }));
    const updateScrapeResult = vi.fn(async (_id: string, _fields: ScrapeResultUpdate) => undefined);

    await processNextScrapeInboxItem({
      requests: [SELECTED_REQUEST, REQUEST],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult,
    });

    const selectedFields = updateScrapeResult.mock.calls.find(
      ([id]) => id === SELECTED_REQUEST.id,
    )?.[1];
    const otherFields = updateScrapeResult.mock.calls.find(([id]) => id === REQUEST.id)?.[1];
    expect(selectedFields).toMatchObject({
      bodyTypeValue: 44,
      fuelTypeValue: 1,
      transmissionValue: 1,
      driveTypeValue: 3,
      cylindersValue: 2,
      engineSizeValue: 2500,
      horsepowerValue: 204,
      doorsValue: 4,
    });
    expect(JSON.parse(selectedFields!.scrapedListings).specs).toMatchObject({
      trim: SELECTED_REQUEST.trim,
      horsepower: 204,
      torqueNm: 243,
    });
    expect(otherFields).not.toHaveProperty('bodyTypeValue');
    expect(JSON.parse(otherFields!.scrapedListings)).not.toHaveProperty('specs');
  });

  it('leaves a valid capture Pending when no MVR matches instead of guessing', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(ITEM))
      .mockResolvedValueOnce(json({ ...ITEM, html: camry2024Html }));

    const result = await processNextScrapeInboxItem({
      requests: [{ ...REQUEST, model: 'Corolla' }],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult: vi.fn(async () => undefined),
    });

    expect(result.status).toBe('waiting');
    expect(result.error).toContain('No matching missing-vehicle request');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('marks an unsupported source Error and retains it for diagnosis', async () => {
    const dubizzleItem = { ...ITEM, source: 'dubizzle', html: '<html>capture</html>' };
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(dubizzleItem))
      .mockResolvedValueOnce(json(dubizzleItem))
      .mockResolvedValueOnce(json({ inboxId: ITEM.inboxId, status: 'Error' }));

    const result = await processNextScrapeInboxItem({
      requests: [REQUEST],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult: vi.fn(async () => undefined),
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain("source 'dubizzle' is not implemented");
    expect(fetchFn).toHaveBeenNthCalledWith(
      3,
      'https://mock.azurewebsites.net/api/inbox_status',
      expect.objectContaining({ body: JSON.stringify({ inboxId: ITEM.inboxId, status: 'Error' }) }),
    );
  });
});

describe('processScrapeInbox', () => {
  it('drains completed items until the relay reports an empty queue', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(ITEM))
      .mockResolvedValueOnce(json({ ...ITEM, html: camry2024Html }))
      .mockResolvedValueOnce(json({ inboxId: ITEM.inboxId, status: 'Complete' }))
      .mockResolvedValueOnce(json({ error: 'no_pending' }, 404));

    const summary = await processScrapeInbox({
      requests: [REQUEST],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult: vi.fn(async () => undefined),
    });

    expect(summary).toEqual({
      processedItems: 1,
      completedItems: 1,
      failedItems: 0,
      waitingItems: 0,
      updatedRequestIds: [REQUEST.id],
      failures: [],
    });
  });
});
