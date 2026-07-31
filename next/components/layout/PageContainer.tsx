import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`space-y-6 px-2 sm:px-4 md:px-0 animate-fade-in-up ${className}`} dir="rtl">
      {children}
    </div>
  );
}
