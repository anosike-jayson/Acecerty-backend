import { TransformFnParams } from 'class-transformer';

/**
 * When a request arrives as multipart/form-data, array/object fields come in as
 * JSON strings. These transforms make a single DTO work for both JSON and
 * multipart bodies. They are idempotent: native arrays/booleans pass through
 * unchanged, so pure-JSON requests behave exactly as before.
 */

/** Parses a JSON string into an array; leaves arrays untouched. Bad JSON is
 * returned as-is so the downstream @IsArray validator produces a clean 400. */
export function jsonArrayTransform({ value }: TransformFnParams) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/** Coerces "true"/"false"/"1"/"0" (multipart strings) to booleans. */
export function booleanTransform({ value }: TransformFnParams) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}
