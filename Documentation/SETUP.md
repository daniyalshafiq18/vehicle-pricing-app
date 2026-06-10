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

Copy `.env.example` to `.env` and adjust:

```bash
VITE_APP_TITLE=Vehicle Pricing Intelligence Platform
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENABLE_MOCK_DATA=false
VITE_DATA_SOURCE=excel
VITE_CACHE_TTL=3600000
VITE_MAX_VEHICLE_DISPLAY=100
```

> These variables are reserved for future backend integration. The app currently reads the Excel file directly and does not consume these env vars in `src/`.

### Excel Data

Place your Excel file in the project root as `UAE_Vehicle_Data.xlsx`.

Expected columns:
- Year, Make, Model, Spec
- Engine Size, Horsepower, Cylinders
- Doors, Seats, Transmission
- Body Type, Drive Type, Vehicle Type
- Category, Powertrain
- Min Price, Avg Price, Max Price
- Description

## Production Build

```bash
npm run build
npm run preview
```

## Troubleshooting

### Excel file not loading
Ensure the file is named `UAE_Vehicle_Data.xlsx` and placed in the project root.
The app has no mock data fallback — the Excel file is required.

### Type errors
Run `npm run typecheck` to identify issues.

### Port conflict
Edit `vite.config.ts` to change the server port.
