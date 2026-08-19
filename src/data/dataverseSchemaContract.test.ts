import { describe, expect, it } from 'vitest';
import {
  ENTITIES,
  MISSING_VEHICLE_DECISION_FIELDS,
  VEHICLE_SCRAPE_RUN_FIELDS,
  VEHICLE_SCRAPE_SOURCE_RESULT_FIELDS,
} from './dataverseConfig';
import {
  MISSING_VEHICLE_PRICING_DECISION_METHOD,
  MISSING_VEHICLE_PRICING_DECISION_STATUS,
  VEHICLE_SCRAPE_PRICE_TYPE,
  VEHICLE_SCRAPE_PROCESSING_STATUS,
  VEHICLE_SCRAPE_RUN_STATUS,
  VEHICLE_SCRAPE_SOURCE,
  VEHICLE_SCRAPE_TRANSPORT,
  VEHICLE_SCRAPE_TRIGGER_TYPE,
} from './dataverseOptionSets';

describe('multi-source Dataverse schema contract', () => {
  it('uses the entity set names confirmed in Dataverse', () => {
    expect(ENTITIES.VEHICLE_SCRAPE_RUN).toBe('vpi_vehiclescraperuns');
    expect(ENTITIES.VEHICLE_SCRAPE_SOURCE_RESULT).toBe(
      'vpi_vehiclescrapesourceresults',
    );
  });

  it('preserves the case-sensitive lookup schema names', () => {
    expect(VEHICLE_SCRAPE_RUN_FIELDS.MISSING_VEHICLE_REQUEST_LOOKUP).toBe(
      'vpi_MissingVehicleRequest',
    );
    expect(VEHICLE_SCRAPE_SOURCE_RESULT_FIELDS.SCRAPE_RUN_LOOKUP).toBe('vpi_ScrapeRun');
    expect(MISSING_VEHICLE_DECISION_FIELDS.REVIEWED_SCRAPE_RUN_LOOKUP).toBe(
      'vpi_ReviewedScrapeRun',
    );
    expect(MISSING_VEHICLE_DECISION_FIELDS.PRIMARY_PRICE_RESULT_LOOKUP).toBe(
      'vpi_PrimaryPriceResult',
    );
    expect(MISSING_VEHICLE_DECISION_FIELDS.SELECTED_SPECIFICATION_RESULT_LOOKUP).toBe(
      'vpi_SelectedSpecificationResult',
    );
  });

  it('pins every confirmed choice value', () => {
    expect(VEHICLE_SCRAPE_RUN_STATUS).toEqual({
      Queued: 1,
      Running: 2,
      'Partial Success': 3,
      Completed: 4,
      Failed: 5,
      Cancelled: 6,
    });
    expect(VEHICLE_SCRAPE_TRIGGER_TYPE).toEqual({
      'Single Request': 1,
      Bulk: 2,
      Retry: 3,
      Automatic: 4,
    });
    expect(VEHICLE_SCRAPE_SOURCE).toEqual({
      YallaMotor: 1,
      DriveArabia: 2,
      Dubizzle: 3,
      Other: 4,
    });
    expect(VEHICLE_SCRAPE_TRANSPORT).toEqual({
      'Azure Function': 1,
      'Power Automate Cloud': 2,
      'Power Automate Desktop': 3,
      Manual: 4,
      Other: 5,
    });
    expect(VEHICLE_SCRAPE_PROCESSING_STATUS).toEqual({
      Queued: 1,
      Running: 2,
      Succeeded: 3,
      'No Data': 4,
      Blocked: 5,
      Failed: 6,
      Skipped: 7,
    });
    expect(VEHICLE_SCRAPE_PRICE_TYPE).toEqual({
      'Used Market Asking': 1,
      'Original Reference': 2,
      'Dealer MSRP': 3,
      'Other or Unknown': 4,
    });
    expect(MISSING_VEHICLE_PRICING_DECISION_STATUS).toEqual({
      'Awaiting Scrapes': 1,
      Scraping: 2,
      'Ready for Review': 3,
      'Needs Attention': 4,
      Approved: 5,
      Rejected: 6,
    });
    expect(MISSING_VEHICLE_PRICING_DECISION_METHOD).toEqual({
      'Single Source': 1,
      'Combined Sources': 2,
      'Manual Override': 3,
    });
  });
});
