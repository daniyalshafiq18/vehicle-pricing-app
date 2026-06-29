/**
 * Power Pages Web API — Contact CRUD
 *
 * Creates contact records via `/_api/contacts`.
 *
 * Primary path: `webapi.safeAjax` (reads `entityid` response header).
 * Fallback: `shell.getTokenDeferred()` + native `fetch()` for portals
 * where `webapi.safeAjax` is not available.
 */

import { safeFetchWithMeta } from '@lib/safeAjax';

/**
 * Fields accepted when creating a contact.
 */
export interface ContactPayload {
  firstname?: string | null;
  lastname?: string | null;
  emailaddress1?: string | null;
  telephone1?: string | null;
  /** Option-set integer value for vpi_city. */
  vpi_city?: number | null;
  vpi_country?: string | null;
}

/**
 * Create a contact record in Dataverse via the portal Web API.
 *
 * Returns the GUID of the newly created contact.
 *
 * Both `webapi.safeAjax` and native `fetch` paths extract the created
 * contact's ID from the `entityid` response header (Power Pages standard).
 *
 * @example
 * const contactId = await createContact({
 *   firstname: 'John',
 *   lastname: 'Doe',
 *   emailaddress1: 'john@example.com',
 * });
 */
export async function createContact(payload: ContactPayload): Promise<string> {
  // ── Primary: portal's built-in webapi.safeAjax ──
  const sa = window.webapi?.safeAjax;
  if (sa) {
    return new Promise<string>((resolve, reject) => {
      sa({
        type: 'POST',
        contentType: 'application/json',
        url: '/_api/contacts',
        data: JSON.stringify(payload),
        success: (_data, _textStatus, xhr) => {
          const newId = (xhr as XMLHttpRequest).getResponseHeader('entityid');
          if (newId) {
            console.log(`[contactApi] Created contact ${newId}`);
            resolve(newId);
          } else {
            reject(new Error('Contact created but no entityid header returned'));
          }
        },
        error: (_xhr, _textStatus, errorThrown) => {
          reject(new Error(errorThrown || 'Contact creation failed'));
        },
      });
    });
  }

  // ── Fallback: native fetch via safeFetchWithMeta ──
  const { meta } = await safeFetchWithMeta<Record<string, unknown>>({
    url: '/_api/contacts',
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  // entityid header (Power Pages custom: plain GUID)
  const entityId = meta.getHeader('entityid');
  if (entityId) {
    console.log(`[contactApi] Created contact ${entityId}`);
    return entityId;
  }

  // OData-EntityId header (standard OData: "contacts(GUID)")
  const odataHeader = meta.getHeader('OData-EntityId');
  if (odataHeader) {
    const guid = odataHeader.match(/\(([^)]+)\)/)?.[1];
    if (guid) {
      console.log(`[contactApi] Created contact ${guid} (from OData-EntityId)`);
      return guid;
    }
  }

  throw new Error('Contact created but no entity identifier returned in any known header');
}
