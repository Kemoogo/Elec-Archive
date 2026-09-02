"use client";

import * as React from "react";
import { 
  Calendar, 
  Plane, 
  History, 
  XCircle, 
  MapPin,
  TrendingUp,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionWrapper } from "@/components/ui/section-wrapper";

export type TimelineEventType = "join" | "promotion" | "mission" | "transfer" | "termination" | "return" | "death" | "retirement";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: Date | string | number;
  endDate?: Date | string | number;
  title: string;
  description?: string;
  badge?: string;
  status?: string;
  statusLabel?: string;
  statusColor?: string;
  metadata?: Record<string, unknown>;
}

interface CareerTimelineProps {
  events: TimelineEvent[];
  officerName: string;
}

const EVENT_CONFIG: Record<TimelineEventType, { icon: React.ElementType, color: string, label: string }> = {
  join: { 
    icon: UserPlus, 
    color: "bg-(--app-info)", 
    label: "انضمام" 
  },
  promotion: { 
    icon: TrendingUp, 
    color: "bg-(--app-warning)", 
    label: "ترقية" 
  },
  mission: { 
    icon: Plane, 
    color: "bg-(--app-info)", 
    label: "مأمورية" 
  },
  transfer: { 
    icon: MapPin, 
    color: "bg-(--app-success)", 
    label: "نقل" 
  },
  termination: { 
    icon: XCircle, 
    color: "bg-(--app-error)", 
    label: "إنهاء خدمة" 
  },
  return: { 
    icon: History, 
    color: "bg-(--app-info)", 
    label: "عودة للخدمة" 
  },
  death: { 
    icon: XCircle, 
    color: "bg-(--app-muted-foreground)", 
    label: "وفاة" 
  },
  retirement: { 
    icon: XCircle, 
    color: "bg-(--app-warning)", 
    label: "تقاعد" 
  },
};

export function CareerTimeline({ events, officerName }: CareerTimelineProps) {
  // Sort events by date descending (newest first)
  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="لا يوجد سجل تاريخي"
        description={`لم يتم تسجيل أي أحداث تاريخية للضابط ${officerName} حتى الآن`}
      />
    );
  }

  return (
    <div className="relative space-y-8 pr-1">
      {/* Central Line */}
      <div className="absolute right-[21px] top-2 bottom-2 w-0.5 bg-(--app-border)" />

      {sortedEvents.map((event) => {
        const config = EVENT_CONFIG[event.type];
        const Icon = config.icon;

        return (
          <div key={event.id} className="relative pr-12 group">
            {/* Event Node */}
            <div className={cn(
              "absolute right-0 top-0 h-11 w-11 rounded-full border-4 border-(--app-surface) shadow-sm flex items-center justify-center z-10 transition-transform duration-200 group-hover:scale-110",
              config.color
            )}>
              <Icon className="h-5 w-5 text-white" />
            </div>

            {/* Event Card */}
            <SectionWrapper className="!p-5 transition-all duration-200 hover:shadow-md hover:border-(--app-muted-foreground)/20">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-(--app-surface-container) text-(--app-muted-foreground) text-xs font-bold border border-(--app-border)">
                      {config.label}
                    </span>
                    {event.badge && (
                      <span className="px-2.5 py-1 rounded-md bg-(--app-warning)/10 text-(--app-warning) text-xs font-bold border border-(--app-warning)/20">
                        {event.badge}
                      </span>
                    )}
                    {event.statusLabel && (
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-bold border",
                        event.statusColor || "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)"
                      )}>
                        {event.statusLabel}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-(--color-primary) leading-tight">
                      {event.title}
                    </h4>
                    {event.description && (
                      <p className="text-sm text-(--app-muted-foreground) leading-relaxed max-w-3xl">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pt-1">
                  <div className="flex items-center gap-2 text-(--app-muted-foreground) font-mono text-xs bg-(--app-surface-container) px-3 py-1.5 rounded-lg border border-(--app-border)">
                    <Calendar className="h-3.5 w-3.5" />
                    <span dir="ltr" suppressHydrationWarning>
                      {new Date(event.date).toLocaleDateString("ar-EG", { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    {event.endDate && (
                      <>
                        <span className="opacity-30 mx-1">/</span>
                        <span dir="ltr" suppressHydrationWarning>
                          {new Date(event.endDate).toLocaleDateString("ar-EG", { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </SectionWrapper>
          </div>
        );
      })}
    </div>
  );
}
