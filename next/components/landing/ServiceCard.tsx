"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, LucideIcon } from 'lucide-react';

interface ServiceCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    actionLabel?: string;
    href?: string;
    onAction?: () => void;
    badge?: string;
    disabled?: boolean;
    showAction?: boolean;
}

export default function ServiceCard({
    title,
    description,
    icon: Icon,
    actionLabel = "فتح الخدمة",
    href,
    onAction,
    badge,
    disabled = false,
    showAction = true,
}: ServiceCardProps) {
    const actionClassName = [
        "mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
        disabled
            ? "bg-(--app-surface-container) text-(--app-muted-foreground) cursor-not-allowed"
            : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] hover:-translate-y-0.5",
    ].join(" ");

    return (
        <div
            className="group h-full bg-(--app-surface) p-6 md:p-7 rounded-3xl border border-(--app-border) shadow-sm hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex flex-col"
        >
            {badge && (
                <span className="absolute top-4 left-4 rounded-lg bg-(--app-info)/10 border border-(--app-info)/20 text-(--app-info) text-[10px] font-black px-2 py-1">
                    {badge}
                </span>
            )}

            <div className="w-14 h-14 bg-linear-to-br from-(--color-primary) to-(--color-primary-hover) text-white rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-900/20 group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-(--app-foreground) group-hover:text-(--color-primary) transition-colors duration-200 mb-2">{title}</h3>
            <p className="text-(--app-muted-foreground) text-sm font-bold leading-relaxed flex-1">
                {description}
            </p>

            {showAction && (href || onAction) ? (
                href && !disabled && !onAction ? (
                    <Link href={href} className={actionClassName}>
                        {actionLabel}
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={onAction}
                        disabled={disabled}
                        className={actionClassName}
                    >
                        {actionLabel}
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    </button>
                )
            ) : null}

            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-(--app-info)/10 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10 opacity-60" />
        </div>
    );
}
