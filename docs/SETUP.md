# Setup Guide

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

## Configuration

### Environment

The file `.env.example` documents available environment variables (all reserved for future use — Dataverse is the hard-coded data source):

```bash
VITE_APP_TITLE=Vehicle Pricing Intelligence Platform
VITE_APP_VERSION=1.0.0
VITE_CACHE_TTL=3600000
VITE_MAX_VEHICLE_DISPLAY=100
```

### Data Source

The app reads vehicle data from **Microsoft Dataverse** via the Power Pages Web API (`/_api/`). No local data files are needed. The app must run inside a Power Pages site context for CSRF token resolution (`shell.getTokenDeferred()`).

## Production Build

```bash
npm run build
npm run preview
```

## Power Pages Publish

```bash
npm run publish
```

The verified publish sequence uses the SPA-specific commands end to end: `download-code-site --overwrite`, `npm run build`, then `upload-code-site --compiledPath .\dist`. The site download creates or refreshes `vehicle-pricing-intelligence-platform/.powerpages-site`, whose `website.yml` identifies the existing site and prevents PAC from creating a duplicate. The normal build produces only `dist/`; it does not rewrite downloaded portal configuration. If the local site folder has previously been contaminated by a classic `pac pages download --modelVersion Enhanced`, replace it with a fresh `download-code-site` copy before uploading.

## Troubleshooting

### Type errors
Run `npm run typecheck` to identify issues.

### Port conflict
Edit `vite.config.ts` to change the server port.

### CSRF / Web API errors
If API calls fail, ensure the app is running within a Power Pages site that has the correct Dataverse entities (`vpi_vehicledatas`, `vpi_vehicleinquiries`) deployed.
