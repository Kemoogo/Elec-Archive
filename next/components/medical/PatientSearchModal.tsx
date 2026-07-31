"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const queryRef = query;

  const search = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/medical/patients/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.data.patients || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      search(queryRef);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <>
      <ModalShell
        title={
          <span className="text-base font-semibold text-(--color-primary)">
            بحث المرضى
          </span>
        }
        onClose={onClose}
        overlayClassName="bg-black/40"
        panelClassName="max-h-[85vh] max-w-lg border-(--app-border) shadow-depth-xl"
        bodyClassName="p-6 no-scrollbar"
      >
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث برقم المريض أو الاسم..."
              className="w-full px-4 py-3 pr-10 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              dir="rtl"
              autoFocus
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--app-muted-foreground)" />
          </div>

          {loading && (
            <div className="text-center py-4 text-sm text-(--app-muted-foreground)">جاري البحث...</div>
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
