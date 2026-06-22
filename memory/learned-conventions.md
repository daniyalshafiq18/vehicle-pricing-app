---
name: learned-conventions
description: Recurring patterns, coding preferences, and lessons learned from development sessions
metadata:
  type: feedback
---

# Learned Conventions & Preferences

## Architecture Preferences
- **Data flow is strictly downward**: Components → Hooks → Repositories → IDataSource → Implementation. Never bypass layers.
- **IDataSource is the contract**: All data access goes through this interface. The Excel file is the current implementation, Dataverse is the planned future implementation.
- **Keep the project root clean**: No loose files — docs in `docs/`, config in root, code in `src/`. Screenshots, test artifacts, and duplicate exports should be removed.
- **Env vars are for future use only**: Currently the app reads Excel directly. Don't add env var consumption until a backend adapter is added.

## Code Quality
- **No console.log in production code** — the only console call is in `error-boundary.tsx` for error reporting
- **No unused dependencies** — `@types/jquery` was removed since jQuery isn't used
- **No dead path aliases** — `@services` was removed because the directory was empty
- **Strict TypeScript** — `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess` are enabled

## Documentation Standards
- All documentation goes in `docs/` — nothing at root except `README.md`
- `CLAUDE.md` for project architecture and workflow rules
- `MEMORY.md` with index linking to individual memory files in `memory/`
- When making changes, update `docs/CHANGELOG.md` with a dated entry

## Cleanup Rules
- Empty directories should be removed (e.g. `public/`, `src/services/`)
- Duplicate/stale exports should be cleaned up (e.g. `vehicle-pricing-intelligence-platform/`)
- Unused env files should be removed (`.env`, `.env.production` not consumed)
- `.prettierignore` should only have entries NOT already in `.gitignore`
- Build artifacts (`tsconfig.tsbuildinfo`, `.vite/`) belong in `.gitignore`
