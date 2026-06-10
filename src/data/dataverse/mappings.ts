/**
 * Centralized option-set mappings between Dataverse integer codes and
 * application string values. All mappings are bidirectional.
 *
 * Each mapping object provides:
 *   - label(value):   Dataverse code → app string label
 *   - code(label):    App string label  → Dataverse code
 *   - isValid(value): Whether a code/label is valid
 *   - all():          All entries as { code, label }[]
 */

// ─── Helper factories ──────────────────────────────────────────────

function createMapping(
  map: Record<string, number>,
): {
  label: (code: number) => string | undefined;
  code: (label: string) => number | undefined;
  isValid: (value: string | number) => boolean;
  all: () => { code: number; label: string }[];
} {
  const byCode = new Map<number, string>();
  const byLabel = new Map<string, number>();
  for (const [label, code] of Object.entries(map)) {
    byCode.set(code, label);
    byLabel.set(label.toLowerCase(), code);
  }
  return {
    label: (code: number) => byCode.get(code),
    code: (label: string) => byLabel.get(label.toLowerCase()),
    isValid: (value: string | number) =>
      typeof value === 'number'
        ? byCode.has(value)
        : byLabel.has(value.toLowerCase()),
    all: () =>
      Object.entries(map).map(([label, code]) => ({ code, label })),
  };
}

// ─── Mappings ──────────────────────────────────────────────────────

export const cityMapping = createMapping({
  Dubai: 1,
  'Abu Dhabi': 2,
  Sharjah: 3,
  Ajman: 4,
  'Ras Al Khaimah': 5,
  Fujairah: 6,
  'Umm Al Quwain': 7,
  'Al Ain': 8,
  'Khor Fakkan': 9,
  'Dibba Al Fujairah': 10,
  Kalba: 11,
  'Madinat Zayed': 12,
  Ruwais: 13,
  'Jebel Ali': 14,
} as const);

export const bodyTypeMapping = createMapping({
  Bus: 1,
  Cargo: 2,
  'Cargo Van': 3,
  'Cargo Van High Roof': 4,
  'Compact/Mini MPV': 5,
  Convertible: 6,
  Coupe: 7,
  'Coupe/Cabriolet': 8,
  'Crew Cab': 9,
  Crossbow: 10,
  'Crossover Fastback': 11,
  Estate: 12,
  'Half Panel Van': 13,
  'Hard Top': 14,
  Hatchback: 15,
  Landaulet: 16,
  'Long Cargo': 17,
  'Long Van': 18,
  'LWB HR Van': 19,
  'LWB Low Roof Van': 20,
  'LWB Van': 21,
  'Mini Bus': 22,
  'Mini Bus High Roof': 23,
  'Mini Bus LWB': 24,
  'Mini Bus LWB Wide Body HR': 25,
  'Mini Bus Semi High Roof': 26,
  'Mini Van': 27,
  Minivan: 28,
  MPV: 29,
  'Open Top': 30,
  'Panel Van': 31,
  'Panel Van High Roof': 32,
  'Panelvan Wide Body High Roof': 33,
  'Pick Up': 34,
  'Pick Up Double Cab': 35,
  'Pick Up Double Cab Long Box': 36,
  'Pick Up Ext Cab': 37,
  'Pick Up Ext Cab Long Box': 38,
  'Pick Up Long Box': 39,
  'Pick Up Lwb': 40,
  'Pick Up Single Cab': 41,
  'Pickup Truck': 42,
  'Regular Cab': 43,
  'Regular Cab Chassis': 44,
  'Retractable Hard Top': 45,
  Sedan: 46,
  'Short Van': 47,
  'Single Cabin Long Cargo': 48,
  'Single Cabin Long Chassis': 49,
  'Single Cabin Std Cargo': 50,
  'Single Cabin Std Chassis': 51,
  'Soft Top': 52,
  Sportback: 53,
  Station: 54,
  Suv: 55,
  'Suv- Compact': 56,
  'Suv Convertible': 57,
  'Suv Coupe': 58,
  'Suv- Crossover': 59,
  'Swb Van': 60,
  Targa: 61,
  Truck: 62,
  Van: 63,
  'Van 3.5 Ton': 64,
  'Van 4.5 Ton': 65,
  Wagon: 66,
  'Wide Body Mini Bus': 67,
  'Wide Body Van': 68,
  'Window Van': 69,
} as const);

export const inquiryStatusMapping = createMapping({
  Pending: 1,
  Reviewed: 2,
  Contacted: 3,
  Closed: 4,
} as const);

export const yearMapping = createMapping({
  '1950': 1, '1951': 2, '1952': 3, '1953': 4, '1954': 5,
  '1955': 6, '1956': 7, '1957': 8, '1958': 9, '1959': 10,
  '1960': 11, '1961': 12, '1962': 13, '1963': 14, '1964': 15,
  '1965': 16, '1966': 17, '1967': 18, '1968': 19, '1969': 20,
  '1970': 21, '1971': 22, '1972': 23, '1973': 24, '1974': 25,
  '1975': 26, '1976': 27, '1977': 28, '1978': 29, '1979': 30,
  '1980': 31, '1981': 32, '1982': 33, '1983': 34, '1984': 35,
  '1985': 36, '1986': 37, '1987': 38, '1988': 39, '1989': 40,
  '1990': 41, '1991': 42, '1992': 43, '1993': 44, '1994': 45,
  '1995': 46, '1996': 47, '1997': 48, '1998': 49, '1999': 50,
  '2000': 51, '2001': 52, '2002': 53, '2003': 54, '2004': 55,
  '2005': 56, '2006': 57, '2007': 58, '2008': 59, '2009': 60,
  '2010': 61, '2011': 62, '2012': 63, '2013': 64, '2014': 65,
  '2015': 66, '2016': 67, '2017': 68, '2018': 69, '2019': 70,
  '2020': 71, '2021': 72, '2022': 73, '2023': 74, '2024': 75,
  '2025': 76, '2026': 77,
} as const);

export const vehicleTypeMapping = createMapping({
  Car: 1,
  'Heavy Commercial Vehicle': 2,
  'Light Commercial Vehicle': 3,
} as const);

export const fuelTypeMapping = createMapping({
  'Petrol/Diesel': 3,
  Hybrid: 2,
  Electric: 1,
} as const);

export const categoryMapping = createMapping({
  'OTHER/STANDARD': 3,
  'NON-GCC': 2,
  GCC: 1,
} as const);

export const doorsMapping = createMapping({
  '0': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '1 DOOR': 7,
} as const);

export const drivetrainMapping = createMapping({
  '4X4': 1,
  AWD: 2,
  FWD: 3,
  RWD: 4,
  Unknown: 5,
} as const);

export const transmissionMapping = createMapping({
  '9G-Tronic': 1,
  'Active Select': 2,
  Automatic: 3,
  Cvt: 4,
  'Cvt + Manual Mode': 5,
  Dht: 6,
  'Direct Drive': 7,
  Drivelogic: 8,
  'Dual Clutch': 9,
  'E-Cvt': 10,
  'E-Gear': 11,
  F1: 12,
  'F1 Dc': 13,
  F1A: 14,
  Geartronic: 15,
  Hydramatic: 16,
  Manual: 17,
  Multimode: 18,
  Multitronic: 19,
  Pdk: 20,
  Phev: 21,
  Powershift: 22,
  Quickshift: 23,
  'R-Tronic': 24,
  Selespeed: 25,
  Sentronic: 26,
  Sequential: 27,
  Smg: 28,
  'Sport Mode': 29,
  'S-Tronic': 30,
  Touchtronic: 31,
} as const);
