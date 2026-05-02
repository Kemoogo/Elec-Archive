"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function SessionWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Setup fetch interceptor
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      
      // If we get a 401 and we are not already on the login page
      if (response.status === 401 && pathname !== "/login" && pathname !== "/") {
        // Only redirect if the response isn't from the login API itself
        if (typeof args[0] === 'string' && !args[0].includes('/api/auth/login')) {
          router.push("/login?expired=1");
        }
      }
      
      return response;
    };

    // 2. Setup periodic session check (every 1 minute)
    const checkSession = async () => {
      try {
        // Ping auth endpoint to check if token is still valid
        const res = await originalFetch("/api/auth/me");
        if (res.status === 401 && pathname !== "/login" && pathname !== "/") {
          router.push("/login?expired=1");
        }
      } catch (err) {
        // Ignore network errors, don't force logout for brief connection loss
      }
    };

    const intervalId = setInterval(checkSession, 60000); // 1 minute

    return () => {
      window.fetch = originalFetch;
      clearInterval(intervalId);
    };
  }, [router, pathname]);

  return null;
}
