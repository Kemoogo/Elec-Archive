import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { DbConnectionTracker } from "@/components/db/DbConnectionTracker";
import Footer from "@/components/layout/Footer";

import { ScrollToTop } from "@/components/ui/ScrollToTop";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
  preload: false,
  fallback: ["Cairo", "Segoe UI", "Tahoma", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "الأرشيف الإلكتروني",
  description: "نظام إدارة الأرشيف الإلكتروني",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`h-full antialiased ${cairo.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          id="theme-initializer"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                const resolved = (theme === 'dark' || theme === 'light') ? theme : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(resolved);
                document.documentElement.setAttribute('data-theme', resolved);
                document.documentElement.style.colorScheme = resolved;
              } catch (e) {}

              // Safeguard for Next.js / Turbopack dev server bug: Performance.measure negative attribute end
              if (typeof window !== 'undefined' && window.performance && window.performance.measure) {
                const origMeasure = window.performance.measure.bind(window.performance);
                window.performance.measure = function(name, startOrMeasureOptions, endMark) {
                  try {
                    if (typeof startOrMeasureOptions === 'object' && startOrMeasureOptions !== null) {
                      if (typeof startOrMeasureOptions.end === 'number' && startOrMeasureOptions.end < 0) {
                        startOrMeasureOptions.end = Math.max(0, performance.now());
                      }
                      if (typeof startOrMeasureOptions.duration === 'number' && startOrMeasureOptions.duration < 0) {
                        startOrMeasureOptions.duration = 0;
                      }
                    }
                    return origMeasure(name, startOrMeasureOptions, endMark);
                  } catch (err) {
                    // Suppress Next.js dev server performance measure timing mismatch errors
                    return undefined;
                  }
                };
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${cairo.className} min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-blue-500/20 selection:text-blue-600 dark:selection:text-blue-400`}>
        <ThemeProvider>
          <ToastProvider>
            <DbConnectionTracker />
            <main className="flex-1">{children}</main>
            <Footer />
            <ScrollToTop />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
