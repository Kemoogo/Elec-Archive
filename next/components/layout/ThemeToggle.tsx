"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";
import { useSyncExternalStore, useState, useEffect } from "react";

function subscribe() {
  return () => {};
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!animating) return;
    const timer = setTimeout(() => setAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [animating]);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const cycleTheme = () => {
    setAnimating(true);
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const IconComponent = theme === "system" ? Monitor : theme === "light" ? Sun : Moon;

  return (
    <button
      onClick={cycleTheme}
      className="group relative flex items-center justify-center w-9 h-9 rounded-[var(--app-radius-xl)] bg-white/8 hover:bg-white/20 border border-white/12 hover:border-white/30 transition-all duration-300 ease-out active:scale-90 cursor-pointer"
      aria-label="تبديل الوضع"
    >
      {/* Premium glow */}
      <span className="absolute inset-0 rounded-[var(--app-radius-xl)] opacity-0 group-hover:opacity-100
        transition-opacity duration-300
        bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />

      {/* Premium animated icon */}
      <span
        className={`relative z-10 ${
          animating ? "animate-[spin_0.5s_cubic-bezier(0.34,1.56,0.64,1)] scale-110" : "scale-100 transition-transform duration-200"
        }`}
      >
        <IconComponent className="w-[18px] h-[18px] text-white/80 group-hover:text-white transition-colors duration-200" />
      </span>

      {/* Premium tooltip using --app-radius-sm */}
      <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap
        text-[10px] font-bold text-white/90 bg-slate-900/90 border border-white/10 px-2 py-0.5 rounded-[var(--app-radius-sm)] shadow-lg
        opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none
        drop-shadow-lg z-50">
        {theme === "system" ? "تلقائي" : theme === "light" ? "فاتح" : "داكن"}
      </span>
    </button>
  );
}
