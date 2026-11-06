import { useEffect, useState, useRef, useCallback } from "react";

/**
 * Standard debounce hook that delays updating the debounced value
 * until the specified delay has passed since the last value change.
 *
 * @param value The value to debounce.
 * @param delay Milliseconds to wait before updating (default: 500ms).
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to create a debounced version of a callback function.
 * Ensures the latest callback reference is called without triggering re-creation on every render.
 *
 * @param callback The function to debounce.
 * @param delay Milliseconds to wait before invocation (default: 500ms).
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number = 500
) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const debounced = useCallback(
    (...args: Args) => {
      cancel();
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [cancel, delay]
  );

  const flush = useCallback(
    (...args: Args) => {
      cancel();
      callbackRef.current(...args);
    },
    [cancel]
  );

  useEffect(() => {
    return cancel;
  }, [cancel]);

  return { debounced, cancel, flush };
}
