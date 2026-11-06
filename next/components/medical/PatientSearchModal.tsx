"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { LoadingState } from "@/components/ui/loading-state";
import { Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface PatientResult {
  patientId: string;
  patientName: string;
}

interface PatientSearchModalProps {
  onClose: () => void;
}

export function PatientSearchModal({ onClose }: PatientSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounce(query, 500);

  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/medical/patients/search?q=${encodeURIComponent(trimmed)}&limit=20`,
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      if (response.ok) {
        const data = await response.json();
        setResults(data.data.patients || []);
      }
    } catch {
      // Silently fail or handle abort
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    executeSearch(debouncedQuery);
  }, [debouncedQuery, executeSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch(query);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <>
      <ModalShell
        title="بحث المرضى"
        icon={<Search className="w-4 h-4" />}
        onClose={onClose}
        overlayClassName="bg-black/40"
        panelClassName="max-h-[85vh] max-w-lg border-(--app-border) shadow-depth-xl"
        bodyClassName="p-6 no-scrollbar"
        footer={
          <ModalActions
            onCancel={onClose}
            cancelText="إغلاق"
            readOnly={true}
          />
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => executeSearch(query)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--app-muted-foreground) hover:text-(--color-primary) transition-colors cursor-pointer"
              title="بحث (Enter)"
            >
              <Search className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ابحث برقم المريض أو الاسم (حرفين على الأقل)..."
              className="w-full px-4 py-3 pr-10 pl-9 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              dir="rtl"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-(--app-border) rounded-md text-(--app-muted-foreground) hover:text-(--color-primary) transition-colors cursor-pointer"
                title="مسح النص"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {loading && (
            <LoadingState message="جاري البحث..." variant="inline" className="py-6" />
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="empty-section py-8">
              <Users className="w-12 h-12 text-(--app-muted-foreground)/40" />
              <p className="text-sm font-bold text-(--app-muted-foreground)">لا يوجد مريض بهذا الرقم</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
              {results.map((patient) => (
                <button
                  key={patient.patientId}
                  type="button"
                  onClick={() => {
                    router.push(`/medical/patients/${encodeURIComponent(patient.patientId)}`);
                    onClose();
                  }}
                  className="w-full text-right px-4 py-3 rounded-xl border border-(--app-border) hover:bg-(--app-surface-container) transition-colors"
                >
                  <div className="text-sm font-bold text-(--color-primary)">{patient.patientName}</div>
                  <div className="text-xs font-mono text-(--app-muted-foreground)">{patient.patientId}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ModalShell>
    </>
  );
}
