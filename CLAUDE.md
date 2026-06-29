# CLAUDE.md — Vehicle Pricing Intelligence Platform

## Project Overview
A React/TypeScript app for automotive valuation and analytics. Users complete a 3-step valuation wizard. Administrators manage inquiries and view analytics. Data is sourced from Microsoft Dataverse via the Power Pages Web API.

## 🚨 Auto-Update Rules — READ BEFORE MAKING CHANGES

Every time you make a change, you MUST update the relevant documentation **in the same session**. Do not skip this step.

### What to update

| If you change... | Update these files |
|---|---|
| Project structure, add/remove files/dirs | `CLAUDE.md` (Project Structure section) |
| Architecture, data flow, patterns | `docs/context.md`, `docs/DEVELOPMENT.md` |
| Setup steps, dependencies, commands | `docs/SETUP.md`, `CLAUDE.md` (Commands section) |
| Any new file, feature, or fix | `docs/CHANGELOG.md` — add dated entry |
| A recurring bug pattern or lesson learned | `memory/learned-conventions.md` |
| Remove or add significant code | `memory/cleanup-history.md` |
| Path aliases, tsconfig, vite config | `CLAUDE.md` (Path Aliases section) |
| Deprecate or change a convention | `memory/learned-conventions.md` |

### Changelog format
Every change gets a dated entry in `docs/CHANGELOG.md`:
```markdown
## YYYY-MM-DD

### Category
- Description of what changed and why
```

### Memory files — only record what matters
- `memory/learned-conventions.md` — save non-obvious patterns, bugs you fixed, preferences the user stated
- `memory/cleanup-history.md` — record when you remove things (with rationale)
- `memory/project-identity.md` — update if tech stack or architecture shifts

## Tech Stack
- **Framework:** React 18, TypeScript 5
- **Build:** Vite 5
- **Styling:** Tailwind CSS 3 + ShadCN UI (Radix primitives)
- **Server State:** TanStack React Query 5
- **Client State:** Zustand 5
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Data Source:** Microsoft Dataverse (Power Pages Web API)
- **Icons:** Lucide React
- **Routing:** React Router v6
- **Testing:** Vitest + Testing Library + Playwright

## Architecture

### Layer Diagram
```
Components → Hooks (React Query) → Repositories → IDataSource → DataverseDataSource
```

- Data flows **downward only**. Components import hooks → hooks import repositories → repositories call `getDataSource()` singleton.
- No component ever imports `DataverseDataSource` directly.
- `IDataSource` interface lives in `src/types/datasource.ts`.

### Key Patterns
- **Data Source DI:** `getDataSource()` in `src/data/DataSourceContext.tsx` is a singleton service locator returning the `DataverseDataSource` singleton (Power Pages Web API).
- **State Separation:** React Query owns all server data. Zustand stores only hold UI/client state (theme, wizard form, sidebar, modals).
- **Error Handling:** Every page follows: Loading → skeleton, Error → retry/refresh, Empty → empty-state, Data → render.
- **Every mutation** uses `react-hot-toast` for success/error feedback.

## Path Aliases
All paths use `@` prefix, configured in both `tsconfig.json` and `vite.config.ts`:
`@`, `@app`, `@components`, `@features`, `@layouts`, `@hooks`, `@repositories`, `@providers`, `@stores`, `@types`, `@utils`, `@data`, `@lib`, `@styles`

## Commands
| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (watch mode) |
| `npm run test:run` | Vitest single run |
| `npm run test:coverage` | Vitest with coverage |
| `npm run test:e2e` | Playwright E2E |

## Project Structure
```
src/
├── app/            # App entry + router
├── components/ui/  # Reusable UI primitives (Button, Dialog, Card, etc.)
├── features/
│   ├── landing/    # Landing page
│   ├── valuation/  # 3-step wizard (Personal Info → Vehicle → Result)
│   └── admin/      # Dashboard, Vehicles, Queries, Settings
├── layouts/        # MainLayout (public), AdminLayout (sidebar)
├── hooks/          # React Query hooks
├── repositories/   # Data access wrappers
├── providers/      # Context providers
├── stores/         # Zustand stores
├── types/          # TypeScript interfaces
├── utils/          # Helpers (formatters, validators, memoize)
├── data/           # Data source context + DataverseDataSource + config
├── lib/            # Utility modules (safeAjax.ts — CSRF-authenticated fetch wrapper + vehicleApi/contactApi/inquiryApi)
├── styles/         # globals.css
└── testing/        # Vitest setup
```

## Coding Standards
- **TypeScript:** Strict mode enabled (`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`)
- **Imports:** Use `@` path aliases, never relative imports beyond parent
- **Components:** Barrel exports via `index.ts` in every module
- **Naming:** PascalCase for components, camelCase for hooks/utils, kebab-case for files
- **Dark mode:** Tailwind `class` strategy, CSS variables in `globals.css`
- **Admin Modal:** Use `hideCloseButton` + `title=""` on Dialog for custom header modals
- **Sidebar:** React state (not CSS group-hover) for collapse/expand
- **React Query:** 5 min staleTime for vehicles, 30s refetch for inquiries

## Documentation
All docs live in `docs/`:
- `SETUP.md` — environment setup
- `DEVELOPMENT.md` — architecture, patterns, conventions
- `MIGRATION.md` — guide for migrating to Dataverse
- `context.md` — full project context reference
- `CHANGELOG.md` — change log
- `dataverse-schema.md` — Dataverse schema reference

## Environment Variables
Defined in `.env.example`. All vars are reserved for future configuration — Dataverse is the hard-coded default.
