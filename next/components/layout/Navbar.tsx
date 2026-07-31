"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, Sparkles, ShieldCheck, ArrowLeft, Menu, X } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { ThemeToggle } from "./ThemeToggle";
import { Spotlight } from "@/components/ui/spotlight";

interface NavbarProps {
  onLoginClick?: () => void;
}

const landingLinks = [
  { id: "modules", href: "#modules", label: "وحدات المنظومة" },
  { id: "security", href: "#security", label: "الأمان والسرية" },
  { id: "about", href: "#about", label: "عن المنظومة" },
];

const Navbar = ({ onLoginClick }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    if (pathname === "/") {
      e.preventDefault();
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <header className="w-full text-(--app-white) sticky top-0 z-50 overflow-visible bg-primary-gradient border-b border-white/10 backdrop-blur-2xl shadow-xl transition-all duration-300">
      <Spotlight className="w-full h-full bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 relative">
            {/* Logo & Brand Identity */}
            <Link
              className="font-bold tracking-tight flex items-center gap-3 shrink-0 group transition-all duration-300 hover:scale-[1.01]"
              href="/"
            >
                <BrandIcon size="lg" showGlow />
              <div className="flex flex-col items-start gap-0.5 leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-(--app-white) text-lg sm:text-2xl font-black tracking-tight drop-shadow-md whitespace-nowrap transition-colors duration-300 group-hover:text-blue-100">
                    الأرشيف الإلكتروني
                  </span>
                  <Sparkles className="w-4 h-4 text-blue-200 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-0.5" />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-blue-100/80 text-[9px] font-extrabold tracking-[0.22em] uppercase transition-opacity duration-300 group-hover:text-white"
                    dir="ltr"
                  >
                    Electronic Archive
                  </span>
                  <span
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-400/15 text-emerald-300 border border-emerald-400/20"
                    dir="rtl"
                  >
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>آمن ومحلي 100%</span>
                  </span>
                </div>
              </div>
            </Link>

            {/* Real Application Section Nav Links */}
            <nav className="hidden md:flex items-center gap-1 bg-white/10 border border-white/20 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-inner">
              {landingLinks.map((link) => (
                <Link
                  key={link.id}
                  href={pathname === "/" ? link.href : `/${link.href}`}
                  onClick={(e) => handleNavClick(e, link.id)}
                  className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-blue-100 hover:text-white hover:bg-white/15 transition-all duration-200 cursor-pointer"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Login Button Aligned with Sapphire Archive Surface & Primary Color Tokens */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />

              {onLoginClick ? (
                <button
                  onClick={onLoginClick}
                  className="group relative flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-(--app-surface) text-(--color-primary) font-black text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:bg-(--app-surface-container) border border-white/30 transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-(--color-primary) transition-transform duration-300 group-hover:scale-110" />
                  <span>تسجيل الدخول</span>
                  <ArrowLeft className="w-4 h-4 text-(--color-primary)/70 transition-transform duration-300 group-hover:-translate-x-1" />
                </button>
              ) : (
                <Link
                  href="/login"
                  className="group relative flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-(--app-surface) text-(--color-primary) font-black text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:bg-(--app-surface-container) border border-white/30 transition-all duration-300 active:scale-95"
                >
                  <LogIn className="w-4 h-4 text-(--color-primary) transition-transform duration-300 group-hover:scale-110" />
                  <span>تسجيل الدخول</span>
                  <ArrowLeft className="w-4 h-4 text-(--color-primary)/70 transition-transform duration-300 group-hover:-translate-x-1" />
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 active:scale-90 transition-transform cursor-pointer"
                aria-label="القائمة"
                type="button"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </Spotlight>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden bg-slate-950/95 backdrop-blur-2xl border-b border-white/10 px-6 py-6 space-y-4 animate-fade-in-up"
          dir="rtl"
        >
          <div className="flex flex-col space-y-2">
            {landingLinks.map((link) => (
              <Link
                key={link.id}
                href={pathname === "/" ? link.href : `/${link.href}`}
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleNavClick(e, link.id);
                }}
                className="px-4 py-3 rounded-xl text-sm font-bold text-slate-200 hover:bg-white/10 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            {onLoginClick ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLoginClick();
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-(--app-surface) text-(--color-primary) font-black text-sm shadow-lg cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول للنظام</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-(--app-surface) text-(--color-primary) font-black text-sm shadow-lg"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول للنظام</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
