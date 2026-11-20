"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { extractApiError } from "@/lib/utils";

interface UseHistoricalTabSyncOptions<TResponse> {
  endpoint: string;
  buildParams: (searchText: string) => URLSearchParams;
  loadErrorMessage: string;
  fallbackErrorMessage: string;
  onLoaded: (data: TResponse) => void;
  deps: readonly unknown[];
}

/**
 * Shared client synchronization hook for Historical Record timeline tabs:
 * handles 500ms debounced search (>= 2 chars or empty), Enter-key immediate search,
 * AbortController cancellation without loading-state flicker, and governance DELETE requests.
 */
export function useHistoricalTabSync<TResponse>({
  endpoint,
  buildParams,
  loadErrorMessage,
  fallbackErrorMessage,
  onLoaded,
  deps,
}: UseHistoricalTabSyncOptions<TResponse>) {
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const hasMountedRef = useRef(false);

  const buildParamsRef = useRef(buildParams);
  const onLoadedRef = useRef(onLoaded);

  useEffect(() => {
    buildParamsRef.current = buildParams;
    onLoadedRef.current = onLoaded;
  });

  const fetchList = useCallback(
    async (searchText: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const params = buildParamsRef.current(searchText);
        const res = await fetch(`${endpoint}?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (controller.signal.aborted) return;

        if (!res.ok || !json.success) {
          showToast(extractApiError(json, loadErrorMessage), "error");
          return;
        }
        onLoadedRef.current(json.data as TResponse);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        showToast(fallbackErrorMessage, "error");
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [endpoint, fallbackErrorMessage, loadErrorMessage, showToast],
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const trimmed = debouncedSearch.trim();
    if (trimmed.length === 1) return;
    const timerId = window.setTimeout(() => {
      void fetchList(trimmed);
    }, 0);
    return () => window.clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, fetchList, ...deps]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void fetchList(searchInput);
      }
    },
    [fetchList, searchInput],
  );

  const executeDelete = useCallback(
    async (
      id: string,
      gov: { reason: string; confirmed: true },
      messages: { fail: string; success: string },
      onSuccess: () => void,
    ) => {
      setDeleting(true);
      try {
        const res = await fetch(`${endpoint}/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gov),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          showToast(extractApiError(json, messages.fail), "error");
          return;
        }
        showToast(messages.success, "success");
        onSuccess();
        void fetchList(searchInput);
      } catch {
        showToast("حدث خطأ أثناء الحذف", "error");
      } finally {
        setDeleting(false);
      }
    },
    [endpoint, fetchList, searchInput, showToast],
  );

  return {
    searchInput,
    setSearchInput,
    loading,
    deleting,
    fetchList,
    handleSearchKeyDown,
    executeDelete,
  };
}
