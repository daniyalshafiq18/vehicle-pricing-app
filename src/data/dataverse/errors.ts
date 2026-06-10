/**
 * Custom error classes for Dataverse operations.
 * Provides typed errors so the UI can surface user-friendly messages.
 */

export class DataverseError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DataverseError';
  }
}

export class DataverseAuthError extends DataverseError {
  constructor(message = 'Authentication failed. Please refresh and try again.') {
    super(message, 401);
    this.name = 'DataverseAuthError';
  }
}

export class DataverseNetworkError extends DataverseError {
  constructor(message = 'Network error — Dataverse is unreachable.') {
    super(message, 0);
    this.name = 'DataverseNetworkError';
  }
}

export class DataverseNotFoundError extends DataverseError {
  constructor(entity: string, id?: string) {
    const msg = id
      ? `${entity} with ID "${id}" not found.`
      : `${entity} not found.`;
    super(msg, 404);
    this.name = 'DataverseNotFoundError';
  }
}

export class DataverseMappingError extends DataverseError {
  constructor(description: string) {
    super(`Mapping error: ${description}`, 422);
    this.name = 'DataverseMappingError';
  }
}

/**
 * Converts a caught error to a user-friendly message.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof DataverseError) return error.message;
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Network error — please check your connection.';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}
