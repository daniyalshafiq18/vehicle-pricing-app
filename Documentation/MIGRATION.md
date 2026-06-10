# Dataverse Migration Guide

## Overview

The platform is designed for seamless migration from Excel to Microsoft Dataverse (or any other backend). The key is the `IDataSource` interface — the entire application talks to data through this contract.

## Migration Steps

### 1. Implement DataverseDataSource

Create `src/data/dataverseDataSource.ts`:

```typescript
import type { IDataSource, Vehicle, VehiclePricing, ... } from '@types';

export class DataverseDataSource implements IDataSource {
  constructor(private connectionString: string) {}

  async initialize(): Promise<void> { /* Connect to Dataverse */ }
  isInitialized(): boolean { /* ... */ }

  // Implement ALL IDataSource methods using Dataverse API
  async getVehicles(filters?, sort?, page?, pageSize?) { /* ... */ }
  async getPricing(vehicleId: string) { /* ... */ }
  async getAnalytics() { /* ... */ }
  // ... etc
}
```

### 2. Swap the Provider

In `src/data/DataSourceContext.tsx`:

```typescript
// Before
const ds = new ExcelDataSource(filePath);

// After
const ds = new DataverseDataSource(connectionString);
```

Or use the VITE_DATA_SOURCE env variable for runtime switching.

### 3. That's It

No UI components, hooks, stores, or repositories change.
The interface guarantees full compatibility.

## Interface Contract

All methods in `IDataSource` return the same types regardless of implementation:

- `Vehicle`, `VehiclePricing`, `ValuationResult`
- `AnalyticsData`, `DashboardAnalytics`, `VehicleHierarchy`
- `VehicleFilters`, `VehicleSortOption`
- `Inquiry` — full CRUD: `saveInquiry`, `getInquiries`, `getInquiryById`, `updateInquiryStatus`

Migrating = new implementation of existing interface. See `src/types/datasource.ts` for the full contract.

## Testing

Test your Dataverse implementation by running the existing test suite:

```bash
npm test
```

If all tests pass with the new data source, the migration is complete.
