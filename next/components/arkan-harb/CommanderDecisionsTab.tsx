import React from "react";
import { format } from "date-fns";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { MonoBadge } from "@/components/ui/mono-badge";
import { formatDateWithDay } from "@/lib/utils/date-display";
import { formatOfficerLabel } from "@/lib/db/models/Officer.shared";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from "@/lib/db/models/Leave.shared";
import type { PopulatedCommanderDecisionDoc, PopulatedOfficer } from "@/lib/arkan-harb/server-queries";

interface CommanderDecisionsTabProps {
  totalDecisions: number;
  approvedDecisions: number;
  rejectedDecisions: number;
  otherOrdersDecisions: number;
  displayedDecisions: PopulatedCommanderDecisionDoc[];
  totalCount: number;
  searchQuery: string;
}

export function CommanderDecisionsTab({
  totalDecisions,
  approvedDecisions,
  rejectedDecisions,
  otherOrdersDecisions,
  displayedDecisions,
  totalCount,
  searchQuery,
}: CommanderDecisionsTabProps) {
  return (
    <div className="space-y-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-(--app-surface) border border-(--app-border) shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-(--app-muted-foreground)">إجمالي القرارات</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-(--color-primary) font-mono">{totalDecisions}</span>
            <span className="text-[10px] font-bold text-(--app-muted-foreground)">قرار مسجل</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-(--app-surface) border border-(--app-border) shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-(--app-muted-foreground)">مصدق عليها</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-(--color-primary) font-mono">{approvedDecisions}</span>
            <span className="text-[10px] font-bold text-(--app-muted-foreground)">تصديق</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-(--app-surface) border border-(--app-border) shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-(--app-muted-foreground)">لم يتصدق</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-(--color-primary) font-mono">{rejectedDecisions}</span>
            <span className="text-[10px] font-bold text-(--app-muted-foreground)">رفض</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-(--app-surface) border border-(--app-border) shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-(--app-muted-foreground)">أوامر وتعليمات أخرى</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-(--color-primary) font-mono">{otherOrdersDecisions}</span>
            <span className="text-[10px] font-bold text-(--app-muted-foreground)">توجيه</span>
          </div>
        </div>
      </div>

      <SectionWrapper>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-4 bg-(--color-primary) rounded-full"></div>
            <h3 className="text-sm font-black text-(--color-primary)">
              سجل قرارات وتوجيهات السيد القائد
            </h3>
          </div>
          <span className="text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface-container) px-3 py-1 rounded-full border border-(--app-border)">
            {searchQuery
              ? `${displayedDecisions.length} من أصل ${totalCount} قرار`
              : `أحدث ${totalCount} قرار وتوجيه`}
          </span>
        </div>

        {displayedDecisions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-black text-(--app-foreground)">
              {searchQuery ? "لا توجد قرارات مطابقة للبحث المحدد" : "لا توجد قرارات مسجلة حديثاً من السيد القائد"}
            </p>
            <p className="text-xs font-bold text-(--app-muted-foreground)">
              {searchQuery
                ? "حاول تغيير نص البحث للوصول للقرار المطلوب."
                : "سيتم إدراج توجيهات وقرارات القائد هنا فور اعتمادها أو رفضها."}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {displayedDecisions.map((dec) => {
              const off = dec.officerId as unknown as PopulatedOfficer | null;

              const officerFullLabel = off
                ? formatOfficerLabel(off.fullName || "", off.rank || "", off.isArkanHarb)
                : "ضابط غير معروف";

              const isApproved = dec.commanderDecision?.status === "approved";
              const isRejected = dec.commanderDecision?.status === "rejected";
              const isOtherOrders = dec.commanderDecision?.status === "other_orders";

              const leaveTypeLabel =
                LEAVE_TYPE_LABELS[dec.type as keyof typeof LEAVE_TYPE_LABELS] || dec.type;
              const statusLabel = isApproved
                ? "مصدق عليها"
                : isRejected
                ? "لم يتصدق"
                : isOtherOrders
                ? "أوامر أخرى"
                : LEAVE_STATUS_LABELS[dec.status as keyof typeof LEAVE_STATUS_LABELS] || dec.status;

              // Calculate leave duration days
              const sDate = new Date(dec.startDate);
              const eDate = new Date(dec.endDate);
              const dayCount =
                !isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate >= sDate
                  ? Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                  : 0;

              return (
                <div
                  key={dec._id.toString()}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-(--app-surface-container-low) rounded-2xl border border-(--app-border) hover:border-(--color-primary)/30 transition-all shadow-xs"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-(--app-surface) rounded-xl shadow-xs text-(--color-primary) border border-(--app-border) shrink-0 mt-0.5">
                      {isApproved ? (
                        <CheckCircle2 className="w-5 h-5 text-(--color-primary)" />
                      ) : isRejected ? (
                        <XCircle className="w-5 h-5 text-(--color-primary)" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-(--color-primary)" />
                      )}
                    </div>
                    <div className="space-y-1.5 text-right flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-(--color-primary)">
                          {officerFullLabel}
                        </span>
                        {off?.militaryId && (
                          <MonoBadge
                            label="ر.ع"
                            value={off.militaryId}
                            size="sm"
                            variant="surface"
                          />
                        )}
                        {off?.seniorityNumber && (
                          <MonoBadge
                            label="أقدمية"
                            value={off.seniorityNumber}
                            size="sm"
                            variant="muted"
                          />
                        )}
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20">
                          طلب إجازة {leaveTypeLabel} {dayCount > 0 ? `(${dayCount} ${dayCount <= 10 ? "أيام" : "يوم"})` : ""}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-(--app-surface) text-(--app-muted-foreground) border border-(--app-border)">
                          الحالة: {statusLabel}
                        </span>
                      </div>

                      <div className="p-2.5 bg-(--app-surface) rounded-xl border border-(--app-border) text-xs font-bold text-(--app-foreground) flex items-center gap-2">
                        <span className="text-(--color-primary) shrink-0 font-extrabold">توجيه القائد:</span>
                        <span className="text-(--app-foreground)">
                          {dec.commanderDecision?.notes ||
                            (isApproved
                              ? "تم التصديق"
                              : isRejected
                              ? "لم يتصدق"
                              : "أوامر وتعليمات أخرى")}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap text-[11px] font-bold text-(--app-muted-foreground)/80">
                        <span>
                          الفترة: من{" "}
                          <span className="font-extrabold text-(--app-foreground)">
                            {formatDateWithDay(dec.startDate)}
                          </span>{" "}
                          إلى{" "}
                          <span className="font-extrabold text-(--app-foreground)">
                            {formatDateWithDay(dec.endDate)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0 md:self-center">
                    <div className="inline-flex flex-col items-end gap-1 bg-(--app-surface) px-3 py-1.5 rounded-xl border border-(--app-border) shadow-xs">
                      <span className="text-[9px] font-bold text-(--app-muted-foreground)">تاريخ إصدار القرار</span>
                      <span className="text-[11px] font-mono font-bold text-(--color-primary)">
                        {dec.commanderDecision?.decidedAt
                          ? format(new Date(dec.commanderDecision.decidedAt), "HH:mm - yyyy/MM/dd")
                          : "ـ"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionWrapper>
    </div>
  );
}
