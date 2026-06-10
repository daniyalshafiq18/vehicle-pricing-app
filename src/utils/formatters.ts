/**
 * Format a number as currency (AED by default).
 */
export function formatCurrency(amount: number, currency = 'AED'): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number with locale-aware separators.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a percentage value.
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

/**
 * Format a date string or Date object.
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Get a color class based on confidence level.
 */
export function getConfidenceColor(level: string): string {
  const colors: Record<string, string> = {
    'very-high': 'text-green-500',
    high: 'text-emerald-400',
    moderate: 'text-yellow-500',
    low: 'text-orange-500',
    'very-low': 'text-red-500',
  };
  return colors[level] ?? 'text-muted-foreground';
}

/**
 * Get a color class based on market trend direction.
 */
export function getTrendColor(direction: string): string {
  const colors: Record<string, string> = {
    up: 'text-green-500',
    down: 'text-red-500',
    stable: 'text-blue-400',
  };
  return colors[direction] ?? 'text-muted-foreground';
}
