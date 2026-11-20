"use client";

import React, { useState } from "react";
import {
  ArrowDownUp,
  Calendar,
  Edit3,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { EmptyState } from "@/components/ui/empty-state";
import { FormInput } from "@/components/ui/form-fields";
import { LoadingState } from "@/components/ui/loading-state";
import { formatDateDisplay } from "@/lib/utils/date-display";
import type {
  HistoricalVisitDTO,
  HistoricalVisitsListResponse,
  TimelineSortOrder,
} from "@/types/historical-record";
import { HistoricalVisitModal } from "./HistoricalVisitModal";
import { HistoricalGovernanceModal } from "./HistoricalGovernanceModal";
import { PhotoLightboxModal } from "./PhotoLightboxModal";
import { useHistoricalTabSync } from "./useHistoricalTabSync";

interface HistoricalVisitsTabProps {
  initialItems: HistoricalVisitDTO[];
  initialYears: number[];
  canAdd: boolean;
  isAdmin: boolean;
}

export function HistoricalVisitsTab({
  initialItems,
  initialYears,
  canAdd,
  isAdmin,
}: HistoricalVisitsTabProps) {
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

  const {
    searchInput,
    setSearchInput,
    loading,
    deleting,
    fetchList: fetchVisits,
    handleSearchKeyDown,
    executeDelete,
  } = useHistoricalTabSync<HistoricalVisitsListResponse>({
    endpoint: "/api/historical-record/visits",
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
      setItems(data.items ?? []);
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
    <div className="space-y-5" dir="rtl">
      {/* Toolbar */}
      <div className="archive-card p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-(--app-muted-foreground) absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <FormInput
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="بحث بالعنوان، اسم الزائر، أو التفاصيل (حرفان على الأقل)..."
                className="pr-9 pl-3"
              />
            </div>
            <button
              type="button"
              onClick={() => void fetchVisits(searchInput)}
              className="btn-secondary text-xs px-3 py-2 shrink-0 cursor-pointer"
              title="بحث فوري"
            >
              بحث
            </button>
          </div>

          <div className="w-full sm:w-44">
            <CustomSelect
              value={selectedYear}
              onChange={setSelectedYear}
              options={yearOptions}
              placeholder="تصفية بالسنة"
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
        </div>

        {canAdd && (
          <button
            type="button"
            onClick={() => setModalVisit(null)}
            className="btn-primary text-xs inline-flex items-center justify-center gap-2 px-4 py-2.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة زيارة هامة</span>
          </button>
        )}
      </div>

      {/* Timeline Content */}
      {loading && items.length === 0 ? (
        <LoadingState message="جاري تحميل سجل الزيارات التاريخية..." />
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
        <div className="relative pr-6 sm:pr-8 space-y-5 before:content-[''] before:absolute before:right-2.5 sm:before:right-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-(--app-border)">
          {items.map((visit) => (
            <div key={visit.id} className="relative">
              {/* Timeline marker dot */}
              <span className="absolute -right-[21px] sm:-right-[25px] top-5 w-3.5 h-3.5 rounded-full bg-(--color-primary) ring-4 ring-(--app-surface)" />

              <article className="archive-card p-5 space-y-3 hover:border-(--color-primary)/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-(--color-primary)/10 text-(--color-primary) text-xs font-black">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateDisplay(visit.visitDate)}</span>
                      </span>
                      {visit.photos.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground) text-[11px] font-bold border border-(--app-border)">
                          <ImageIcon className="w-3 h-3" />
                          <span>{visit.photos.length} صور</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-(--color-primary)">
                      {visit.title}
                    </h3>

                    <p className="text-xs font-bold text-(--app-muted-foreground) flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-(--color-primary)" />
                      <span>الزائر / الوفد: {visit.visitorName}</span>
                    </p>
                  </div>

                  {/* Admin-only governance Edit/Delete buttons */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setModalVisit(visit)}
                        className="btn-action-primary p-2 rounded-xl hover:bg-(--color-primary)/10 text-(--color-primary) hover:text-(--app-info) transition-colors cursor-pointer"
                        title="تعديل الزيارة (مدير النظام فقط)"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(visit)}
                        className="btn-action-primary p-2 rounded-xl hover:bg-(--color-primary)/10 text-(--color-primary) hover:text-(--app-info) transition-colors cursor-pointer"
                        title="حذف الزيارة (مدير النظام فقط)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {visit.description && (
                  <p className="text-sm font-medium text-(--app-foreground) leading-relaxed whitespace-pre-line">
                    {visit.description}
                  </p>
                )}

                {/* Thumbnail gallery */}
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
                        className="group relative aspect-square rounded-xl overflow-hidden border border-(--app-border) bg-(--app-surface-container) hover:border-(--color-primary) transition-all cursor-pointer"
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

      {modalVisit !== undefined && (
        <HistoricalVisitModal
          visit={modalVisit}
          onClose={() => setModalVisit(undefined)}
          onSaved={() => {
            setModalVisit(undefined);
            void fetchVisits(searchInput);
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
}
