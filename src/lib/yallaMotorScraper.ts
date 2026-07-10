/**
 * YallaMotor Scraper — simulated price-estimate provider.
 *
 * In production this module would call a headless-browser / scraping
 * microservice. For now it returns realistic mock data based on the
 * vehicle parameters so the UI flow can be built and tested end-to-end.
 */

export interface ScrapedListing {
  title: string;
  price: number;
  mileage: number;
  year: number;
  transmission: string;
  fuelType: string;
  bodyType: string;
  cylinders: string;
  driveType: string;
  sourceUrl: string;
  source: string;
}

export interface ScrapeResult {
  estimatedMinPrice: number;
  estimatedMaxPrice: number;
  averagePrice: number;
  currency: string;
  listingsCount: number;
  listings: ScrapedListing[];
}

interface ScrapeParams {
  make: string;
  model: string;
  spec: string;
  year: number;
  bodyType?: string;
  cylinders?: string;
  fuelType?: string;
  transmissionType?: string;
  driveType?: string;
}

// ── Mock data generators ──────────────────────────────────────

/**
 * Deterministic "random" based on a seed string so the same vehicle
 * params produce the same estimate (useful for debugging).
 */
function seedFromParams(params: ScrapeParams): number {
  let hash = 0;
  const str = `${params.make}|${params.model}|${params.spec}|${params.year}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Pseudo-random number in [min, max] using a seed. */
function seededRandom(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return min + (x - Math.floor(x)) * (max - min);
}

/** Simulate network + scraping delay. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const LISTING_SOURCES = [
  'YallaMotor',
  'Dubizzle Cars',
  'Kavak',
  'Cars24',
  'Auto Trader UAE',
];

const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT'];
const FUEL_TYPES = ['Petrol', 'Hybrid', 'Electric', 'Diesel'];

// ── Main scraper ──────────────────────────────────────────────

/**
 * Scrape YallaMotor (and partner sites) for price estimates of the
 * given vehicle configuration.
 *
 * @param params - Vehicle parameters the user entered.
 * @param mockDelay - Override the simulated delay (ms). Default 2000–3500ms.
 */
export async function scrapeYallaMotor(
  params: ScrapeParams,
  mockDelay?: number,
): Promise<ScrapeResult> {
  const seed = seedFromParams(params);

  // Simulate network latency
  const wait = mockDelay ?? seededRandom(seed, 2000, 3500);
  await delay(wait);

  // Base price range depends on vehicle segment
  const basePrice = seededRandom(seed, 25_000, 180_000);
  const spread = seededRandom(seed + 1, 5_000, 40_000);
  const estimatedMinPrice = Math.round(basePrice / 1000) * 1000;
  const estimatedMaxPrice = Math.round((basePrice + spread) / 1000) * 1000;
  const averagePrice = Math.round((estimatedMinPrice + estimatedMaxPrice) / 2 / 1000) * 1000;

  const listingsCount = Math.floor(seededRandom(seed + 2, 3, 12));

  const listings: ScrapedListing[] = Array.from({ length: listingsCount }, (_, i) => {
    const listingSeed = seed + i * 100;
    const price = Math.round(
      seededRandom(listingSeed, estimatedMinPrice * 0.85, estimatedMaxPrice * 1.15) / 500,
    ) * 500;
    const mileage = Math.round(seededRandom(listingSeed + 1, 5_000, 150_000) / 1000) * 1000;

    return {
      title: `${params.year} ${params.make} ${params.model} ${params.spec}`,
      price,
      mileage,
      year: params.year,
      transmission: params.transmissionType
        ?? TRANSMISSIONS[Math.floor(seededRandom(listingSeed + 2, 0, TRANSMISSIONS.length))]
        ?? 'Automatic',
      fuelType: params.fuelType
        ?? FUEL_TYPES[Math.floor(seededRandom(listingSeed + 3, 0, FUEL_TYPES.length))]
        ?? 'Petrol',
      bodyType: params.bodyType ?? 'SUV',
      cylinders: params.cylinders ?? '4',
      driveType: params.driveType ?? 'FWD',
      sourceUrl: `https://www.yallamotor.com/used-cars/${params.make.toLowerCase()}/${params.model.toLowerCase()}`,
      source: LISTING_SOURCES[Math.floor(seededRandom(listingSeed + 4, 0, LISTING_SOURCES.length))]
        ?? 'YallaMotor',
    };
  });

  return {
    estimatedMinPrice,
    estimatedMaxPrice,
    averagePrice,
    currency: 'AED',
    listingsCount,
    listings,
  };
}
