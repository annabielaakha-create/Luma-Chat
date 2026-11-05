/**
 * LUMA AI — Firestore Data Normalizer
 * Recursively removes undefined fields from objects and arrays before writing to Firestore.
 * Preserves null, false, 0, "", Date, and Firestore sentinel values without using JSON parse/stringify.
 */

export function normalizeFirestoreData<T = any>(data: T): T {
  if (data === undefined) {
    return undefined as unknown as T;
  }

  // Preserve null, primitive numbers (including 0), booleans (including false), strings (including "")
  if (data === null || typeof data !== 'object') {
    return data;
  }

  // Preserve Date objects
  if (data instanceof Date) {
    return data as unknown as T;
  }

  // Check for Firestore Sentinel values or custom FieldValues (e.g. serverTimestamp(), deleteField())
  // They typically have internal constructors, _methodName, or isEqual methods
  const obj = data as Record<string, any>;
  if (
    typeof obj._methodName === 'string' ||
    (typeof obj.isEqual === 'function' && typeof obj.toMillis === 'function')
  ) {
    return data;
  }

  // Handle Arrays: recursively normalize elements and filter out undefined entries
  if (Array.isArray(data)) {
    const cleanedArray: any[] = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item !== undefined) {
        const cleanedItem = normalizeFirestoreData(item);
        if (cleanedItem !== undefined) {
          cleanedArray.push(cleanedItem);
        }
      }
    }
    return cleanedArray as unknown as T;
  }

  // Handle plain objects: recursively copy only non-undefined keys
  const cleanedObj: Record<string, any> = {};
  const keys = Object.keys(obj);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const val = obj[key];

    if (val !== undefined) {
      const cleanedVal = normalizeFirestoreData(val);
      if (cleanedVal !== undefined) {
        cleanedObj[key] = cleanedVal;
      }
    }
  }

  return cleanedObj as T;
}
