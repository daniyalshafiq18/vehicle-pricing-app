import { describe, it, expect } from 'vitest';
import { extractJsonLdBlocks } from './jsonLdFromHtml';

const WRAPPER = `
<html><head>
<script type="application/ld+json">{"@type":"Car","name":"Used Jeep Wrangler"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"ItemList","numberOfItems":3}</script>
</head></html>
`;

describe('extractJsonLdBlocks', () => {
  it('extracts every parseable JSON-LD block', () => {
    const blocks = extractJsonLdBlocks(WRAPPER);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ '@type': 'Car' });
    expect(blocks[1]).toMatchObject({ '@context': 'https://schema.org', numberOfItems: 3 });
  });

  it('skips malformed blocks without throwing', () => {
    expect(
      extractJsonLdBlocks('<script type="application/ld+json">{broken</script>'),
    ).toEqual([]);
  });

  it('returns [] for empty / missing input', () => {
    expect(extractJsonLdBlocks('')).toEqual([]);
    expect(extractJsonLdBlocks(null)).toEqual([]);
    expect(extractJsonLdBlocks(undefined)).toEqual([]);
  });
});