import { useState, useCallback, useMemo } from "react";

/**
 * Normalizes values for form field comparison.
 * Empty string, null, and undefined are treated as empty equivalents in form inputs.
 */
function isNilOrEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

/**
 * Deep comparison across primitives, objects, arrays, and date strings/objects.
 */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  // Form equivalence: null, undefined, and empty string are equivalent
  if (isNilOrEmpty(a) && isNilOrEmpty(b)) return true;

  // If one is nil/empty and the other is not
  if (isNilOrEmpty(a) || isNilOrEmpty(b)) return false;

  // Date comparison (Date objects or Date vs string)
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof Date && typeof b === "string") {
    const timeB = new Date(b).getTime();
    return !Number.isNaN(timeB) && a.getTime() === timeB;
  }
  if (typeof a === "string" && b instanceof Date) {
    const timeA = new Date(a).getTime();
    return !Number.isNaN(timeA) && timeA === b.getTime();
  }

  // If types differ after handling dates and empty states
  if (typeof a !== typeof b) return false;

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(a) || Array.isArray(b)) return false;

  // Object comparison
  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    const allKeys = new Set([...keysA, ...keysB]);

    for (const key of allKeys) {
      if (!isDeepEqual(objA[key], objB[key])) return false;
    }
    return true;
  }

  return false;
}

export interface UseFormDirtyReturn<T extends Record<string, unknown>> {
  isDirty: boolean;
  resetBaseline: (newBaseline?: T) => void;
  changedKeys: (keyof T)[];
}

/**
 * Lightweight, robust, zero-dependency hook for tracking form dirty states.
 * Compares current values against a baseline (initialized from initialValues).
 *
 * @param initialValues The baseline state of the form
 * @param currentValues The current state of the form
 * @returns { isDirty, resetBaseline, changedKeys }
 */
export function useFormDirty<T extends Record<string, unknown>>(
  initialValues: T,
  currentValues: T
): UseFormDirtyReturn<T> {
  const [customBaseline, setCustomBaseline] = useState<T | null>(null);
  const [lastInitial, setLastInitial] = useState<T>(initialValues);

  // If initialValues changes deeply, reset custom baseline during render
  let activeBaseline = customBaseline ?? initialValues;
  if (!isDeepEqual(lastInitial, initialValues)) {
    setLastInitial(initialValues);
    setCustomBaseline(null);
    activeBaseline = initialValues;
  }

  const resetBaseline = useCallback(
    (newBaseline?: T) => {
      setCustomBaseline(newBaseline ? { ...newBaseline } : { ...currentValues });
    },
    [currentValues]
  );

  const changedKeys = useMemo(() => {
    const allKeys = Array.from(
      new Set([...Object.keys(activeBaseline), ...Object.keys(currentValues)])
    ) as (keyof T)[];

    return allKeys.filter((key) => !isDeepEqual(activeBaseline[key], currentValues[key]));
  }, [activeBaseline, currentValues]);

  const isDirty = changedKeys.length > 0;

  return {
    isDirty,
    resetBaseline,
    changedKeys,
  };
}
