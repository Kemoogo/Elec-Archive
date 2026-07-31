"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getResolvedTheme(theme: Theme, defaultTheme: Theme): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  if (theme === "system" || (!theme && defaultTheme === "system")) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return (theme || defaultTheme) as "light" | "dark";
}

function applyThemeClass(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return (localStorage.getItem("theme") as Theme) || defaultTheme;
  });

  const resolvedTheme = getResolvedTheme(theme, defaultTheme);

  useEffect(() => {
    applyThemeClass(resolvedTheme);
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme, resolvedTheme]);

  const handleSystemChange = useCallback(() => {
    if (enableSystem && theme === "system") {
      applyThemeClass(getResolvedTheme("system", defaultTheme));
    }
  }, [enableSystem, theme, defaultTheme]);

  useEffect(() => {
    if (!enableSystem || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", handleSystemChange);
    return () => mq.removeEventListener("change", handleSystemChange);
  }, [theme, enableSystem, handleSystemChange]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
