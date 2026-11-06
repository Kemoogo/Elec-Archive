"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function SessionWatcher() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // 1. Setup fetch interceptor
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      
      const currentPath = pathnameRef.current;
      // If we get a 401 and we are not already on the login page
      if (response.status === 401 && currentPath !== "/login" && currentPath !== "/") {
        // Only redirect if the response isn't from the login API itself
        if (typeof args[0] === 'string' && !args[0].includes('/api/auth/login')) {
          window.location.href = "/login?expired=1";
        }
      }
      
      return response;
    };

    // 2. Setup periodic session check (every 1 minute)
    const checkSession = async () => {
      try {
        const currentPath = pathnameRef.current;
        if (currentPath === "/login") return;
        const res = await originalFetch("/api/auth/me");
        if (res.status === 401 && currentPath !== "/login" && currentPath !== "/") {
          window.location.href = "/login?expired=1";
        }
      } catch (err) {
        console.error("[SessionWatcher] Session check failed:", err);
      }
    };

    const intervalId = setInterval(checkSession, 60000); // 1 minute

    return () => {
      window.fetch = originalFetch;
      clearInterval(intervalId);
    };
  }, []);

  return null;
}
