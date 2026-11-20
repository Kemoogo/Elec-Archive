"use client";

import React, { useImperativeHandle, useState } from "react";
import {
  ArrowDownUp,
  Calendar,
  Edit3,
  Image as ImageIcon,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";
import { PageStatusBar } from "@/components/layout/PageStatusBar";
import { ActionButton } from "@/components/officers/OfficersTable";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { DateBadge } from "@/components/ui/date-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import type {
  HistoricalVisitDTO,
  HistoricalVisitsListResponse,
  TimelineSortOrder,
} from "@/types/historical-record";
import { HistoricalVisitModal } from "./HistoricalVisitModal";
import { HistoricalGovernanceModal } from "./HistoricalGovernanceModal";
import { PhotoLightboxModal } from "./PhotoLightboxModal";
import {
  useHistoricalTabSync,
  type HistoricalTabHandle,
} from "./useHistoricalTabSync";

interface HistoricalVisitsTabProps {
  initialItems: HistoricalVisitDTO[];
  initialYears: number[];
  searchQuery: string;
  canAdd: boolean;
  isAdmin: boolean;
  onCountChange?: (count: number) => void;
}

export const HistoricalVisitsTab = React.forwardRef<
  HistoricalTabHandle,
  HistoricalVisitsTabProps
>(function HistoricalVisitsTab(
  {
    initialItems,
    initialYears,
    searchQuery,
    canAdd,
    isAdmin,
    onCountChange,
  },
  ref,
) {
  const [items, setItems] = useState<HistoricalVisitDTO[]>(initialItems);
  const [availableYears, setAvailableYears] = useState<number[]>(initialYears);

  const [selectedYear, setSelectedYear] = useState("");
  const [sortOrder, setSortOrder] = useState<TimelineSortOrder>("desc");

  const [modalVisit, setModalVisit] = useState<HistoricalVisitDTO | null | undefined>(
    undefined,
  );
  const [deleteTarget, setDeleteTarget] = useState<HistoricalVisitDTO | null>(
    null,
  );
  const [lightboxState, setLightboxState] = useState<{
    photos: string[];
    index: number;
    title: string;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    openCreateModal: () => setModalVisit(null),
  }));

  const {
    loading,
    deleting,
    fetchList: fetchVisits,
    executeDelete,
  } = useHistoricalTabSync<HistoricalVisitsListResponse>({
    endpoint: "/api/historical-record/visits",
    searchQuery,
    buildParams: (searchText) => {
      const params = new URLSearchParams();
      const trimmed = searchText.trim();
      if (trimmed.length >= 2) {
        params.set("search", trimmed);
      }
      if (selectedYear) {
        params.set("year", selectedYear);
      }
      params.set("sortOrder", sortOrder);
      return params;
    },
    loadErrorMessage: "فشل تحميل سجل الزيارات",
    fallbackErrorMessage: "تعذر تحديث سجل الزيارات",
    onLoaded: (data) => {
      const nextItems = data.items ?? [];
      setItems(nextItems);
      onCountChange?.(nextItems.length);
      if (Array.isArray(data.availableYears)) {
        setAvailableYears(data.availableYears);
      }
    },
    deps: [selectedYear, sortOrder],
  });

  async function handleConfirmDelete(gov: { reason: string; confirmed: true }) {
    if (!deleteTarget) return;
    await executeDelete(
      deleteTarget.id,
      gov,
      { fail: "فشل حذف الزيارة", success: "تم حذف الزيارة التاريخية بنجاح" },
      () => setDeleteTarget(null),
    );
  }

  const yearOptions: CustomSelectOption[] = [
    { value: "", label: "جميع السنوات" },
    ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <PageStatusBar
        title="تصفية العرض:"
        actions={
          <span className="text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface-container) px-3 py-1 rounded-full border border-(--app-border)">
            {items.length} زيارة مسجلة
          </span>
        }
      >
        <div className="w-40">
          <CustomSelect
            value={selectedYear}
            onChange={setSelectedYear}
            options={yearOptions}
            placeholder="السنة"
          />
        </div>

        <button
          type="button"
          onClick={() =>
            setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
          }
          className="btn-secondary text-xs inline-flex items-center justify-center gap-2 px-3.5 py-2 shrink-0 cursor-pointer"
        >
          <ArrowDownUp className="w-3.5 h-3.5 text-(--color-primary)" />
          <span>
            {sortOrder === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}
          </span>
        </button>
      </PageStatusBar>

      <SectionWrapper>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-4 bg-(--color-primary) rounded-full" />
            <h3 className="text-sm font-black text-(--color-primary)">
              الخط الزمني للزيارات الهامة والوفود
            </h3>
          </div>
          {searchQuery && (
            <span className="text-xs font-bold text-(--color-primary) bg-(--color-primary)/5 px-3 py-1 rounded-full border border-(--color-primary)/20">
              نتائج البحث: {searchQuery}
            </span>
          )}
        </div>

        {loading && items.length === 0 ? (
          <LoadingState
            variant="inline"
            message="جاري تحميل سجل الزيارات التاريخية..."
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="لا توجد زيارات مسجلة"
            description="لم يتم العثور على زيارات هامة تطابق معايير العرض الحالية."
            action={
              canAdd ? (
                <button
                  type="button"
                  onClick={() => setModalVisit(null)}
                  className="btn-primary text-xs inline-flex items-center gap-2 px-4 py-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل أول زيارة</span>
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="relative pr-6 sm:pr-8 space-y-4 before:content-[''] before:absolute before:right-2.5 sm:before:right-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-(--app-border)">
            {items.map((visit) => (
              <div key={visit.id} className="relative">
                <span className="absolute -right-[21px] sm:-right-[25px] top-5 w-3.5 h-3.5 rounded-full bg-(--color-primary) ring-4 ring-(--app-surface)" />

                <article className="p-4 sm:p-5 bg-(--app-surface-container-low) rounded-2xl border border-(--app-border) hover:border-(--color-primary)/30 transition-all shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <DateBadge
                          date={visit.visitDate}
                          showIcon
                          variant="primary"
                          size="sm"
                        />
                        {visit.photos.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-(--app-surface) text-(--app-muted-foreground) text-[11px] font-bold border border-(--app-border)">
                            <ImageIcon className="w-3 h-3 text-(--color-primary)" />
                            <span>{visit.photos.length} صور</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-black text-(--color-primary)">
                        {visit.title}
                      </h4>

                      <p className="text-xs font-bold text-(--app-muted-foreground) flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-(--color-primary) shrink-0" />
                        <span>الزائر / الوفد: {visit.visitorName}</span>
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <ActionButton
                          icon={<Edit3 className="w-4 h-4" />}
                          color="btn-action-primary"
                          title="تعديل الزيارة (مدير النظام فقط)"
                          onClick={() => setModalVisit(visit)}
                        />
                        <ActionButton
                          icon={<Trash2 className="w-4 h-4" />}
                          color="btn-action-primary"
                          title="حذف الزيارة (مدير النظام فقط)"
                          onClick={() => setDeleteTarget(visit)}
                        />
                      </div>
                    )}
                  </div>

                  {visit.description && (
                    <p className="text-sm font-medium text-(--app-foreground) leading-relaxed whitespace-pre-line">
                      {visit.description}
                    </p>
                  )}

                  {visit.photos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5 pt-1">
                      {visit.photos.map((photoUrl, idx) => (
                        <button
                          key={`${photoUrl}-${idx}`}
                          type="button"
                          onClick={() =>
                            setLightboxState({
                              photos: visit.photos,
                              index: idx,
                              title: visit.title,
                            })
                          }
                          className="group relative aspect-square rounded-xl overflow-hidden border border-(--app-border) bg-(--app-surface) hover:border-(--color-primary) transition-all cursor-pointer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoUrl}
                            alt={`${visit.title} - صورة ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {visit.createdByName && (
                    <div className="pt-2 border-t border-(--app-border)/60 text-[11px] font-bold text-(--app-muted-foreground)">
                      سُجل بواسطة: {visit.createdByName}
                    </div>
                  )}
                </article>
              </div>
            ))}
          </div>
        )}
      </SectionWrapper>

      {modalVisit !== undefined && (
        <HistoricalVisitModal
          visit={modalVisit}
          onClose={() => setModalVisit(undefined)}
          onSaved={() => {
            setModalVisit(undefined);
            void fetchVisits(searchQuery);
          }}
        />
      )}

      {deleteTarget && (
        <HistoricalGovernanceModal
          mode="delete"
          entityLabel="الزيارة التاريخية"
          recordTitle={deleteTarget.title}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {lightboxState && (
        <PhotoLightboxModal
          photos={lightboxState.photos}
          initialIndex={lightboxState.index}
          title={lightboxState.title}
          onClose={() => setLightboxState(null)}
        />
      )}
    </div>
  );
});
