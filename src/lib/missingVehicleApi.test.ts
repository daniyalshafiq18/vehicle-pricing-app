import { beforeEach, describe, expect, it, vi } from 'vitest';
import { safeFetch, safeFetchWithMeta } from './safeAjax';
import {
  fetchMissingVehicleRequestById,
  saveMissingVehiclePricingDecision,
} from './missingVehicleApi';

vi.mock('./safeAjax', () => ({
  safeFetch: vi.fn(),
  safeFetchWithMeta: vi.fn(),
}));

const MVR_ID = '11111111-1111-f011-a111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const PRICE_RESULT_ID = '33333333-3333-4333-8333-333333333333';
const SPEC_RESULT_ID = '44444444-4444-4444-8444-444444444444';

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
