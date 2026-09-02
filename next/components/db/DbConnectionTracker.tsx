"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { Database, RefreshCw, AlertTriangle } from "lucide-react";

/**
 * Monitors the database connection by checking /api/health.
 * When the database is disconnected or unreachable:
 * - Displays a prominent top banner: "قاعدة البيانات غير جاهزة..."
 * - Polls at a faster interval (5s) to detect recovery.
 * - Provides an immediate manual "إعادة المحاولة" (Retry) button.
 * - Displays a success toast upon reconnection.
 */
export function DbConnectionTracker() {
  const { showToast } = useToast();
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const wasDisconnectedRef = useRef(false);

  const checkConnection = useCallback(async (manual = false) => {
    if (manual) setChecking(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = await res.json().catch(() => ({ db: "disconnected" }));

      if (data.db === "connected") {
        if (wasDisconnectedRef.current) {
          // Transitioned from disconnected → connected
          showToast("تمت استعادة الاتصال بقاعدة البيانات بنجاح", "success");
        }
        wasDisconnectedRef.current = false;
        setIsDisconnected(false);
      } else {
        wasDisconnectedRef.current = true;
        setIsDisconnected(true);
        if (manual) {
          showToast("قاعدة البيانات ما زالت غير جاهزة. يرجى التأكد من تشغيل خادم MongoDB.", "error");
        }
      }
    } catch {
      // Network/fetch error — treat as disconnected
      wasDisconnectedRef.current = true;
      setIsDisconnected(true);
      if (manual) {
        showToast("تعذر الاتصال بالخادم. يرجى التحقق من الشبكة والخدمة.", "error");
      }
    } finally {
      if (manual) setChecking(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;

    async function poll() {
      if (!active) return;
      await checkConnection();
    }

    // Initial check on mount
    void poll();

    // Listen to global trigger events if any API request encounters a 503 DB error
    const handleDbErrorEvent = () => {
      if (active) {
        wasDisconnectedRef.current = true;
        setIsDisconnected(true);
        void checkConnection();
      }
    };

    window.addEventListener("db-connection-error", handleDbErrorEvent);

    // Adaptive polling: 5s when disconnected, 30s when connected
    const intervalTime = isDisconnected ? 5_000 : 30_000;
    const intervalId = setInterval(() => {
      void poll();
    }, intervalTime);

    return () => {
      active = false;
      window.removeEventListener("db-connection-error", handleDbErrorEvent);
      clearInterval(intervalId);
    };
  }, [checkConnection, isDisconnected]);

  if (!isDisconnected) return null;

  return (
    <aside
      aria-label="تنبيه اتصال قاعدة البيانات"
      className="fixed top-0 inset-x-0 z-[9999] bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white shadow-depth-lg border-b border-red-900 px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top duration-200"
      dir="rtl"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
        </span>
        <div className="flex items-center gap-1.5 text-amber-200">
          <Database className="w-4 h-4 shrink-0" />
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        </div>
        <span className="text-white text-xs font-bold leading-tight">
          قاعدة البيانات غير جاهزة — انقطع الاتصال بقاعدة البيانات. يرجى التأكد من تشغيل خادم MongoDB. (جاري المحاولة تلقائياً...)
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => checkConnection(true)}
          disabled={checking}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs font-bold shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
          <span>{checking ? "جاري الفحص..." : "إعادة المحاولة الآن"}</span>
        </button>
      </div>
    </aside>
  );
}
