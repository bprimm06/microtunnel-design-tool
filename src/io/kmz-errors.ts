/** Typed import errors with stable codes for UI display. */
export type ImportErrorCode =
  | 'NOT_KMZ_OR_KML'
  | 'NO_KML_IN_ARCHIVE'
  | 'KML_PARSE_ERROR'
  | 'NO_LINESTRING'
  | 'EMPTY_LINESTRING'
  | 'INVALID_COORDINATE';

export class ImportError extends Error {
  readonly code: ImportErrorCode;
  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = 'ImportError';
    this.code = code;
  }
}
