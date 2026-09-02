"use client";

import React, { useState, useMemo } from "react";
import { ModalShell, ModalBadge } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer.shared";
import { compareOfficers } from "@/lib/officers/seniority";
import { History, Calendar, Database, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface PositionsHistoryArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HistoricalPositionRow {
  id: string;
  department: string;
  positionTitle: string;
  primaryOfficerDisplay: string;
  substituteOfficersList: string[];
  hasNoSubstitute?: boolean;
}

export function PositionsHistoryArchiveModal({ isOpen, onClose }: PositionsHistoryArchiveModalProps) {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [queriedDate, setQueriedDate] = useState<string | null>(null);
  const [data, setData] = useState<HistoricalPositionRow[]>([]);

  // Group positions by department/branch for merged row rendering
  const groupedData = useMemo(() => {
    const groups: { department: string; items: HistoricalPositionRow[] }[] = [];
    data.forEach((pos) => {
      const dept = pos.department || "القيادة";
      const existing = groups.find((g) => g.department === dept);
      if (existing) {
        existing.items.push(pos);
      } else {
        groups.push({ department: dept, items: [pos] });
      }
    });
    return groups;
  }, [data]);

  if (!isOpen) return null;

  async function handleSearch() {
    if (!selectedDate) {
      showToast("يرجى اختيار التاريخ المراد الاستعلام عنه", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/arkan-harb/positions?date=${selectedDate}`);
      const result = await res.json();
      if (!res.ok) {
        showToast(extractApiError(result, "فشل في جلب البيانات التاريخية"), "error");
        return;
      }

      interface OfficerShape {
        id?: string;
        _id?: string;
        rank?: string;
        fullName?: string;
        seniorityNumber?: string;
        isArkanHarb?: boolean;
      }
      interface HistoryPositionApiItem {
        id: string;
        department?: string;
        positionTitle: string;
        primaryOfficer?: OfficerShape | null;
        substituteOfficers?: OfficerShape[];
        hasNoSubstitute?: boolean;
      }

      const items: HistoryPositionApiItem[] = result.data?.items || [];
      const mapped: HistoricalPositionRow[] = items.map((p) => {
        let pName = "شاغر";
        if (p.primaryOfficer && typeof p.primaryOfficer === "object") {
          const rKey = p.primaryOfficer.rank;
          const rLabel = rKey ? RANK_LABELS[rKey as OfficerRank] || rKey : "";
          const arkan = p.primaryOfficer.isArkanHarb ? " أ ح" : "";
          pName = rLabel ? `${rLabel}${arkan} / ${p.primaryOfficer.fullName}` : (p.primaryOfficer.fullName || "");
        }

        const sList: string[] = [];
        if (!p.hasNoSubstitute && p.substituteOfficers && p.substituteOfficers.length > 0) {
          const sortedSubs = [...p.substituteOfficers].sort((a, b) => compareOfficers(a, b));
          sortedSubs.forEach((sub) => {
            if (typeof sub === "object") {
              const rKey = sub.rank;
              const rLabel = rKey ? RANK_LABELS[rKey as OfficerRank] || rKey : "";
              const arkan = sub.isArkanHarb ? " أ ح" : "";
              sList.push(rLabel ? `${rLabel}${arkan} / ${sub.fullName}` : sub.fullName || "");
            } else if (sub) {
              sList.push(String(sub));
            }
          });
        }

        return {
          id: p.id,
          department: p.department || "القيادة",
          positionTitle: p.positionTitle,
          primaryOfficerDisplay: pName,
          substituteOfficersList: sList,
          hasNoSubstitute: Boolean(p.hasNoSubstitute),
        };
      });

      setData(mapped);
      setQueriedDate(selectedDate);
    } catch {
      showToast("حدث خطأ أثناء تحميل السجلات التاريخية", "error");
    } finally {
      setLoading(false);
    }
  }

  let runningSerial = 1;

  return (
    <ModalShell
      title="تقرير وأرشيف الوظائف التاريخي"
      icon={<History className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName={`${
        queriedDate ? "max-w-4xl max-h-[85vh]" : "max-w-md"
      } border-(--app-border) shadow-depth-xl transition-all duration-300`}
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          submitText="استعلام عن التعيينات"
          submitLoading={loading}
          onConfirm={handleSearch}
          onCancel={onClose}
          cancelText="إلغاء"
        />
      }
    >
      {/* Date Search Input */}
      <div className="p-4 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl text-right">
        <DateField
          id="archive-date"
          label="اختر التاريخ المراد الاستعلام عن حالة الوظائف فيه"
          value={selectedDate}
          onChange={setSelectedDate}
          required
        />
      </div>

      {/* Queried Date Indicator and Results */}
      {queriedDate && (
        <div className="space-y-3">
          <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl text-right text-xs font-bold text-(--color-primary) flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-(--color-primary)" />
              <span>
                عرض التعيينات والهيكل كما كان مسجلاً بتاريخ:{" "}
                {format(new Date(queriedDate), "dd MMMM yyyy", { locale: ar })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm">
              <span className="text-xs font-bold text-(--app-muted-foreground)">إجمالي الوظائف:</span>
              <span className="text-xs font-black text-(--color-primary)">{data.length}</span>
            </div>
          </div>

          {data.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <Database className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              <h3 className="text-sm font-bold text-(--app-foreground)">لا توجد بيانات لهذا التاريخ</h3>
              <p className="text-xs text-(--app-muted-foreground)">لم يتم العثور على أي وظائف أو سجلات تعيين مطابقة للتاريخ المحدد.</p>
            </div>
          ) : (
            <SectionWrapper noPadding className="overflow-hidden rounded-2xl border border-(--app-border)/80 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full table-auto min-w-full text-right border-collapse" dir="rtl">
                  <thead className="bg-[var(--color-primary)] dark:bg-(--color-primary)/10 text-white dark:text-(--color-primary) border-b border-(--app-border) text-xs">
                    <tr>
                      <th className="px-5 py-3.5 text-center font-bold" style={{ width: "1%", whiteSpace: "nowrap" }}>
                        م
                      </th>
                      <th className="px-5 py-3.5 font-bold" style={{ width: "1%", whiteSpace: "nowrap" }}>
                        اسم الفرع
                      </th>
                      <th className="px-5 py-3.5 font-bold">الوظيفة</th>
                      <th className="px-5 py-3.5 font-bold">الضابط الأساسي في ذلك التاريخ</th>
                      <th className="px-5 py-3.5 font-bold">الضباط البدلاء في ذلك التاريخ</th>
                    </tr>
                  </thead>

                  {groupedData.map((group) => {
                    const rowSpan = group.items.length;
                    const firstItem = group.items[0];

                    return (
                      <tbody
                        key={group.department}
                        className="group/branch divide-y divide-(--app-border)/40 text-xs border-b border-(--app-border)/40 has-[.branch-cell:hover]:bg-(--app-surface-container) transition-colors duration-150"
                      >
                        {/* Row 0 of department group */}
                        <tr className="hover:bg-(--app-surface-container) group-has-[.branch-cell:hover]/branch:bg-(--app-surface-container) transition-colors duration-150">
                          {/* Serial Number */}
                          <td
                            className="px-5 py-3 text-center font-mono font-bold text-(--app-muted-foreground) align-middle border-l border-(--app-border)/30 whitespace-nowrap tabular-nums"
                            style={{ width: "1%" }}
                          >
                            {runningSerial++}
                          </td>

                          {/* Merged Branch Cell */}
                          <td
                            rowSpan={rowSpan}
                            className="branch-cell px-5 py-3 align-middle border-l border-(--app-border)/30 group-hover/branch:bg-(--app-surface-container) hover:!bg-blue-500/10 dark:hover:!bg-blue-900/20 transition-colors duration-150 whitespace-nowrap bg-(--app-surface) cursor-default"
                            style={{ width: "1%" }}
                          >
                            <span className="font-extrabold text-xs text-(--color-primary)">
                              {group.department}
                            </span>
                          </td>

                          {/* Position Title */}
                          <td className="px-5 py-3 text-xs font-extrabold text-(--color-primary) align-middle">
                            {firstItem.positionTitle}
                          </td>

                          {/* Primary Officer */}
                          <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) align-middle">
                            {firstItem.primaryOfficerDisplay === "شاغر" ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm text-xs font-bold text-(--app-muted-foreground)">
                                <AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />
                                <span>شاغر</span>
                              </div>
                            ) : (
                              <span>{firstItem.primaryOfficerDisplay}</span>
                            )}
                          </td>

                          {/* Substitute Officers */}
                          <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) align-middle">
                            {firstItem.hasNoSubstitute ? (
                              <span className="text-(--app-muted-foreground)">-</span>
                            ) : firstItem.substituteOfficersList.length === 0 ? (
                              <span className="text-xs font-bold text-(--app-muted-foreground)">بدون بديل</span>
                            ) : (
                              <div className="flex flex-col items-start gap-1">
                                {firstItem.substituteOfficersList.map((name, i) => (
                                  <ModalBadge
                                    key={i}
                                  >
                                    {name}
                                  </ModalBadge>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Remaining rows in department group */}
                        {group.items.slice(1).map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-(--app-surface-container) group-has-[.branch-cell:hover]/branch:bg-(--app-surface-container) transition-colors duration-150"
                          >
                            {/* Serial Number */}
                            <td
                              className="px-5 py-3 text-center font-mono font-bold text-(--app-muted-foreground) align-middle border-l border-(--app-border)/30 whitespace-nowrap tabular-nums"
                              style={{ width: "1%" }}
                            >
                              {runningSerial++}
                            </td>

                            {/* Position Title */}
                            <td className="px-5 py-3 text-xs font-extrabold text-(--color-primary) align-middle">
                              {item.positionTitle}
                            </td>

                            {/* Primary Officer */}
                            <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) align-middle">
                              {item.primaryOfficerDisplay === "شاغر" ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm text-xs font-bold text-(--app-muted-foreground)">
                                  <AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />
                                  <span>شاغر</span>
                                </div>
                              ) : (
                                <span>{item.primaryOfficerDisplay}</span>
                              )}
                            </td>

                            {/* Substitute Officers */}
                            <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) align-middle">
                              {item.hasNoSubstitute ? (
                                <span className="text-(--app-muted-foreground)">-</span>
                              ) : item.substituteOfficersList.length === 0 ? (
                                <span className="text-xs font-bold text-(--app-muted-foreground)">بدون بديل</span>
                              ) : (
                                <div className="flex flex-col items-start gap-1">
                                  {item.substituteOfficersList.map((name, i) => (
                                    <ModalBadge
                                      key={i}
                                    >
                                      {name}
                                    </ModalBadge>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    );
                  })}
                </table>
              </div>
            </SectionWrapper>
          )}
        </div>
      )}
    </ModalShell>
  );
}
