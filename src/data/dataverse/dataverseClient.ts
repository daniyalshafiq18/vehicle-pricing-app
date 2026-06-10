/**
 * Dataverse API client — a fetch-based wrapper around Power Pages safeAjax.
 *
 * Uses the shell.getTokenDeferred() pattern from Power Pages for automatic
 * __RequestVerificationToken injection. Provides typed GET/POST/PATCH/DELETE
 * methods with consistent error handling, optional retry, and request logging.
 *
 * Import this singleton rather than instantiating directly:
 *   import { dvClient } from './dataverseClient';
 *   const vehicles = await dvClient.get<ODataResponse<DataverseVehicleRow>>('/vpi_vehicledatas', { $select });
 */

import { DataverseAuthError, DataverseNetworkError, DataverseError, DataverseNotFoundError } from './errors';

// ─── Types ───────────────────────────────────────────────────────────

export interface DataverseRequestInit {
  /** OData query parameters as a flat record */
  params?: Record<string, string | undefined>;
  /** HTTP headers (__RequestVerificationToken is auto-injected) */
  headers?: Record<string, string>;
  /** Max retries on 429 / 5xx (default 0) */
  retries?: number;
  /** Request timeout in ms (default 30_000) */
  timeout?: number;
}

interface Deferred {
  done: (cb: (token: string) => void) => Deferred;
  fail: (cb: (...args: unknown[]) => void) => Deferred;
}

// ─── Logging ─────────────────────────────────────────────────────────

const LOG_PREFIX = '[DataverseClient]';

function log(method: string, url: string, status?: number): void {
  if (import.meta.env.DEV) {
    const msg = status ? `${method} ${url} → ${status}` : `${method} ${url}`;
    console.debug(`${LOG_PREFIX} ${msg}`);
  }
}

function logError(method: string, url: string, err: unknown): void {
  console.error(`${LOG_PREFIX} ${method} ${url} failed`, err);
}

// ─── Service Locator Helpers ─────────────────────────────────────────

/**
 * Retrieve the Power Pages auth token.
 * In Power Pages, shell.getTokenDeferred() returns a Deferred object.
 * For local dev without the shell, falls back to the api_token setting.
 */
async function getToken(): Promise<string> {
  // Runtime check: Power Pages shell provides getTokenDeferred
  const win = window as unknown as { shell?: { getTokenDeferred?: () => Deferred } };
  const getTokenDeferred = win.shell?.getTokenDeferred;
  if (getTokenDeferred) {
    return new Promise<string>((resolve, reject) => {
      getTokenDeferred()
        .done((token: string) => resolve(token))
        .fail((..._args: unknown[]) => reject(new DataverseAuthError()));
    });
  }

  // Fallback for local dev: read from a meta tag or env
  const meta = document.querySelector<HTMLMetaElement>('meta[name="api-token"]');
  if (meta?.content) return meta.content;

  // If running without Power Pages shell (e.g., dev server / preview), throw
  // so the caller can handle gracefully rather than sending an unauthenticated request.
  throw new DataverseAuthError('No Power Pages shell detected and no api-token meta tag found.');
}

/**
 * Get the Dataverse base URL from the environment or a meta tag.
 * In production this is the Power Pages site URL.
 */
function getBaseUrl(): string {
  // Try meta tag first (set by Power Pages or injected at build time)
  const meta = document.querySelector<HTMLMetaElement>('meta[name="dataverse-url"]');
  if (meta?.content) return meta.content.replace(/\/+$/, '');

  // Fallback to env var
  const envUrl = import.meta.env.VITE_DATAVERSE_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  // Last resort — relative to the current origin (Power Pages serves from same origin)
  return window.location.origin;
}

// ─── URL helpers ────────────────────────────────────────────────────

function buildUrl(base: string, path: string, params?: Record<string, string | undefined>): string {
  const url = new URL(`${base}/_api/${path.replace(/^\//, '')}`, window.location.origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

// ─── Retry helper ────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(1000 * 2 ** attempt, 10_000);
      await new Promise((r) => setTimeout(r, backoff));
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Only retry on 429 (rate-limit) and 5xx (server errors)
      if (err instanceof DataverseError && err.statusCode) {
        if (err.statusCode === 429 || (err.statusCode >= 500 && err.statusCode < 600)) {
          logError('RETRY', `attempt ${attempt + 1}/${retries + 1}`, err);
          continue;
        }
      }
      throw err;
    }
  }
  throw lastError;
}

// ─── Core request function ───────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  options: DataverseRequestInit = {},
  body?: BodyInit | null,
): Promise<T> {
  const { params, headers: extraHeaders, retries = 0, timeout = 30_000 } = options;

  const baseUrl = getBaseUrl();
  const url = buildUrl(baseUrl, path, params);
  const token = await getToken();

  log(method, url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await withRetry(async () => {
      const res = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
          ODataMaxVersion: '4.0',
          ODataVersion: '4.0',
          __RequestVerificationToken: token,
          ...extraHeaders,
        },
        ...(body ? { body } : {}),
        signal: controller.signal,
      });

      log(method, url, res.status);

      // Handle 204 No Content (successful DELETE, some PATCH responses)
      if (res.status === 204) {
        return undefined as unknown as T;
      }

      // Handle 404
      if (res.status === 404) {
        throw new DataverseNotFoundError(path);
      }

      // Handle 401
      if (res.status === 401) {
        throw new DataverseAuthError();
      }

      // Handle other errors
      if (!res.ok) {
        let detail: unknown;
        try {
          detail = await res.json();
        } catch {
          detail = await res.text().catch(() => undefined);
        }
        throw new DataverseError(
          `Dataverse returned ${res.status} for ${method} ${path}`,
          res.status,
          detail,
        );
      }

      // Parse JSON response
      const text = await res.text();
      if (!text) return undefined as unknown as T;
      return JSON.parse(text) as T;
    }, retries);

    return response;
  } catch (err) {
    // Wrap abort errors as network errors
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new DataverseNetworkError(`Request timed out after ${timeout}ms`);
    }
    logError(method, url, err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ──────────────────────────────────────────────────────

export const dvClient = {
  get<T>(path: string, params?: Record<string, string | undefined>, options?: Partial<DataverseRequestInit>): Promise<T> {
    return request<T>('GET', path, { ...options, params });
  },

  post<T>(path: string, body: unknown, options?: Partial<DataverseRequestInit>): Promise<T> {
    return request<T>('POST', path, options, JSON.stringify(body));
  },

  patch<T = void>(path: string, body: unknown, options?: Partial<DataverseRequestInit>): Promise<T> {
    return request<T>('PATCH', path, options, JSON.stringify(body));
  },

  delete<T = void>(path: string, options?: Partial<DataverseRequestInit>): Promise<T> {
    return request<T>('DELETE', path, options);
  },
};
