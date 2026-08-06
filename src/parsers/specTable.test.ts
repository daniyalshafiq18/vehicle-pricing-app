import { describe, it, expect } from 'vitest';
import { extractCylinders } from './specTable';
// Trimmed from the raw Azure-probe capture of the Wrangler detail page (2026-08-06).
import detailSpecHtml from '../../tests/fixtures/wrangler-detail-spec-section.html?raw';

describe('extractCylinders', () => {
  it('reads cylinders from the Number of Cylinders spec tile', () => {
    expect(extractCylinders(detailSpecHtml)).toBe('6');
  });

  it('returns undefined when the tile is missing', () => {
    expect(extractCylinders('<html><body><p>no spec grid</p></body></html>')).toBeUndefined();
  });

  it('never throws on empty / missing input', () => {
    expect(extractCylinders('')).toBeUndefined();
    expect(extractCylinders(null)).toBeUndefined();
    expect(extractCylinders(undefined)).toBeUndefined();
  });
});