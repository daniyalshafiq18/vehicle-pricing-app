import { describe, expect, it, vi } from 'vitest';
import {
  isDriveArabiaPadAutomationConfigured,
  invokePowerPagesCloudFlow,
  triggerDriveArabiaPad,
} from './driveArabiaPadAutomation';

const FLOW_ID = '11111111-2222-4333-8444-555555555555';
const INPUT = {
  driveArabiaUrl:
    'https://www.drivearabia.com/carprices/uae/mg/5/2026/#vpiRun=shared-run&vpiAttempt=1',
  missingVehicleRequestId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  runCorrelationId: 'shared-run',
  attemptNumber: 1,
};

describe('DriveArabia Power Pages cloud-flow trigger', () => {
  it('keeps the attended fallback when no flow is configured', async () => {
    await expect(
      triggerDriveArabiaPad(INPUT, { flowId: '', invoke: vi.fn() }),
    ).resolves.toEqual({ mode: 'attended' });
    expect(isDriveArabiaPadAutomationConfigured('')).toBe(false);
  });

  it('prefers the Power Pages runtime flow ID over build-time configuration', () => {
    const originalConfig = window.vpiRuntimeConfig;
    window.vpiRuntimeConfig = { driveArabiaCloudFlowId: FLOW_ID };
    try {
      expect(isDriveArabiaPadAutomationConfigured()).toBe(true);
    } finally {
      window.vpiRuntimeConfig = originalConfig;
    }
  });

  it('invokes the secured same-origin endpoint and validates the PAD result', async () => {
    const invoke = vi.fn().mockResolvedValue({ InboxId: 'abc123', StatusCode: 202 });

    await expect(
      triggerDriveArabiaPad(INPUT, { flowId: FLOW_ID, invoke }),
    ).resolves.toEqual({ mode: 'automatic', inboxId: 'abc123', statusCode: 202 });
    expect(invoke).toHaveBeenCalledWith({
      url: `/_api/cloudflow/v1.0/trigger/${FLOW_ID}`,
      eventData: INPUT,
    });
    expect(isDriveArabiaPadAutomationConfigured(FLOW_ID)).toBe(true);
  });

  it('rejects a flow response that cannot identify the uploaded capture', async () => {
    await expect(
      triggerDriveArabiaPad(INPUT, {
        flowId: FLOW_ID,
        invoke: vi.fn().mockResolvedValue({ StatusCode: 202 }),
      }),
    ).rejects.toThrow('without returning InboxId');
  });

  it('uses the Power Pages ajaxSafePost form envelope instead of Dataverse JSON transport', async () => {
    const fail = vi.fn();
    const deferred = {
      done: vi.fn((callback: (response: unknown) => void) => {
        callback({ InboxId: 'abc123', StatusCode: 202 });
        return deferred;
      }),
      fail,
    };
    fail.mockReturnValue(deferred);
    const ajaxSafePost = vi.fn().mockReturnValue(deferred);
    const originalShell = window.shell;
    Object.defineProperty(window, 'shell', {
      configurable: true,
      value: { ...originalShell, ajaxSafePost },
    });

    try {
      await expect(
        invokePowerPagesCloudFlow({
          url: `/_api/cloudflow/v1.0/trigger/${FLOW_ID}`,
          eventData: INPUT,
        }),
      ).resolves.toEqual({ InboxId: 'abc123', StatusCode: 202 });
      expect(ajaxSafePost).toHaveBeenCalledWith({
        type: 'POST',
        url: `/_api/cloudflow/v1.0/trigger/${FLOW_ID}`,
        data: { eventData: JSON.stringify(INPUT) },
      });
    } finally {
      Object.defineProperty(window, 'shell', {
        configurable: true,
        value: originalShell,
      });
    }
  });

  it('uses an equivalent token-authenticated form request when ajaxSafePost is unavailable', async () => {
    const originalShell = window.shell;
    const originalFetch = globalThis.fetch;
    const tokenDeferred = {
      done(callback: (token: string) => void) {
        callback('csrf-token');
        return tokenDeferred;
      },
      fail() {
        return tokenDeferred;
      },
    };
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ InboxId: 'fallback123', StatusCode: 202 }),
      text: () => Promise.resolve(''),
    });
    Object.defineProperty(window, 'shell', {
      configurable: true,
      value: { getTokenDeferred: () => tokenDeferred },
    });
    globalThis.fetch = fetchFn;

    try {
      await expect(
        invokePowerPagesCloudFlow({
          url: `/_api/cloudflow/v1.0/trigger/${FLOW_ID}`,
          eventData: INPUT,
        }),
      ).resolves.toEqual({ InboxId: 'fallback123', StatusCode: 202 });
      expect(fetchFn).toHaveBeenCalledWith(
        `/_api/cloudflow/v1.0/trigger/${FLOW_ID}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            __RequestVerificationToken: 'csrf-token',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          }),
          body: new URLSearchParams({ eventData: JSON.stringify(INPUT) }).toString(),
        }),
      );
    } finally {
      Object.defineProperty(window, 'shell', {
        configurable: true,
        value: originalShell,
      });
      globalThis.fetch = originalFetch;
    }
  });

  it('extracts the verification-token value when the portal returns a hidden input', async () => {
    const originalShell = window.shell;
    const originalFetch = globalThis.fetch;
    const tokenInput = document.createElement('input');
    tokenInput.name = '__RequestVerificationToken';
    tokenInput.value = 'element-csrf-token';
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ InboxId: 'fallback123', StatusCode: 202 }),
      text: () => Promise.resolve(''),
    });
    Object.defineProperty(window, 'shell', {
      configurable: true,
      value: { getTokenDeferred: () => Promise.resolve(tokenInput) },
    });
    globalThis.fetch = fetchFn;

    try {
      await invokePowerPagesCloudFlow({
        url: `/_api/cloudflow/v1.0/trigger/${FLOW_ID}`,
        eventData: INPUT,
      });
      expect(fetchFn).toHaveBeenCalledWith(
        `/_api/cloudflow/v1.0/trigger/${FLOW_ID}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            __RequestVerificationToken: 'element-csrf-token',
          }),
        }),
      );
    } finally {
      Object.defineProperty(window, 'shell', {
        configurable: true,
        value: originalShell,
      });
      globalThis.fetch = originalFetch;
    }
  });
});
