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
