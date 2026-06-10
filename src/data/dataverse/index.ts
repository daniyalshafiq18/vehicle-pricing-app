/**
 * Dataverse module barrel export.
 *
 * Export only what external modules need:
 *   - DataverseDataSource (the IDataSource implementation)
 *   - dvClient (for ad-hoc API calls if needed)
 *   - Error types + helper for custom error handling
 *
 * Internal utilities (mappings, queries, mapper, types) are intentionally
 * not re-exported here — they're implementation details consumed by
 * DataverseDataSource only.
 */

export { DataverseDataSource } from './dataverseDataSource';
export { dvClient } from './dataverseClient';
export { DataverseError, DataverseAuthError, DataverseNetworkError, DataverseNotFoundError, DataverseMappingError, toUserMessage } from './errors';
