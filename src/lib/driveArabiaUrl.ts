import { slugify } from '@/lib/yallaMotorUrl';

/**
 * Build DriveArabia's stable, human-readable model-year route.
 *
 * DriveArabia redirects this short form to its current canonical route, whose
 * model segment may include the make name. Keeping the short form avoids
 * duplicating site-specific canonical aliases in the app.
 */
export function buildDriveArabiaModelYearUrl(params: {
  make: string;
  model: string;
  year: number;
}): string {
  const make = slugify(params.make);
  const model = slugify(params.model);

  if (!make || !model || !Number.isInteger(params.year) || params.year < 1900) {
    throw new Error('A valid make, model, and model year are required');
  }

  return `https://www.drivearabia.com/carprices/uae/${make}/${model}/${params.year}/`;
}

export interface DriveArabiaPadCorrelation {
  runCorrelationId: string;
  attemptNumber: number;
}

/** Build the attended PAD URL for one prepared DriveArabia source attempt. */
export function buildCorrelatedDriveArabiaPadUrl(
  params: { make: string; model: string; year: number },
  correlation: DriveArabiaPadCorrelation,
): string {
  const runCorrelationId = correlation.runCorrelationId.trim();
  if (
    !runCorrelationId ||
    !Number.isInteger(correlation.attemptNumber) ||
    correlation.attemptNumber < 1
  ) {
    throw new Error('A Run correlation ID and positive attempt number are required');
  }
  const url = new URL(buildDriveArabiaModelYearUrl(params));
  url.hash = new URLSearchParams({
    vpiRun: runCorrelationId,
    vpiAttempt: String(correlation.attemptNumber),
  }).toString();
  return url.toString();
}

/** Read the internal orchestration marker from a PAD-captured final URL. */
export function parseDriveArabiaPadCorrelation(
  urlValue: string,
): DriveArabiaPadCorrelation | null {
  try {
    const url = new URL(urlValue);
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
    const runCorrelationId = fragment.get('vpiRun')?.trim() ?? '';
    const attemptNumber = Number(fragment.get('vpiAttempt'));
    if (!runCorrelationId || !Number.isInteger(attemptNumber) || attemptNumber < 1) {
      return null;
    }
    return { runCorrelationId, attemptNumber };
  } catch {
    return null;
  }
}

/** Remove internal orchestration keys before persisting source provenance. */
export function cleanDriveArabiaSourceUrl(urlValue: string): string {
  try {
    const url = new URL(urlValue);
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
    fragment.delete('vpiRun');
    fragment.delete('vpiAttempt');
    url.hash = fragment.toString();
    return url.toString();
  } catch {
    return urlValue;
  }
}
