"use client";

import { useEffect, useState } from "react";

interface DeveloperInfo {
  isLoggedIn: boolean;
  rankLabel: string;
  developerName: string;
}

const Footer = () => {
  const [info, setInfo] = useState<DeveloperInfo>({
    isLoggedIn: false,
    rankLabel: "مقدم",
    developerName: "كريم احمد مصطفى",
  });

  useEffect(() => {
    let isMounted = true;
    const fetchInfo = async () => {
      try {
        const res = await fetch("/api/system/developer-info", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setInfo({
              isLoggedIn: !!data.isLoggedIn,
              rankLabel: data.rankLabel || "مقدم",
              developerName: data.developerName || "كريم احمد مصطفى",
            });
          }
        }
      } catch {
        // Fallback silently
      }
    };

    fetchInfo();

    const handleFocus = () => {
      fetchInfo();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <footer className="w-full text-(--app-white) mt-auto py-4 px-8 shadow-inner bg-primary-gradient dark:border-t dark:border-(--color-primary)/20 dark:shadow-none select-none">
      <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-3">
        {/* Right Slot (in RTL) - Spacer to keep center slot perfectly centered */}
        <div className="hidden md:block" />

        {/* Center Slot - Brand Name (Always Centered) */}
        <div className="text-sm font-medium opacity-90 text-center flex items-center justify-center gap-2">
          <span>© 2026</span>
          <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-[var(--app-radius-sm)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-(--app-success) opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-(--app-success)"></span>
            </span>
            <span className="font-bold text-xs">الأرشيف الإلكتروني</span>
          </span>
          <span>جميع الحقوق محفوظة.</span>
        </div>

        {/* Left Slot (in RTL) - Developer Attribution (Logged-in only) */}
        <div className="text-sm font-medium opacity-90 text-center md:text-left">
          {info.isLoggedIn && (
            <div>
              تطوير{" "}
              <span className="font-bold text-white pb-0.5">
                {info.rankLabel}
              </span>{" "}
              /{" "}
              <span className="font-bold text-white pb-0.5">
                {info.developerName}
              </span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
