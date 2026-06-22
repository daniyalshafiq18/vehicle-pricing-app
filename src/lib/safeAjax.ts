/**
 * Power Pages Web API wrapper.
 *
 * Primary path: uses the portal's built-in `webapi.safeAjax` which handles CSRF
 * token acquisition and injection automatically.
 *
 * Fallback: obtains the CSRF token via `shell.getTokenDeferred()` and calls
 * native `fetch()` — the request always appears in the Network tab.
 *
 * @see ./vehicleApi.ts — full request/response reference
 */

declare global {
  interface Window {
    webapi?: {
      safeAjax: (options: SafeAjaxOptions) => void;
    };
    shell?: {
      getTokenDeferred: () => TokenDeferredLike;
    };
  }
}

interface TokenDeferredLike {
  done: (cb: (token: string) => void) => { fail: (cb: (error: unknown) => void) => void };
  fail: (cb: (error: unknown) => void) => void;
}

interface SafeAjaxOptions {
  type: string;
  url: string;
  contentType?: string;
  headers?: Record<string, string>;
  data?: unknown;
  success: (data: unknown, textStatus: string, xhr: unknown) => void;
  error: (xhr: unknown, textStatus: string, errorThrown: string) => void;
}

export interface SafeFetchOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
}

/**
 * Acquire CSRF token from Power Pages shell API.
 *
 * `getTokenDeferred()` may return a native Promise on current portals, or a
 * jQuery Deferred (with .done/.fail) on older builds.  This normalises both.
 */
async function getToken(shell: NonNullable<Window['shell']>): Promise<string> {
  const result = shell.getTokenDeferred();

  // Native Promise or thenable
  if (typeof (result as unknown as Promise<string>).then === 'function') {
    return (result as unknown as Promise<string>).then(
      (t) => t,
      () => { throw new Error('Token acquisition failed'); },
    );
  }

  // jQuery Deferred style (older portals)
  const deferred = result as TokenDeferredLike;
  if (typeof deferred.done === 'function') {
    return new Promise<string>((resolve, reject) => {
      try {
        deferred.done((t: string) => resolve(t)).fail(() => reject(new Error('Token acquisition failed')));
      } catch (e) { reject(e); }
    });
  }

  throw new Error('getTokenDeferred returned an unexpected type');
}

/**
 * Fetch JSON from the Power Pages Web API.
 *
 * Primary path: uses the portal's built-in `webapi.safeAjax` which handles CSRF
 * tokens and authentication automatically.
 *
 * Fallback: obtains the CSRF token via `shell.getTokenDeferred()`, then calls
 * native `fetch()` with the token injected as a header.
 */
export async function safeFetch<T = unknown>({
  url,
  method = 'GET',
  headers = {},
  body,
}: SafeFetchOptions): Promise<T> {
  // ── Primary: portal's built-in webapi.safeAjax ──
  if (window.webapi?.safeAjax) {
    return new Promise<T>((resolve, reject) => {
      let parsedBody: unknown = undefined;
      if (body != null) {
        try {
          parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        } catch {
          parsedBody = body;
        }
      }

      window.webapi!.safeAjax({
        type: method,
        url,
        contentType: headers['Content-Type'] || 'application/json',
        headers: {
          ...headers,
          Prefer: headers['Prefer'] || 'odata.include-annotations=*',
        },
        data: parsedBody,
        success: (data) => resolve(data as T),
        error: (_xhr, _textStatus, errorThrown) =>
          reject(new Error(errorThrown || 'Web API request failed')),
      });
    });
  }

  // ── Fallback: native fetch with explicit CSRF token ──
  const shell = window.shell;
  if (shell && typeof shell.getTokenDeferred === 'function') {
    const token: string = await getToken(shell);

    const mergedHeaders: Record<string, string> = {
      __RequestVerificationToken: token,
      Accept: 'application/json',
      ...headers,
    };
    if (body && !mergedHeaders['Content-Type']) {
      mergedHeaders['Content-Type'] = 'application/json; charset=utf-8';
    }

    const resp = await fetch(url, { method, headers: mergedHeaders, body });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status} ${resp.statusText} — ${text}`);
    }
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return resp.json();
    }
    return (await resp.text()) as unknown as T;
  }

  // ── Last resort ──
  throw new Error(
    'No Web API auth mechanism available. ' +
    'Ensure the app is running on a Power Pages site with webapi.safeAjax or shell.getTokenDeferred().',
  );
}

/**
 * Response metadata interface returned by `safeFetchWithMeta`.
 */
export interface SafeFetchMeta {
  /** Read a response header (case-insensitive). */
  getHeader: (name: string) => string | null;
}

/**
 * Like `safeFetch` but also returns response headers.
 *
 * Returns `{ data, meta }` where `meta.getHeader(name)` reads a response header.
 * Useful when you need headers like `OData-EntityId` or `entityid` from a POST
 * response.
 */
export async function safeFetchWithMeta<T = unknown>({
  url,
  method = 'GET',
  headers = {},
  body,
}: SafeFetchOptions): Promise<{ data: T; meta: SafeFetchMeta }> {
  // ── Primary: portal's built-in webapi.safeAjax ──
  if (window.webapi?.safeAjax) {
    return new Promise((resolve, reject) => {
      let parsedBody: unknown = undefined;
      if (body != null) {
        try {
          parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        } catch {
          parsedBody = body;
        }
      }

      window.webapi!.safeAjax({
        type: method,
        url,
        contentType: headers['Content-Type'] || 'application/json',
        headers: {
          ...headers,
          Prefer: headers['Prefer'] || 'odata.include-annotations=*',
        },
        data: parsedBody,
        success: (data, _textStatus, xhr) => {
          const xhr_ = xhr as XMLHttpRequest;
          resolve({
            data: data as T,
            meta: { getHeader: (name) => xhr_.getResponseHeader(name) },
          });
        },
        error: (_xhr, _textStatus, errorThrown) =>
          reject(new Error(errorThrown || 'Web API request failed')),
      });
    });
  }

  // ── Fallback: native fetch with explicit CSRF token ──
  const shell = window.shell;
  if (shell && typeof shell.getTokenDeferred === 'function') {
    const token: string = await getToken(shell);

    const mergedHeaders: Record<string, string> = {
      __RequestVerificationToken: token,
      Accept: 'application/json',
      ...headers,
    };
    if (body && !mergedHeaders['Content-Type']) {
      mergedHeaders['Content-Type'] = 'application/json; charset=utf-8';
    }

    const resp = await fetch(url, { method, headers: mergedHeaders, body });
    const meta: SafeFetchMeta = { getHeader: (name) => resp.headers.get(name) };

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status} ${resp.statusText} — ${text}`);
    }
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return { data: (await resp.json()) as T, meta };
    }
    return { data: (await resp.text()) as unknown as T, meta };
  }

  throw new Error(
    'No Web API auth mechanism available. ' +
    'Ensure the app is running on a Power Pages site with webapi.safeAjax or shell.getTokenDeferred().',
  );
}
