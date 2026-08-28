const BUILD_FLOW_ID =
  (import.meta.env.VITE_DRIVEARABIA_CLOUD_FLOW_ID as string | undefined)?.trim() ?? '';
const GUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

declare global {
  interface Window {
    vpiRuntimeConfig?: {
      driveArabiaCloudFlowId?: string;
    };
  }
}

function configuredFlowId(): string {
  const runtimeFlowId =
    typeof window === 'undefined'
      ? ''
      : (window.vpiRuntimeConfig?.driveArabiaCloudFlowId?.trim() ?? '');
  return GUID_PATTERN.test(runtimeFlowId) ? runtimeFlowId : BUILD_FLOW_ID;
}

export interface TriggerDriveArabiaPadInput {
  driveArabiaUrl: string;
  missingVehicleRequestId: string;
  runCorrelationId: string;
  attemptNumber: number;
}

export type DriveArabiaPadDispatch =
  | { mode: 'attended' }
  | { mode: 'automatic'; inboxId: string; statusCode: number };

interface TriggerDriveArabiaPadDependencies {
  flowId: string;
  invoke: (request: PowerPagesCloudFlowRequest) => Promise<unknown>;
}

interface PowerPagesCloudFlowRequest {
  url: string;
  eventData: TriggerDriveArabiaPadInput;
}

interface AjaxFailure {
  responseText?: string;
  status?: number;
  statusText?: string;
}

interface AjaxDeferred<T> {
  done: (callback: (response: T) => void) => AjaxDeferred<T>;
  fail: (
    callback: (xhr: AjaxFailure, textStatus?: string, errorThrown?: string) => void,
  ) => AjaxDeferred<T>;
}

interface PowerPagesFlowShell {
  ajaxSafePost?: <T>(options: {
    type: 'POST';
    url: string;
    data: { eventData: string };
  }) => AjaxDeferred<T>;
}

interface TokenDeferred {
  then?: (
    onFulfilled: (token: unknown) => void,
    onRejected: (error: unknown) => void,
  ) => unknown;
  done?: (callback: (token: unknown) => void) => TokenDeferred;
  fail?: (callback: (error: unknown) => void) => TokenDeferred;
}

function tokenValue(response: unknown): string {
  if (typeof response === 'string') {
    const trimmed = response.trim();
    if (!trimmed.includes('<input')) {
      return trimmed;
    }
    const parsed = new DOMParser().parseFromString(trimmed, 'text/html');
    return (
      parsed.querySelector<HTMLInputElement>('input[name="__RequestVerificationToken"]')
        ?.value ?? ''
    ).trim();
  }
  if (response && typeof response === 'object') {
    if (typeof HTMLInputElement !== 'undefined' && response instanceof HTMLInputElement) {
      return response.value.trim();
    }
    const tokenLike = response as { value?: unknown; val?: () => unknown };
    if (typeof tokenLike.value === 'string') {
      return tokenLike.value.trim();
    }
    if (typeof tokenLike.val === 'function') {
      const value = tokenLike.val();
      return typeof value === 'string' ? value.trim() : '';
    }
  }
  return '';
}

async function acquirePowerPagesToken(shell: NonNullable<typeof window.shell>): Promise<string> {
  const deferred = shell.getTokenDeferred() as TokenDeferred;
  let response: unknown;
  if (typeof deferred.then === 'function') {
    response = await new Promise((resolve, reject) => {
      deferred.then?.(resolve, () => reject(new Error('Power Pages token acquisition failed')));
    });
  } else if (typeof deferred.done === 'function' && typeof deferred.fail === 'function') {
    response = await new Promise((resolve, reject) => {
      deferred.done?.(resolve);
      deferred.fail?.(() => reject(new Error('Power Pages token acquisition failed')));
    });
  } else {
    throw new Error('Power Pages token API returned an unsupported result');
  }
  const token = tokenValue(response);
  if (!token) {
    throw new Error('Power Pages token response did not contain a verification token');
  }
  return token;
}

async function invokeWithTokenFetch(
  shell: NonNullable<typeof window.shell>,
  request: PowerPagesCloudFlowRequest,
): Promise<unknown> {
  const token = await acquirePowerPagesToken(shell);
  const response = await fetch(request.url, {
    method: 'POST',
    headers: {
      __RequestVerificationToken: token,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: new URLSearchParams({
      eventData: JSON.stringify(request.eventData),
    }).toString(),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} ${response.statusText} — ${detail}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

function flowInvocationError(
  xhr: AjaxFailure,
  textStatus?: string,
  errorThrown?: string,
): Error {
  const detail = xhr.responseText?.trim();
  if (detail) {
    return new Error(`HTTP ${xhr.status ?? 500} — ${detail}`);
  }
  return new Error(errorThrown || textStatus || xhr.statusText || 'Cloud flow invocation failed');
}

/** Invoke a site-associated flow using the transport required by Power Pages. */
export function invokePowerPagesCloudFlow(
  request: PowerPagesCloudFlowRequest,
): Promise<unknown> {
  const shell = window.shell as (typeof window.shell & PowerPagesFlowShell) | undefined;
  const ajaxSafePost = shell?.ajaxSafePost;
  if (!ajaxSafePost) {
    if (shell?.getTokenDeferred) {
      return invokeWithTokenFetch(shell, request);
    }
    throw new Error('Power Pages cloud-flow authentication is unavailable');
  }

  return new Promise((resolve, reject) => {
    ajaxSafePost<unknown>({
      type: 'POST',
      url: request.url,
      data: { eventData: JSON.stringify(request.eventData) },
    })
      .done(resolve)
      .fail((xhr, textStatus, errorThrown) => {
        reject(flowInvocationError(xhr, textStatus, errorThrown));
      });
  });
}

function responseValue(
  response: Record<string, unknown>,
  ...names: string[]
): unknown {
  const entries = Object.entries(response);
  for (const name of names) {
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

function responseRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Whether a valid runtime or local-development Power Pages cloud-flow ID is available. */
export function isDriveArabiaPadAutomationConfigured(flowId = configuredFlowId()): boolean {
  return GUID_PATTERN.test(flowId.trim());
}

/**
 * Invoke the site-associated DriveArabia cloud flow.
 *
 * The GUID is not a secret. Power Pages owns authentication/CSRF and enforces
 * the flow's assigned web roles. When no flow is configured, callers retain the
 * attended PAD path instead of failing an otherwise valid shared Scrape Run.
 */
export async function triggerDriveArabiaPad(
  input: TriggerDriveArabiaPadInput,
  overrides: Partial<TriggerDriveArabiaPadDependencies> = {},
): Promise<DriveArabiaPadDispatch> {
  const deps = {
    flowId: configuredFlowId(),
    invoke: invokePowerPagesCloudFlow,
    ...overrides,
  };
  const flowId = deps.flowId.trim();
  if (!flowId) {
    return { mode: 'attended' };
  }
  if (!GUID_PATTERN.test(flowId)) {
    throw new Error('DriveArabia cloud-flow ID must be a valid GUID');
  }

  const response = await deps.invoke({
    url: `/_api/cloudflow/v1.0/trigger/${flowId}`,
    eventData: input,
  });
  const body = responseRecord(response);
  const nested = responseRecord(responseValue(body, 'result', 'body', 'eventData'));
  const values = { ...body, ...nested };
  const inboxId = String(responseValue(values, 'inboxId', 'InboxId') ?? '').trim();
  const statusCode = Number(responseValue(values, 'statusCode', 'StatusCode'));

  if (!inboxId) {
    throw new Error('DriveArabia cloud flow completed without returning InboxId');
  }
  if (statusCode !== 202) {
    throw new Error(
      `DriveArabia desktop flow returned ${Number.isFinite(statusCode) ? statusCode : 'no'} StatusCode`,
    );
  }
  return { mode: 'automatic', inboxId, statusCode };
}
