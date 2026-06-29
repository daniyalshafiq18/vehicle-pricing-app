/**
 * Power Pages Web API — Vehicle Inquiry CRUD
 *
 * Creates vehicle inquiry records via `/_api/vpi_vehicleinquiries`.
 *
 * Primary path: `webapi.safeAjax` (reads `entityid` response header).
 * Fallback: native `fetch` with CSRF token.
 *
 * This module isolates the inquiry creation so error details —
 * including the full XMLHttpRequest response — are surfaced for debugging.
 */

import { safeFetchWithMeta } from '@lib/safeAjax';

/**
 * Fields accepted when creating a vehicle inquiry.
 */
export interface CreateInquiryPayload {
  vpi_name?: string | null;
  'vpi_Contact@odata.bind'?: string | null;
  'vpi_Vehicle@odata.bind'?: string | null;
  vpi_status?: number | null;
}

/**
 * Create a vehicle inquiry record in Dataverse via the portal Web API.
 *
 * Returns the GUID of the newly created inquiry.
 */
export async function createInquiry(payload: CreateInquiryPayload): Promise<string> {
  // ── Primary: portal's built‑in webapi.safeAjax ──
  const sa = window.webapi?.safeAjax;
  if (sa) {
    return new Promise<string>((resolve, reject) => {
      sa({
        type: 'POST',
        contentType: 'application/json',
        url: '/_api/vpi_vehicleinquiries',
        data: JSON.stringify(payload),
        success: (_data, _textStatus, xhr) => {
          const newId = (xhr as XMLHttpRequest).getResponseHeader('entityid');
          if (newId) {
            console.log(`[inquiryApi] Created inquiry ${newId}`);
            resolve(newId);
          } else {
            reject(new Error('Inquiry created but no entityid header returned'));
          }
        },
        error: (xhr, _textStatus, errorThrown) => {
          const resp = xhr as XMLHttpRequest;
          const body = resp.responseText || '(no response body)';
          console.error('[inquiryApi] CREATE FAILED', {
            status: resp.status,
            statusText: resp.statusText,
            body,
            errorThrown,
          });
          reject(new Error(`Inquiry creation failed (${resp.status}): ${body}`));
        },
      });
    });
  }

  // ── Fallback: native fetch with CSRF token ──
  const { meta } = await safeFetchWithMeta<Record<string, unknown>>({
    url: '/_api/vpi_vehicleinquiries',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'odata.include-annotations=*',
    },
    body: JSON.stringify(payload),
  });

  const entityId = meta.getHeader('entityid');
  if (entityId) {
    console.log(`[inquiryApi] Created inquiry ${entityId}`);
    return entityId;
  }

  const odataHeader = meta.getHeader('OData-EntityId');
  if (odataHeader) {
    const guid = odataHeader.match(/\(([^)]+)\)/)?.[1];
    if (guid) {
      console.log(`[inquiryApi] Created inquiry ${guid} (from OData-EntityId)`);
      return guid;
    }
  }

  throw new Error('Inquiry created but no entity identifier returned in any known header');
}
