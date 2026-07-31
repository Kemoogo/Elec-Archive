"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface BrandIconProps extends React.SVGProps<SVGSVGElement> {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showGlow?: boolean;
  showStatusDot?: boolean;
  variant?: "gradient" | "monochrome" | "shield-only";
}

const sizeMap = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-12 h-12",
  "2xl": "w-16 h-16",
};

export function BrandIcon({
  size = "md",
  className,
  showGlow = false,
  showStatusDot = true,
  variant = "gradient",
  ...props
}: BrandIconProps) {
  const rawId = useId();
  const cleanId = rawId.replace(/:/g, "");
  const shieldGradId = `brand-shield-grad-${cleanId}`;
  const coreGradId = `brand-core-grad-${cleanId}`;
  const borderGradId = `brand-border-grad-${cleanId}`;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0 group select-none">
      {/* Dynamic Ambient Background Glow */}
      {showGlow && (
        <div
          className={cn(
            "absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600/50 via-cyan-500/40 to-sky-400/30 blur-lg opacity-70 group-hover:opacity-100 group-hover:blur-xl transition-all duration-500 pointer-events-none",
            sizeMap[size]
          )}
        />
      )}

      {/* Modern High-End High-Tech Archive SVG Emblem */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "relative z-10 transition-all duration-500 ease-out group-hover:scale-105 drop-shadow-[0_4px_12px_rgba(37,99,235,0.35)]",
          sizeMap[size],
          className
        )}
        {...props}
      >
        <defs>
          {/* Main Vault Shield Gradient */}
          <linearGradient
            id={shieldGradId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Central Digital Core Gradient */}
          <linearGradient
            id={coreGradId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>

          {/* Outer Bezel Border Metallic Glow */}
          <linearGradient
            id={borderGradId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Outer Shield Shell (Vault Protection) */}
        <path
          d="M32 4L54 13.5V28C54 43.5 44 54.5 32 60C20 54.5 10 43.5 10 28V13.5L32 4Z"
          fill={`url(#${shieldGradId})`}
        />

        {/* Outer Bezel Metallic Rim Accent */}
        <path
          d="M32 4L54 13.5V28C54 43.5 44 54.5 32 60C20 54.5 10 43.5 10 28V13.5L32 4Z"
          fill="none"
          stroke={`url(#${borderGradId})`}
          strokeWidth="1.75"
          strokeLinejoin="round"
        />

        {/* Inner Geometric Shield Recess */}
        <path
          d="M32 9.5L48 16.5V28C48 39.5 40 48.5 32 53C24 48.5 16 39.5 16 28V16.5L32 9.5Z"
          fill="#0B132B"
          fillOpacity="0.35"
        />

        {/* Geometric Archive Layer 1 (Back Folded Document Card) */}
        <path
          d="M24 20H38C39.6569 20 41 21.3431 41 23V39C41 40.6569 39.6569 42 38 42H24C22.3431 42 21 40.6569 21 39V23C21 21.3431 22.3431 20 24 20Z"
          fill="white"
          fillOpacity="0.12"
        />

        {/* Geometric Archive Layer 2 (Front Shield Document Layer) */}
        <path
          d="M26 23H40C41.1046 23 42 23.8954 42 25V42C42 43.1046 41.1046 44 40 44H26C24.8954 44 24 43.1046 24 42V25C24 23.8954 24.8954 23 26 23Z"
          fill="white"
          fillOpacity="0.2"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1"
        />

        {/* Cyber Core Lines & Security Nodes */}
        {/* Top Header Bar */}
        <rect x="28" y="27" width="10" height="2" rx="1" fill="#FFFFFF" opacity="0.95" />
        
        {/* Data Document Lines */}
        <line x1="28" y1="32" x2="38" y2="32" stroke={`url(#${coreGradId})`} strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="36" x2="35" y2="36" stroke={`url(#${coreGradId})`} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />

        {/* Central Security Keyhole / Lock Badge Emblem */}
        <circle cx="32" cy="42" r="2.5" fill={`url(#${coreGradId})`} />
        <path d="M32 44.5V47.5" stroke={`url(#${coreGradId})`} strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      {/* Live Active Security Pulse Dot */}
      {showStatusDot && (
        <span className="absolute -top-0.5 -right-0.5 z-20 flex h-3 w-3 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950 shadow-md" />
        </span>
      )}
    </div>
  );
}
