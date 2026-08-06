import { describe, it, expect } from 'vitest';
import { slugify, buildYallaMotorSearchUrl } from './yallaMotorUrl';

describe('slugify', () => {
  it('collapses whitespace and punctuation to a single hyphen', () => {
    expect(slugify('Mercedes Benz')).toBe('mercedes-benz');
    expect(slugify('2.4L')).toBe('2-4l');
    expect(slugify("O'Neil")).toBe('o-neil');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify(' Wrangler! ')).toBe('wrangler');
  });
});

describe('buildYallaMotorSearchUrl', () => {
  it('builds the vr_/yr_ YallaMotor search URL', () => {
    expect(
      buildYallaMotorSearchUrl({ make: 'Jeep', model: 'Wrangler', trim: '3.6L Automatic', year: 2021 }),
    ).toBe('https://uae.yallamotor.com/used-cars/jeep/wrangler/vr_3-6l-automatic/yr_2021_2021');
  });
});