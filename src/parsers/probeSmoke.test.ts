/**
 * probeSmoke.test.ts — OPTIONAL live integration test against the deployed
 * Azure scraper transport.
 *
 * Skipped (via `test.skipIf`) unless the Azure probe has downloaded a fixture
 * to `tests/fixtures/azure-probe.json` (run `scripts/probe-yallamotor.mjs`
 * first). When present, it feeds that machine-extracted JSON-LD through the
 * REAL parsers + normalize and prints the mapped Dataverse integers, so you
 * can compare the Azure transport's extraction against the Power Automate
 * Flow 3 result side by side.
 *
 * Run:  node scripts/probe-yallamotor.mjs <fnUrl> "<yallamotor-url>"
 *       npx vitest run src/parsers/probeSmoke.test.ts
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'vitest';

import { parseDetailJsonLd, parseSearchJsonLd } from './yallaJsonLd';
import { normalizeToDataverse } from './normalize';

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/azure-probe.json');
const hasFixture = existsSync(FIXTURE);

test.skipIf(!hasFixture)('azure probe fixture → parsers → Dataverse integers', () => {
  const blocks = JSON.parse(readFileSync(FIXTURE, 'utf8')) as unknown[];

  const detail = parseDetailJsonLd(blocks);
  const mapped = normalizeToDataverse(detail);
  const search = parseSearchJsonLd(blocks);

  // eslint-disable-next-line no-console
  console.log('DETAIL (label-level):', JSON.stringify(detail, null, 2));
  // eslint-disable-next-line no-console
  console.log('DATAVERSE (integers):', JSON.stringify(mapped, null, 2));
  // eslint-disable-next-line no-console
  console.log('SEARCH:', JSON.stringify(search, null, 2));
});