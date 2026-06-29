---
name: project-identity
description: Tech stack, architecture patterns, and data flow of the Vehicle Pricing Intelligence Platform
metadata:
  type: reference
---

# Project Identity & Structure

**Vehicle Pricing Intelligence Platform** — a React/TypeScript app for automotive valuation and analytics.

## Tech Stack
- React 18 + TypeScript 5 (strict mode)
- Vite 5 (dev: port 3000)
- Tailwind CSS 3 + ShadCN UI (Radix primitives)
- TanStack React Query 5 (server state)
- Zustand 5 (client/UI state)
- Recharts (dashboard charts)
- React Hook Form + Zod (wizard forms)
- Power Pages Web API (Dataverse CRUD via `/_api/`)
- Framer Motion (animations)
- Lucide React (icons)
- React Router v6
- Vitest + Testing Library (unit tests)
- Playwright (E2E tests)

## Architecture — Data Layer
```
Components → Hooks (React Query) → Repositories → IDataSource → DataverseDataSource
```

- `IDataSource` interface in `src/types/datasource.ts` — the contract for all data access
- `DataverseDataSource` in `src/data/dataverseDataSource.ts` — current implementation, reads from Microsoft Dataverse via Power Pages Web API (`/_api/`)
- `DataSourceContext.tsx` provides a singleton `getDataSource()` — swap the implementation here to migrate to a different backend
- **No UI component ever imports the data source directly** — full decoupling

## Path Aliases
All configured in both `tsconfig.json` and `vite.config.ts`: `@`, `@app`, `@components`, `@features`, `@layouts`, `@hooks`, `@repositories`, `@providers`, `@stores`, `@types`, `@utils`, `@data`, `@styles`

## Routes
- `/` — Landing page
- `/valuation` — 3-step wizard
- `/result` — Standalone valuation result
- `/admin` or `/admin/dashboard` — KPI cards + charts
- `/admin/vehicles` — Vehicle table
- `/admin/queries` — Inquiry management (filter, search, paginate, export)
- `/admin/settings` — Settings page

## State Management
- **React Query** owns all server data (vehicles, pricing, analytics, inquiries)
- **Zustand** owns UI state only (theme, sidebar, wizard form, modals)
- Zustand stores that mirror server data are updated passively via `useEffect` in hooks
