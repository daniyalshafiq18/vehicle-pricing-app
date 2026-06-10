/**
 * OData query builder utilities for constructing Dataverse API requests.
 *
 * Produces flat parameter records consumed by dvClient.get().
 *
 * Usage:
 *   const params = queryBuilder
 *     .select('vpi_make', 'vpi_model')
 *     .filter("vpi_make eq 'Toyota'")
 *     .top(50)
 *     .orderBy('vpi_year desc')
 *     .build();
 *   // → { $select: 'vpi_make,vpi_model', $filter: "vpi_make eq 'Toyota'", $top: '50', $orderby: 'vpi_year desc' }
 */

interface QueryParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: string;
  $skip?: string;
  $expand?: string;
  $count?: string;
  $apply?: string;
}

export class ODataQueryBuilder {
  private params: QueryParams = {};

  /** Fields to return — comma-separated. Pass individual field names. */
  select(...fields: string[]): this {
    this.params.$select = fields.join(',');
    return this;
  }

  /** OData $filter expression (e.g. "vpi_make eq 'Toyota' and vpi_year ge 2020") */
  filter(expression: string): this {
    this.params.$filter = expression;
    return this;
  }

  /** OData $orderby expression (e.g. "vpi_year desc, vpi_make asc") */
  orderBy(expression: string): this {
    this.params.$orderby = expression;
    return this;
  }

  /** Max records to return */
  top(count: number): this {
    this.params.$top = String(count);
    return this;
  }

  /** Records to skip (for pagination) */
  skip(count: number): this {
    this.params.$skip = String(count);
    return this;
  }

  /** Navigation property to expand (e.g. "vpi_Contact($select=firstname,lastname)") */
  expand(expression: string): this {
    this.params.$expand = expression;
    return this;
  }

  /** Include record count in response */
  includeCount(): this {
    this.params.$count = 'true';
    return this;
  }

  /** OData $apply for aggregation queries */
  apply(expression: string): this {
    this.params.$apply = expression;
    return this;
  }

  /** Include formatted value annotations (maps integer codes to labels) */
  includeAnnotations(): this {
    // This is passed as a Prefer header, not a query param
    return this;
  }

  /** Produce the flat parameter record */
  build(): Record<string, string | undefined> {
    return { ...this.params } as unknown as Record<string, string | undefined>;
  }

  /** Reset all parameters */
  clear(): this {
    this.params = {};
    return this;
  }
}

/** Singleton convenience instance */
export const qb = new ODataQueryBuilder();

// ─── Filter Helpers ──────────────────────────────────────────────────

/** Escape a string value for OData filter expressions */
export function escapeODataString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Escape a number for OData filter expressions */
export function escapeODataNumber(value: number): string {
  return String(value);
}

/** Build a "contains" filter for a text field */
export function containsFilter(field: string, value: string): string {
  return `contains(${field}, ${escapeODataString(value)})`;
}

/** Build an "in" filter using OR */
export function inFilter(field: string, values: (string | number)[]): string | null {
  if (values.length === 0) return null;
  const parts = values.map((v) =>
    typeof v === 'number'
      ? `${field} eq ${v}`
      : `${field} eq ${escapeODataString(v)}`,
  );
  return parts.join(' or ');
}

/** Build a range filter for numeric fields */
export function rangeFilter(
  field: string,
  min?: number,
  max?: number,
): string | null {
  if (min === undefined && max === undefined) return null;
  const parts: string[] = [];
  if (min !== undefined) parts.push(`${field} ge ${min}`);
  if (max !== undefined) parts.push(`${field} le ${max}`);
  return parts.join(' and ');
}

/** Build a year-make-model-spec filter chain */
export function buildVehicleFilter(params: {
  year?: number;
  make?: string;
  model?: string;
  spec?: string;
  bodyType?: number;
}): string | null {
  const filters: string[] = [];

  if (params.year !== undefined) {
    filters.push(`vpi_year eq '${params.year}'`);
  }
  if (params.make) {
    filters.push(`vpi_make eq ${escapeODataString(params.make)}`);
  }
  if (params.model) {
    filters.push(`vpi_model eq ${escapeODataString(params.model)}`);
  }
  if (params.spec) {
    filters.push(`vpi_spec eq ${escapeODataString(params.spec)}`);
  }
  if (params.bodyType !== undefined) {
    filters.push(`vpi_bodytype eq ${params.bodyType}`);
  }

  return filters.length > 0 ? filters.join(' and ') : null;
}

// ─── Prefer Headers ──────────────────────────────────────────────────

/** Get the Prefer header for including formatted values in responses */
export function includeAnnotationsHeader(): Record<string, string> {
  return { Prefer: 'odata.include-annotations=*' };
}
