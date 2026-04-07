import { ReactNode, ElementType } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";

interface PageHeaderProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  description?: string | ReactNode; // Alias for subtitle for compatibility
  icon?: ElementType;
  actions?: ReactNode;
  action?: ReactNode; // Alias for actions for compatibility
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle, 
  description,
  icon: Icon = LayoutDashboard, 
  actions, 
  action,
  backHref, 
  backLabel = "رجوع",
  children 
}: PageHeaderProps) {
  const displaySubtitle = subtitle || description;
  const displayActions = actions || action;

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-(--color-surface) rounded-2xl shadow-sm border border-(--color-border) mb-6">
        <div className="flex items-center gap-4">
            <div className="bg-(--color-primary) p-3 rounded-xl text-white shadow-md shadow-blue-900/10 flex items-center justify-center">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                {backHref && (
                    <Link 
                        href={backHref}
                        className="mb-1 flex w-fit items-center text-[10px] font-bold text-(--color-muted) transition hover:text-(--color-primary)"
                    >
                        <ArrowRight className="ml-1 h-3 w-3" />
                        {backLabel}
                    </Link>
                )}
                <h1 className="text-xl font-black text-(--color-primary) leading-tight">{title}</h1>
                {displaySubtitle && (
                    <p className="text-xs text-(--color-muted) font-bold mt-1">{displaySubtitle}</p>
                )}
            </div>
        </div>
        <div className="flex gap-2 items-center">
            {children}
            {displayActions}
        </div>
    </header>
  );
}
