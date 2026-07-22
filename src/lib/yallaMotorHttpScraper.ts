/**
 * Flow 3 HTTP URL — paste the URL from Power Automate HTTP trigger here.
 * From the trigger step: copy the "HTTP POST URL" shown at the top.
 */
const FLOW_3_URL = 'https://15c7cf15bfa4e984a64eef99a12de7.cd.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/17/workflows/78d508a5400a40b18f89343b6cf2f4c5/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=i4Ywt7OqT_X0TYi3VxPhGXZPl1cFmdwrNU_F46bUSjQ';

export interface Flow3ScrapeResult {
  success: true;
  make: string;
  model: string;
  trim: string;
  year: number;
  count: number;
  minPrice: number;
  maxPrice: number;
  heading: string;
  sourceUrl: string;
  /** true when YallaMotor was unreachable — show friendly message instead of live data */
  _unavailable?: boolean;
}

export interface Flow3ErrorResult {
  success: false;
  error: string;
  url?: string;
  statusCode?: string;
}

export type Flow3Response = Flow3ScrapeResult | Flow3ErrorResult;

/**
 * Call Power Automate Flow 3 directly via its HTTP trigger URL.
 *
 * Pattern (from reference):
 *   fetch(FLOW_3_URL, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ make, model, trim, year }),
 *   });
 *
 * The flow responds to the caller with JSON: { success, count, minPrice, maxPrice, ... }
 */
export async function scrapeViaFlow3(params: {
  make: string;
  model: string;
  trim: string;
  year: number;
}): Promise<Flow3Response> {
  try {
    const response = await fetch(FLOW_3_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        make: params.make,
        model: params.model,
        trim: params.trim,
        year: params.year,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        error: `Flow request failed (${response.status}): ${text}`,
        statusCode: String(response.status),
      };
    }

    // The flow responds with JSON via "Respond to a PowerApp or flow"
    const result = (await response.json()) as Record<string, unknown>;

    // Field names must match the flow's "Response (PREMIUM)" body exactly
    // Strip non-numeric chars to handle stray quotes from scope wrapping
    const count = Number(String(result['Count'] ?? result['count'] ?? '').replace(/[^0-9-]/g, '')) || 0;
    const minPrice = Number(result['Min Price'] ?? result['Min price'] ?? result['minPrice'] ?? 0);
    const maxPrice = Number(result['Max Price'] ?? result['Max price'] ?? result['maxPrice'] ?? 0);

    // Count = -1 means the Catch scope fired — YallaMotor was not accessible
    if (count < 0) {
      return {
        success: true,
        make: params.make,
        model: params.model,
        trim: params.trim,
        year: params.year,
        count: 0,
        minPrice: 0,
        maxPrice: 0,
        heading: '',
        sourceUrl: '',
        _unavailable: true,
      };
    }

    // Construct the YallaMotor URL client-side.
    // Replace spaces with hyphens and strip non-standard characters for clean slugs.
    const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const makeSlug = slugify(params.make);
    const modelSlug = slugify(params.model);
    const trimSlug = slugify(params.trim);
    const sourceUrl = `https://uae.yallamotor.com/used-cars/${makeSlug}/${modelSlug}/vr_${trimSlug}/yr_${params.year}_${params.year}`;

    return {
      success: true,
      make: params.make,
      model: params.model,
      trim: params.trim,
      year: params.year,
      count,
      minPrice,
      maxPrice,
      heading: `${count} listings · AED ${minPrice.toLocaleString()} – ${maxPrice.toLocaleString()} · ${params.year}–${params.year}`,
      sourceUrl,
    } satisfies Flow3ScrapeResult;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}