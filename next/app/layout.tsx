import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import Script from "next/script";
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
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
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
