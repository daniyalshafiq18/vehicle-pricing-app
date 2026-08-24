import { describe, expect, it, vi } from 'vitest';
import { processNextScrapeInboxItem, processScrapeInbox } from './multiSourceScraper';
import type { ScrapeResultUpdate } from './multiSourceScraper';
import type { MissingVehicleRequest } from '@types';
import camry2024Html from '../../tests/fixtures/drivearabia-camry-2024-pad.html?raw';

const multiTrimCamryHtml = `${camry2024Html}<script type="application/json" id="vpi-pad-spec-groups">${JSON.stringify([
  {
    configuration: '2.5 I4 FWD',
    text: 'Engine Type\nPetrol\nDrive Train\nFWD\nTransmission\n8A\nHorsepower\n204 HP\nTorque\n243 Nm',
  },
  {
    configuration: '3.5 V6 FWD',
    text: 'Engine Type\nPetrol\nDrive Train\nFWD\nTransmission\n8A\nHorsepower\n298 HP\nTorque\n356 Nm',
  },
  {
    configuration: '2.5 H I4 FWD',
    text: 'Engine Type\nHybrid\nDrive Train\nFWD\nTransmission\nCVT\nHorsepower\n208 HP\nTorque\n221 Nm',
  },
])}</script>`;

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
    const persistEvidence = vi.fn(async () => undefined);

    const result = await processNextScrapeInboxItem({
      requests: [REQUEST],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult,
      persistEvidence,
    });

    expect(result).toEqual({
      inboxId: ITEM.inboxId,
      status: 'complete',
      updatedRequestIds: [REQUEST.id],
      evidenceWarnings: [],
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
    expect(persistEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        request: REQUEST,
        inboxId: ITEM.inboxId,
        sourceUrl: ITEM.url,
        minimumPrice: 130000,
        maximumPrice: 138900,
      }),
    );
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

  it('routes a correlated PAD capture into its prepared result without standalone fallback', async () => {
    const correlatedUrl = `${ITEM.url}#vpiRun=shared-run-correlation&vpiAttempt=1`;
    const correlatedItem = { ...ITEM, url: correlatedUrl };
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(correlatedItem))
      .mockResolvedValueOnce(json({ ...correlatedItem, html: camry2024Html }))
      .mockResolvedValueOnce(json({ inboxId: ITEM.inboxId, status: 'Complete' }));
    const updateScrapeResult = vi.fn(
      async (_id: string, _fields: ScrapeResultUpdate) => undefined,
    );
    const persistEvidence = vi.fn(async () => undefined);
    const target = {
      runId: 'run-id',
      runCorrelationId: 'shared-run-correlation',
      sourceResultId: 'drive-result-id',
      requestedSourceCount: 2,
      attemptNumber: 1,
    };
    const resolvePreparedTarget = vi.fn().mockResolvedValue(target);
    const persistPreparedEvidence = vi.fn(async () => undefined);

    const result = await processNextScrapeInboxItem({
      requests: [REQUEST],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult,
      persistEvidence,
      resolvePreparedTarget,
      persistPreparedEvidence,
    });

    expect(result).toMatchObject({ status: 'complete', evidenceWarnings: [] });
    const fields = updateScrapeResult.mock.calls[0]![1] as ScrapeResultUpdate;
    expect(fields.scrapedSources).toBe(ITEM.url);
    expect(JSON.parse(fields.scrapedListings).url).toBe(ITEM.url);
    expect(resolvePreparedTarget).toHaveBeenCalledWith(REQUEST, {
      runCorrelationId: 'shared-run-correlation',
      attemptNumber: 1,
    });
    expect(persistPreparedEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: ITEM.url, request: REQUEST }),
      target,
    );
    expect(persistEvidence).not.toHaveBeenCalled();
  });

  it('matches one unique cross-source trim and preserves both trim labels', async () => {
    const dodgeRequest = {
      ...REQUEST,
      id: 'dodge-request',
      make: 'Dodge',
      model: 'Charger',
      trim: '3.6L SXT (Mid Option)',
      modelYear: 2021,
    };
    const dodgeItem = {
      ...ITEM,
      inboxId: 'de96747a6d13',
      url: 'https://www.drivearabia.com/carprices/uae/dodge/charger/2021/',
    };
    const dodgeHtml = `
      <title>Dodge Charger 2021 Price in UAE</title>
      <h2>Original Trim Prices</h2>
      <div>3.6 V6 SXT AED 109,900 - 110,000</div>
      <div>3.6 V6 GT AED 124,900 - 125,000</div>
      <div>3.6 V6 GTS AED 139,900 - 140,000</div>
      <div>5.7 V8 R/T AED 149,900 - 150,000</div>
      <div>Specs</div>
    `;
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(dodgeItem))
      .mockResolvedValueOnce(json({ ...dodgeItem, html: dodgeHtml }))
      .mockResolvedValueOnce(json({ inboxId: dodgeItem.inboxId, status: 'Complete' }));
    const updateScrapeResult = vi.fn(
      async (_id: string, _fields: ScrapeResultUpdate) => undefined,
    );
    const persistEvidence = vi.fn(async () => undefined);

    const result = await processNextScrapeInboxItem({
      requests: [dodgeRequest],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult,
      persistEvidence,
    });

    expect(result.status).toBe('complete');
    const fields = updateScrapeResult.mock.calls[0]![1];
    expect(fields).toMatchObject({
      scrapedMinPrice: 109900,
      scrapedMaxPrice: 110000,
    });
    expect(JSON.parse(fields.scrapedListings)).toMatchObject({
      trim: '3.6 V6 SXT',
      requestedTrim: '3.6L SXT (Mid Option)',
    });
    expect(persistEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        request: dodgeRequest,
        sourceTrim: '3.6 V6 SXT',
        minimumPrice: 109900,
        maximumPrice: 110000,
      }),
    );
  });

  it('retains an unresolved correlated capture for retry without standalone fallback', async () => {
    const correlatedItem = {
      ...ITEM,
      url: `${ITEM.url}#vpiRun=missing-run&vpiAttempt=1`,
    };
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(correlatedItem))
      .mockResolvedValueOnce(json({ ...correlatedItem, html: camry2024Html }));
    const persistEvidence = vi.fn(async () => undefined);
    const persistPreparedEvidence = vi.fn(async () => undefined);

    const result = await processNextScrapeInboxItem({
      requests: [REQUEST],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult: vi.fn(async () => undefined),
      persistEvidence,
      resolvePreparedTarget: vi.fn().mockResolvedValue(null),
      persistPreparedEvidence,
    });

    expect(result).toMatchObject({
      status: 'waiting',
      updatedRequestIds: [REQUEST.id],
      evidenceWarnings: [
        {
          requestId: REQUEST.id,
          error: 'No prepared DriveArabia target matches Run correlation missing-run',
        },
      ],
    });
    expect(persistPreparedEvidence).not.toHaveBeenCalled();
    expect(persistEvidence).not.toHaveBeenCalled();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('retains a correlated capture when its prepared evidence write warns', async () => {
    const correlatedItem = {
      ...ITEM,
      url: `${ITEM.url}#vpiRun=shared-run-correlation&vpiAttempt=1`,
    };
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(correlatedItem))
      .mockResolvedValueOnce(json({ ...correlatedItem, html: camry2024Html }));

    const result = await processNextScrapeInboxItem({
      requests: [REQUEST],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult: vi.fn(async () => undefined),
      resolvePreparedTarget: vi.fn().mockResolvedValue({
        runId: 'run-id',
        runCorrelationId: 'shared-run-correlation',
        sourceResultId: 'drive-result-id',
        requestedSourceCount: 2,
        attemptNumber: 1,
      }),
      persistPreparedEvidence: vi.fn(async () => 'HTTP 400 — Run resolution failed'),
    });

    expect(result).toMatchObject({
      status: 'waiting',
      updatedRequestIds: [REQUEST.id],
      evidenceWarnings: [
        { requestId: REQUEST.id, error: 'HTTP 400 — Run resolution failed' },
      ],
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
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
    ).resolves.toEqual({ status: 'empty', updatedRequestIds: [], evidenceWarnings: [] });
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
      persistEvidence: vi.fn(async () => undefined),
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

  it('writes the uniquely matched non-default V6 engine group from a PAD marker', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(ITEM))
      .mockResolvedValueOnce(json({ ...ITEM, html: multiTrimCamryHtml }))
      .mockResolvedValueOnce(json({ inboxId: ITEM.inboxId, status: 'Complete' }));
    const updateScrapeResult = vi.fn(async (_id: string, _fields: ScrapeResultUpdate) => undefined);

    await processNextScrapeInboxItem({
      requests: [REQUEST],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult,
      persistEvidence: vi.fn(async () => undefined),
    });

    expect(updateScrapeResult).toHaveBeenCalledWith(
      REQUEST.id,
      expect.objectContaining({
        bodyTypeValue: 44,
        fuelTypeValue: 1,
        transmissionValue: 1,
        driveTypeValue: 3,
        cylindersValue: 4,
        engineSizeValue: 3500,
        horsepowerValue: 298,
        doorsValue: 4,
      }),
    );
    const fields = updateScrapeResult.mock.calls[0]![1];
    expect(JSON.parse(fields.scrapedListings).specs).toMatchObject({
      trim: REQUEST.trim,
      horsepower: 298,
      torqueNm: 356,
    });
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
      persistEvidence: vi.fn(async () => undefined),
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
      persistEvidence: vi.fn(async () => undefined),
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
      persistEvidence: vi.fn(async () => undefined),
    });

    expect(summary).toEqual({
      processedItems: 1,
      completedItems: 1,
      failedItems: 0,
      waitingItems: 0,
      updatedRequestIds: [REQUEST.id],
      failures: [],
      evidenceWarnings: [],
    });
  });

  it('reports normalized evidence warnings without undoing a completed legacy write', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json(ITEM))
      .mockResolvedValueOnce(json({ ...ITEM, html: camry2024Html }))
      .mockResolvedValueOnce(json({ inboxId: ITEM.inboxId, status: 'Complete' }));
    const updateScrapeResult = vi.fn(async () => undefined);

    const result = await processNextScrapeInboxItem({
      requests: [REQUEST],
      functionBaseUrl: BASE,
      fetchFn,
      updateScrapeResult,
      persistEvidence: vi.fn(async () => 'Source Result write failed: rejected'),
    });

    expect(updateScrapeResult).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: 'complete',
      updatedRequestIds: [REQUEST.id],
      evidenceWarnings: [
        { requestId: REQUEST.id, error: 'Source Result write failed: rejected' },
      ],
    });
  });
});
