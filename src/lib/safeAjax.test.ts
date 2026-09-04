import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeFetch } from './safeAjax';

describe('safeFetch cache bypass', () => {
  afterEach(() => {
    window.webapi = undefined;
    window.shell = undefined;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('disables jQuery caching for Power Pages safeAjax reads', async () => {
    const safeAjax = vi.fn((options) => {
      options.success({ value: [] }, 'success', {});
    });
    window.webapi = { safeAjax };

    await safeFetch({ url: '/_api/vpi_results', bypassCache: true });

    expect(safeAjax).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'GET',
        url: '/_api/vpi_results',
        cache: false,
      }),
    );
  });

  it('uses no-store for token-authenticated native fetch reads', async () => {
    window.shell = {
      getTokenDeferred: () => Promise.resolve('verification-token'),
    } as unknown as NonNullable<Window['shell']>;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ value: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await safeFetch({ url: '/_api/vpi_results', bypassCache: true });

    expect(fetchMock).toHaveBeenCalledWith(
      '/_api/vpi_results',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
      }),
    );
  });
});
