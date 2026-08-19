import { beforeEach, describe, expect, it, vi } from 'vitest';
import { safeFetch, safeFetchWithMeta } from './safeAjax';
import {
  createVehicleScrapeRun,
  createVehicleScrapeSourceResult,
  fetchVehicleScrapeRuns,
  fetchVehicleScrapeSourceResults,
  updateVehicleScrapeRun,
  updateVehicleScrapeSourceResult,
} from './vehicleScrapeApi';

vi.mock('./safeAjax', () => ({
  safeFetch: vi.fn(),
  safeFetchWithMeta: vi.fn(),
}));

// Dataverse sequential GUIDs are GUID-shaped but do not necessarily encode an
// RFC UUID version/variant. Live MVR IDs can contain segments such as `f011`.
const MVR_ID = '11111111-1111-f011-a111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const RESULT_ID = '33333333-3333-4333-8333-333333333333';

const mockedSafeFetch = vi.mocked(safeFetch);
const mockedSafeFetchWithMeta = vi.mocked(safeFetchWithMeta);

function responseWithEntityId(id: string) {
  return {
    data: {},
    meta: {
      getHeader: (name: string) => (name.toLowerCase() === 'entityid' ? id : null),
    },
  };
}

describe('vehicleScrapeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a run with the case-sensitive MVR lookup binding', async () => {
    mockedSafeFetchWithMeta.mockResolvedValue(responseWithEntityId(RUN_ID));

    await expect(
      createVehicleScrapeRun({
        name: 'Toyota Camry 2024 scrape',
        correlationId: 'run-correlation-1',
        missingVehicleRequestId: MVR_ID,
        requestedSourceCount: 2,
      }),
    ).resolves.toBe(RUN_ID);

    const request = mockedSafeFetchWithMeta.mock.calls[0]![0];
    expect(request.url).toBe('/_api/vpi_vehiclescraperuns');
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body as string)).toEqual({
      vpi_name: 'Toyota Camry 2024 scrape',
      vpi_correlationkey: 'run-correlation-1',
      vpi_overallstatus: 1,
      vpi_triggertype: 1,
      'vpi_MissingVehicleRequest@odata.bind':
        `/vpi_missingvehiclerequestses(${MVR_ID})`,
      vpi_requestedsourcecount: 2,
    });
  });

  it('creates a source result with explicit attempt 1 and its run binding', async () => {
    mockedSafeFetchWithMeta.mockResolvedValue(responseWithEntityId(RESULT_ID));

    await expect(
      createVehicleScrapeSourceResult({
        name: 'DriveArabia result',
        resultCorrelationId: 'result-correlation-1',
        scrapeRunId: RUN_ID,
        sourceValue: 2,
        transportValue: 3,
        priceTypeValue: 2,
        minimumPrice: 111900,
        maximumPrice: 112000,
      }),
    ).resolves.toBe(RESULT_ID);

    const request = mockedSafeFetchWithMeta.mock.calls[0]![0];
    expect(request.url).toBe('/_api/vpi_vehiclescrapesourceresults');
    expect(JSON.parse(request.body as string)).toMatchObject({
      vpi_name: 'DriveArabia result',
      vpi_resultcorrelationkey: 'result-correlation-1',
      'vpi_ScrapeRun@odata.bind': `/vpi_vehiclescraperuns(${RUN_ID})`,
      vpi_attemptnumber: 1,
      vpi_source: 2,
      vpi_transport: 3,
      vpi_processingstatus: 1,
      vpi_pricetype: 2,
      vpi_minprice: 111900,
      vpi_maxprice: 112000,
    });
  });

  it('reads runs and source results with labels and lookup IDs preserved', async () => {
    mockedSafeFetch
      .mockResolvedValueOnce({
        value: [
          {
            vpi_vehiclescraperunid: RUN_ID,
            vpi_name: 'Toyota Camry 2024 scrape',
            vpi_correlationkey: 'run-correlation-1',
            vpi_overallstatus: 4,
            'vpi_overallstatus@OData.Community.Display.V1.FormattedValue': 'Completed',
            vpi_triggertype: 1,
            _vpi_missingvehiclerequest_value: MVR_ID,
            vpi_successfulsourcecount: 2,
          },
        ],
      })
      .mockResolvedValueOnce({
        value: [
          {
            vpi_vehiclescrapesourceresultid: RESULT_ID,
            vpi_name: 'DriveArabia result',
            vpi_resultcorrelationkey: 'result-correlation-1',
            _vpi_scraperun_value: RUN_ID,
            vpi_attemptnumber: 1,
            vpi_source: 2,
            vpi_transport: 3,
            vpi_processingstatus: 3,
            vpi_pricetype: 2,
            vpi_minprice: 111900,
            vpi_maxprice: 112000,
          },
        ],
      });

    const runs = await fetchVehicleScrapeRuns(MVR_ID);
    const results = await fetchVehicleScrapeSourceResults(RUN_ID);

    expect(runs[0]).toMatchObject({
      id: RUN_ID,
      missingVehicleRequestId: MVR_ID,
      overallStatus: 'Completed',
      successfulSourceCount: 2,
    });
    expect(results[0]).toMatchObject({
      id: RESULT_ID,
      scrapeRunId: RUN_ID,
      source: 'DriveArabia',
      transport: 'Power Automate Desktop',
      processingStatus: 'Succeeded',
      priceType: 'Original Reference',
      minimumPrice: 111900,
      maximumPrice: 112000,
    });
    expect(mockedSafeFetch.mock.calls[0]![0].url).not.toContain('vpi_MissingVehicleRequest,');
    expect(mockedSafeFetch.mock.calls[1]![0].url).not.toContain('vpi_ScrapeRun,');
  });

  it('patches only supplied values and rejects malformed IDs before a request', async () => {
    mockedSafeFetch.mockResolvedValue(undefined);

    await updateVehicleScrapeRun(RUN_ID, {
      overallStatusValue: 4,
      successfulSourceCount: 2,
      errorSummary: null,
    });
    await updateVehicleScrapeSourceResult(RESULT_ID, {
      processingStatusValue: 3,
      completedOn: new Date('2026-08-19T10:00:00.000Z'),
    });

    expect(JSON.parse(mockedSafeFetch.mock.calls[0]![0].body as string)).toEqual({
      vpi_overallstatus: 4,
      vpi_successfulsourcecount: 2,
      vpi_errorsummary: null,
    });
    expect(JSON.parse(mockedSafeFetch.mock.calls[1]![0].body as string)).toEqual({
      vpi_processingstatus: 3,
      vpi_completedon: '2026-08-19T10:00:00.000Z',
    });

    await expect(fetchVehicleScrapeRuns('not-a-guid')).rejects.toThrow(
      'Missing Vehicle Request ID must be a valid GUID',
    );
    expect(mockedSafeFetch).toHaveBeenCalledTimes(2);
  });
});
