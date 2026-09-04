import { beforeEach, describe, expect, it, vi } from 'vitest';
import { safeFetch, safeFetchWithMeta } from './safeAjax';
import {
  fetchMissingVehicleRequestById,
  promoteApprovedMissingVehicle,
  saveMissingVehiclePricingDecision,
  updateMissingVehicleScrapeStatus,
} from './missingVehicleApi';
import {
  fetchVehicleScrapeRuns,
  fetchVehicleScrapeSourceResults,
} from './vehicleScrapeApi';
import type { VehicleScrapeRun, VehicleScrapeSourceResult } from '@types';

vi.mock('./safeAjax', () => ({
  safeFetch: vi.fn(),
  safeFetchWithMeta: vi.fn(),
}));

vi.mock('./vehicleScrapeApi', () => ({
  fetchVehicleScrapeRuns: vi.fn(),
  fetchVehicleScrapeSourceResults: vi.fn(),
}));

const MVR_ID = '11111111-1111-f011-a111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const PRICE_RESULT_ID = '33333333-3333-4333-8333-333333333333';
const SPEC_RESULT_ID = '44444444-4444-4444-8444-444444444444';
const VEHICLE_ID = '55555555-5555-4555-8555-555555555555';

function approvedMvrRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    vpi_missingvehiclerequestsid: MVR_ID,
    vpi_make: 'Dodge',
    vpi_model: 'Charger',
    vpi_trim: '3.6L SXT (Mid Option)',
    vpi_modelyear: 2021,
    vpi_approvedminprice: 47500,
    vpi_approvedmaxprice: 85000,
    vpi_pricingdecisionstatus: 5,
    'vpi_pricingdecisionstatus@OData.Community.Display.V1.FormattedValue': 'Approved',
    vpi_pricingmethod: 1,
    'vpi_pricingmethod@OData.Community.Display.V1.FormattedValue': 'Single Source',
    _vpi_reviewedscraperun_value: RUN_ID,
    _vpi_primarypriceresult_value: PRICE_RESULT_ID,
    _vpi_selectedspecificationresult_value: SPEC_RESULT_ID,
    ...overrides,
  };
}

describe('missingVehicleApi scrape lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('patches only the MVR scrape status', async () => {
    vi.mocked(safeFetch).mockResolvedValue(undefined);

    await updateMissingVehicleScrapeStatus(MVR_ID, 3);

    expect(safeFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ vpi_scrapestatus: 3 }),
      }),
    );
  });
});

const completedRun = {
  id: RUN_ID,
  overallStatus: 'Completed',
} as VehicleScrapeRun;

const primaryResult = {
  id: PRICE_RESULT_ID,
  processingStatus: 'Succeeded',
  minimumPrice: 47500,
  maximumPrice: 85000,
} as VehicleScrapeSourceResult;

const specificationResult = {
  id: SPEC_RESULT_ID,
  processingStatus: 'Succeeded',
  bodyType: 'Sedan',
  engineSize: 3600,
  cylinders: 6,
  fuelType: 'Petrol',
  transmissionType: 'Automatic',
  driveType: 'https://schema.org/RearWheelDriveConfiguration',
  horsepower: 300,
  doors: 4,
  category: 'NON-GCC',
} as VehicleScrapeSourceResult;

describe('missingVehicleApi pricing decision', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes approved prices, choices and case-sensitive evidence lookups', async () => {
    vi.mocked(safeFetch).mockResolvedValue(undefined);
    const decidedOn = new Date('2026-08-24T10:00:00.000Z');

    await saveMissingVehiclePricingDecision(MVR_ID, {
      approvedMinimumPrice: 50000,
      approvedMaximumPrice: 55000,
      pricingDecisionStatusValue: 5,
      pricingDecisionMethodValue: 2,
      reviewedScrapeRunId: RUN_ID,
      primaryPriceResultId: PRICE_RESULT_ID,
      selectedSpecificationResultId: SPEC_RESULT_ID,
      decisionNotes: 'Combined market and reference evidence.',
      decidedOn,
    });

    const request = vi.mocked(safeFetch).mock.calls[0]![0];
    expect(request.url).toBe(`/_api/vpi_missingvehiclerequestses(${MVR_ID})`);
    expect(JSON.parse(request.body as string)).toEqual({
      vpi_approvedminprice: 50000,
      vpi_approvedmaxprice: 55000,
      vpi_pricingdecisionstatus: 5,
      vpi_pricingmethod: 2,
      vpi_decisionnotes: 'Combined market and reference evidence.',
      vpi_decidedon: '2026-08-24T10:00:00.000Z',
      'vpi_ReviewedScrapeRun@odata.bind': `/vpi_vehiclescraperuns(${RUN_ID})`,
      'vpi_PrimaryPriceResult@odata.bind':
        `/vpi_vehiclescrapesourceresults(${PRICE_RESULT_ID})`,
      'vpi_SelectedSpecificationResult@odata.bind':
        `/vpi_vehiclescrapesourceresults(${SPEC_RESULT_ID})`,
    });
  });

  it('reads saved decision fields and lookup references', async () => {
    vi.mocked(safeFetchWithMeta).mockResolvedValue({
      data: {
        vpi_missingvehiclerequestsid: MVR_ID,
        vpi_make: 'Dodge',
        vpi_model: 'Charger',
        vpi_trim: '3.6L SXT',
        vpi_modelyear: 2021,
        vpi_approvedminprice: 50000,
        vpi_approvedmaxprice: 55000,
        vpi_pricingdecisionstatus: 5,
        'vpi_pricingdecisionstatus@OData.Community.Display.V1.FormattedValue': 'Approved',
        vpi_pricingmethod: 2,
        'vpi_pricingmethod@OData.Community.Display.V1.FormattedValue': 'Combined Sources',
        _vpi_reviewedscraperun_value: RUN_ID,
        _vpi_primarypriceresult_value: PRICE_RESULT_ID,
        _vpi_selectedspecificationresult_value: SPEC_RESULT_ID,
        vpi_decisionnotes: 'Combined market and reference evidence.',
        vpi_decidedon: '2026-08-24T10:00:00.000Z',
      },
      meta: { getHeader: () => null },
    });

    await expect(fetchMissingVehicleRequestById(MVR_ID)).resolves.toMatchObject({
      id: MVR_ID,
      approvedMinimumPrice: 50000,
      approvedMaximumPrice: 55000,
      pricingDecisionStatus: 'Approved',
      pricingDecisionMethod: 'Combined Sources',
      reviewedScrapeRunId: RUN_ID,
      primaryPriceResultId: PRICE_RESULT_ID,
      selectedSpecificationResultId: SPEC_RESULT_ID,
      decisionNotes: 'Combined market and reference evidence.',
      decidedOn: new Date('2026-08-24T10:00:00.000Z'),
    });
    const url = vi.mocked(safeFetchWithMeta).mock.calls[0]![0].url;
    expect(url).toContain('_vpi_reviewedscraperun_value');
    expect(url).not.toContain('vpi_ReviewedScrapeRun,');
  });

  it('rejects malformed related IDs before sending a PATCH', async () => {
    await expect(
      saveMissingVehiclePricingDecision(MVR_ID, {
        approvedMinimumPrice: 50000,
        approvedMaximumPrice: 55000,
        pricingDecisionStatusValue: 3,
        pricingDecisionMethodValue: 1,
        reviewedScrapeRunId: 'not-a-guid',
        primaryPriceResultId: PRICE_RESULT_ID,
        selectedSpecificationResultId: SPEC_RESULT_ID,
        decisionNotes: null,
        decidedOn: null,
      }),
    ).rejects.toThrow('Reviewed Scrape Run ID must be a valid GUID');
    expect(safeFetch).not.toHaveBeenCalled();
  });
});

describe('missingVehicleApi Vehicle Data promotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchVehicleScrapeRuns).mockResolvedValue([completedRun]);
    vi.mocked(fetchVehicleScrapeSourceResults).mockResolvedValue([
      primaryResult,
      specificationResult,
    ]);
  });

  it('creates Vehicle Data from approved prices and selected specification evidence', async () => {
    vi.mocked(safeFetchWithMeta)
      .mockResolvedValueOnce({
        data: approvedMvrRecord(),
        meta: { getHeader: () => null },
      })
      .mockResolvedValueOnce({
        data: {},
        meta: { getHeader: (name) => (name === 'entityid' ? VEHICLE_ID : null) },
      });
    vi.mocked(safeFetch)
      .mockResolvedValueOnce({ value: [] })
      .mockResolvedValueOnce(undefined);

    await expect(promoteApprovedMissingVehicle(MVR_ID)).resolves.toEqual({
      vehicleId: VEHICLE_ID,
      created: true,
    });

    const create = vi.mocked(safeFetchWithMeta).mock.calls[1]![0];
    expect(create.url).toBe('/_api/vpi_vehicledatas');
    expect(JSON.parse(create.body as string)).toMatchObject({
      vpi_name: 'Dodge Charger 3.6L SXT (Mid Option)',
      vpi_make: 'Dodge',
      vpi_model: 'Charger',
      vpi_year: '2021',
      vpi_spec: '3.6L SXT (Mid Option)',
      vpi_minprice: 47500,
      vpi_maxprice: 85000,
      vpi_bodytype: 44,
      vpi_cylinders: 6,
      vpi_powertraintype: 3,
      vpi_transmissiontronic: 3,
      vpi_drivetype: 4,
      vpi_enginesize: 3600,
      vpi_horsepower: 300,
      vpi_doors: 4,
      vpi_category: 2,
    });
    const link = vi.mocked(safeFetch).mock.calls[1]![0];
    expect(JSON.parse(link.body as string)).toEqual({
      vpi_status: 2,
      'vpi_MissingVehicle@odata.bind': `/vpi_vehicledatas(${VEHICLE_ID})`,
    });
  });

  it('rejects promotion unless the persisted decision is Approved', async () => {
    vi.mocked(safeFetchWithMeta).mockResolvedValueOnce({
      data: approvedMvrRecord({
        vpi_pricingdecisionstatus: 3,
        'vpi_pricingdecisionstatus@OData.Community.Display.V1.FormattedValue': 'Ready for Review',
      }),
      meta: { getHeader: () => null },
    });

    await expect(promoteApprovedMissingVehicle(MVR_ID)).rejects.toThrow(
      'Approve the pricing decision before promoting this vehicle',
    );
    expect(fetchVehicleScrapeRuns).not.toHaveBeenCalled();
  });

  it('returns an existing MVR vehicle link without creating another record', async () => {
    vi.mocked(safeFetchWithMeta).mockResolvedValueOnce({
      data: approvedMvrRecord({ _vpi_missingvehicle_value: VEHICLE_ID }),
      meta: { getHeader: () => null },
    });

    await expect(promoteApprovedMissingVehicle(MVR_ID)).resolves.toEqual({
      vehicleId: VEHICLE_ID,
      created: false,
    });
    expect(fetchVehicleScrapeRuns).not.toHaveBeenCalled();
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it('links one natural-key match instead of duplicating it after a partial failure', async () => {
    vi.mocked(safeFetchWithMeta).mockResolvedValueOnce({
      data: approvedMvrRecord(),
      meta: { getHeader: () => null },
    });
    vi.mocked(safeFetch)
      .mockResolvedValueOnce({ value: [{ vpi_vehicledataid: VEHICLE_ID }] })
      .mockResolvedValueOnce(undefined);

    await expect(promoteApprovedMissingVehicle(MVR_ID)).resolves.toEqual({
      vehicleId: VEHICLE_ID,
      created: false,
    });
    expect(safeFetchWithMeta).toHaveBeenCalledTimes(1);
    expect(vi.mocked(safeFetch).mock.calls[1]![0].method).toBe('PATCH');
  });
});
