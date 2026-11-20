"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

export interface HistoricalTabHandle {
  openCreateModal: () => void;
  openProfileModal?: () => void;
}

interface UseHistoricalTabSyncOptions<TResponse> {
  endpoint: string;
  searchQuery: string;
  buildParams: (searchText: string) => URLSearchParams;
  loadErrorMessage: string;
  fallbackErrorMessage: string;
  onLoaded: (data: TResponse) => void;
  deps: readonly unknown[];
}

/**
 * Shared client synchronization hook for Historical Record timeline tabs:
 * synchronizes external main-header search query & tab filters with AbortController
 * cancellation (without loading-state flicker) and handles governance DELETE requests.
 */
export function useHistoricalTabSync<TResponse>({
  endpoint,
  searchQuery,
  buildParams,
  loadErrorMessage,
  fallbackErrorMessage,
  onLoaded,
  deps,
}: UseHistoricalTabSyncOptions<TResponse>) {
  const { showToast } = useToast();
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
    const trimmed = searchQuery.trim();
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      if (trimmed.length < 2) return;
    }
    if (trimmed.length === 1) return;
    const timerId = window.setTimeout(() => {
      void fetchList(trimmed);
    }, 0);
    return () => window.clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, fetchList, ...deps]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

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
        void fetchList(searchQuery);
      } catch {
        showToast("حدث خطأ أثناء الحذف", "error");
      } finally {
        setDeleting(false);
      }
    },
    [endpoint, fetchList, searchQuery, showToast],
  );

  return {
    loading,
    deleting,
    fetchList,
    executeDelete,
  };
}
