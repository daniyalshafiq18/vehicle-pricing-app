# Dataverse Architecture Guide

## Overview

The platform uses Microsoft Dataverse as its data source via the Power Pages Web API (`/_api/`). The `IDataSource` interface decouples the UI from the backend — the entire application talks to data through this contract, enabling future backend swaps without UI changes.

**Phase-2 is implemented.** `DataverseDataSource` lives at `src/data/dataverseDataSource.ts` with full `IDataSource` coverage. The `ExcelDataSource` predecessor has been fully removed.

## Architecture

```
safeFetch (CSRF token via shell.getTokenDeferred())
    ↓
DataverseDataSource
    ├── Paginated init: follows @odata.nextLink to load all vpi_vehicledatas
    ├── In-memory cache: analytics + hierarchy computed client-side
    └── Inquiry CRUD: POST/PATCH via Web API (persistent)
```

### Key Files

| File | Purpose |
|---|---|
| `src/data/dataverseConfig.ts` | API base, entity names, field constants |
| `src/data/dataverseOptionSets.ts` | Bidirectional choice-field maps (int ↔ label) |
| `src/data/dataverseDataSource.ts` | Full `IDataSource` implementation |
| `src/lib/webapi.ts` | CSRF-authenticated fetch wrapper |
| `docs/dataverse-schema.md` | Dataverse table/field/option-set reference |

## Data Flow

| Layer | Implementation |
|---|---|
| Init | Paginates Web API (`/_api/vpi_vehicledatas`), follows `@odata.nextLink` |
| Vehicle data | Cached in-memory array after init |
| Analytics | Computed from cache (same algorithm) |
| Inquiries | POST/PATCH to `vpi_vehicleinquiries` + `contacts` (persistent) |

## Dataverse Tables Used

| Entity | Logical Name | Operations |
|---|---|---|
| Vehicle Data | `vpi_vehicledatas` | GET (paginated on init, single-record fallback) |
| Contact | `contacts` | GET (find by email), POST (create) |
| Vehicle Inquiry | `vpi_vehicleinquiries` | POST (create), PATCH (status update), GET (list by descending date) |

## Interface Contract

All methods in `IDataSource` return the same types regardless of implementation. See `src/types/datasource.ts` for the full contract.

## Testing

```bash
npm test
```
