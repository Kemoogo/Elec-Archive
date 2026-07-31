"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * Monitors the database connection by polling /api/health every 30 seconds.
 * When the connection transitions from "disconnected" → "connected",
 * a success toast is shown to inform the user the database is back online.
 */
export function DbConnectionTracker() {
  const { showToast } = useToast();
  const wasDisconnectedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function checkConnection() {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();

        if (data.db === "connected") {
          if (wasDisconnectedRef.current) {
            // Transitioned from disconnected → connected
            showToast("تمت استعادة الاتصال بقاعدة البيانات", "success");
          }
          wasDisconnectedRef.current = false;
        } else {
          wasDisconnectedRef.current = true;
        }
      } catch {
        // Network error — treat as disconnected
        wasDisconnectedRef.current = true;
      }
    }

    // Initial check
    checkConnection();

    // Poll every 30 seconds
    const intervalId = setInterval(() => {
      if (active) checkConnection();
    }, 30_000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [showToast]);

  // This component does not render anything
  return null;
}
