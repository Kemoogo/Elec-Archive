"use client";

import React, { useState } from "react";
import {
  ArrowDownUp,
  Award,
  Calendar,
  Clock,
  Edit3,
  Plus,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { EmptyState } from "@/components/ui/empty-state";
import { FormInput } from "@/components/ui/form-fields";
import { LoadingState } from "@/components/ui/loading-state";
import { formatDateDisplay } from "@/lib/utils/date-display";
import type {
  CommanderStatusFilter,
  HistoricalCommanderDTO,
  HistoricalCommandersListResponse,
  TimelineSortOrder,
} from "@/types/historical-record";
import { HistoricalCommanderModal } from "./HistoricalCommanderModal";
import { HistoricalGovernanceModal } from "./HistoricalGovernanceModal";
import { PhotoLightboxModal } from "./PhotoLightboxModal";
import { useHistoricalTabSync } from "./useHistoricalTabSync";

interface HistoricalCommandersTabProps {
  initialItems: HistoricalCommanderDTO[];
  initialCurrentCommander: HistoricalCommanderDTO | null;
  initialYears: number[];
  canAdd: boolean;
  isAdmin: boolean;
}

const STATUS_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "جميع القادة" },
  { value: "current", label: "القائد الحالي فقط" },
  { value: "former", label: "القادة السابقون فقط" },
];

export function HistoricalCommandersTab({
  initialItems,
  initialCurrentCommander,
  initialYears,
  canAdd,
  isAdmin,
}: HistoricalCommandersTabProps) {
  const [items, setItems] = useState<HistoricalCommanderDTO[]>(initialItems);
  const [currentCommander, setCurrentCommander] =
    useState<HistoricalCommanderDTO | null>(initialCurrentCommander);
  const [availableYears, setAvailableYears] = useState<number[]>(initialYears);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<CommanderStatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<TimelineSortOrder>("desc");

  const [modalCommander, setModalCommander] = useState<
    HistoricalCommanderDTO | null | undefined
  >(undefined);
  const [deleteTarget, setDeleteTarget] =
    useState<HistoricalCommanderDTO | null>(null);
  const [lightboxState, setLightboxState] = useState<{
    photos: string[];
    title: string;
  } | null>(null);

  const {
    searchInput,
    setSearchInput,
    loading,
    deleting,
    fetchList: fetchCommanders,
    handleSearchKeyDown,
    executeDelete,
  } = useHistoricalTabSync<HistoricalCommandersListResponse>({
    endpoint: "/api/historical-record/commanders",
    buildParams: (searchText) => {
      const params = new URLSearchParams();
      const trimmed = searchText.trim();
      if (trimmed.length >= 2) {
        params.set("search", trimmed);
      }
      if (selectedYear) {
        params.set("year", selectedYear);
      }
      if (selectedStatus && selectedStatus !== "all") {
        params.set("status", selectedStatus);
      }
      params.set("sortOrder", sortOrder);
      return params;
    },
    loadErrorMessage: "فشل تحميل سجل القادة",
    fallbackErrorMessage: "تعذر تحديث قائمة قادة الوحدة",
    onLoaded: (data) => {
      setItems(data.items ?? []);
      setCurrentCommander(data.currentCommander ?? null);
      if (Array.isArray(data.availableYears)) {
        setAvailableYears(data.availableYears);
      }
    },
    deps: [selectedYear, selectedStatus, sortOrder],
  });

  async function handleConfirmDelete(gov: { reason: string; confirmed: true }) {
    if (!deleteTarget) return;
    await executeDelete(
      deleteTarget.id,
      gov,
      { fail: "فشل حذف سجل القائد", success: "تم حذف سجل القائد التاريخي بنجاح" },
      () => setDeleteTarget(null),
    );
  }

  const yearOptions: CustomSelectOption[] = [
    { value: "", label: "جميع السنوات" },
    ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Highlighted Current Commander Card */}
      {currentCommander && (
        <div className="archive-card p-5 border-2 border-(--color-primary)/25 bg-(--color-primary)/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={!currentCommander.photoUrl}
                onClick={() =>
                  currentCommander.photoUrl &&
                  setLightboxState({
                    photos: [currentCommander.photoUrl],
                    title: `${currentCommander.officerSnapshot.rankLabel ?? currentCommander.officerSnapshot.rank} / ${currentCommander.officerSnapshot.fullName}`,
                  })
                }
                className={`w-20 h-20 rounded-2xl overflow-hidden border border-(--color-primary)/30 bg-(--app-surface) flex items-center justify-center shrink-0 ${
                  currentCommander.photoUrl ? "cursor-pointer hover:opacity-90" : "cursor-default"
                }`}
              >
                {currentCommander.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={currentCommander.photoUrl}
                    alt={currentCommander.officerSnapshot.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Shield className="w-9 h-9 text-(--color-primary)/70" />
                )}
              </button>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-(--color-primary) text-white text-[11px] font-black">
                  <Award className="w-3 h-3" />
                  <span>القائد الحالي للوحدة</span>
                </span>
                <h2 className="text-lg font-black text-(--color-primary)">
                  {currentCommander.officerSnapshot.rankLabel ??
                    currentCommander.officerSnapshot.rank}{" "}
                  / {currentCommander.officerSnapshot.fullName}
                </h2>
                <p className="text-xs font-bold text-(--app-muted-foreground)">
                  الرقم العسكري: {currentCommander.officerSnapshot.militaryId}
                  {currentCommander.officerSnapshot.seniorityNumber
                    ? ` • الأقدمية: ${currentCommander.officerSnapshot.seniorityNumber}`
                    : ""}
                </p>
                <p className="text-xs font-bold text-(--color-primary) flex flex-wrap items-center gap-2">
                  <span>
                    تولى القيادة: {formatDateDisplay(currentCommander.startDate)} — حتى الآن
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-(--app-surface) border border-(--app-border)">
                    المدة: {currentCommander.durationLabel}
                  </span>
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1.5 shrink-0 self-start">
                <button
                  type="button"
                  onClick={() => setModalCommander(currentCommander)}
                  className="btn-action-primary p-2 rounded-xl hover:bg-(--color-primary)/10 text-(--color-primary) hover:text-(--app-info) cursor-pointer"
                  title="تعديل سجل القائد (مدير النظام فقط)"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(currentCommander)}
                  className="btn-action-primary p-2 rounded-xl hover:bg-(--color-primary)/10 text-(--color-primary) hover:text-(--app-info) cursor-pointer"
                  title="حذف سجل القائد (مدير النظام فقط)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="archive-card p-4 flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[240px] max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-(--app-muted-foreground) absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <FormInput
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="بحث بالاسم، الرقم العسكري، الأقدمية، أو الرتبة..."
                className="pr-9 pl-3"
              />
            </div>
            <button
              type="button"
              onClick={() => void fetchCommanders(searchInput)}
              className="btn-secondary text-xs px-3 py-2 shrink-0 cursor-pointer"
            >
              بحث
            </button>
          </div>

          <div className="w-full sm:w-40">
            <CustomSelect
              value={selectedYear}
              onChange={setSelectedYear}
              options={yearOptions}
              placeholder="السنة"
            />
          </div>

          <div className="w-full sm:w-44">
            <CustomSelect
              value={selectedStatus}
              onChange={(val) =>
                setSelectedStatus(val as CommanderStatusFilter)
              }
              options={STATUS_OPTIONS}
              placeholder="الحالة"
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
            onClick={() => setModalCommander(null)}
            className="btn-primary text-xs inline-flex items-center justify-center gap-2 px-4 py-2.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قائد وحدة</span>
          </button>
        )}
      </div>

      {/* Commanders Timeline */}
      {loading && items.length === 0 ? (
        <LoadingState message="جاري تحميل سجل قادة المركز والوحدة..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Award}
          title="لا توجد فترات قيادة مسجلة"
          description="لم يتم العثور على قادة وحدة مطابقين لمعايير البحث والتصفية الحالية."
          action={
            canAdd ? (
              <button
                type="button"
                onClick={() => setModalCommander(null)}
                className="btn-primary text-xs inline-flex items-center gap-2 px-4 py-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل أول قائد</span>
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="relative pr-6 sm:pr-8 space-y-5 before:content-[''] before:absolute before:right-2.5 sm:before:right-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-(--app-border)">
          {items.map((item) => (
            <div key={item.id} className="relative">
              <span
                className={`absolute -right-[21px] sm:-right-[25px] top-6 w-3.5 h-3.5 rounded-full ring-4 ring-(--app-surface) ${
                  item.isCurrent
                    ? "bg-(--color-primary)"
                    : "bg-(--app-muted-foreground)"
                }`}
              />

              <article className="archive-card p-5 space-y-3 hover:border-(--color-primary)/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      disabled={!item.photoUrl}
                      onClick={() =>
                        item.photoUrl &&
                        setLightboxState({
                          photos: [item.photoUrl],
                          title: `${item.officerSnapshot.rankLabel ?? item.officerSnapshot.rank} / ${item.officerSnapshot.fullName}`,
                        })
                      }
                      className={`w-16 h-16 rounded-xl overflow-hidden border border-(--app-border) bg-(--app-surface-container) flex items-center justify-center shrink-0 ${
                        item.photoUrl ? "cursor-pointer hover:opacity-90" : "cursor-default"
                      }`}
                    >
                      {item.photoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.photoUrl}
                          alt={item.officerSnapshot.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Shield className="w-7 h-7 text-(--color-primary)/60" />
                      )}
                    </button>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-(--color-primary)">
                          {item.officerSnapshot.rankLabel ??
                            item.officerSnapshot.rank}{" "}
                          / {item.officerSnapshot.fullName}
                        </h3>
                        {item.isCurrent ? (
                          <span className="px-2 py-0.5 rounded-md bg-(--color-primary) text-white text-[10px] font-black">
                            حتى الآن
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border) text-[10px] font-bold">
                            فترة منتهية
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-(--app-muted-foreground)">
                        الرقم العسكري: {item.officerSnapshot.militaryId}
                        {item.officerSnapshot.seniorityNumber
                          ? ` • رقم الأقدمية: ${item.officerSnapshot.seniorityNumber}`
                          : ""}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-(--app-muted-foreground)">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-(--color-primary)" />
                          <span>
                            من {formatDateDisplay(item.startDate)} إلى{" "}
                            {item.isCurrent
                              ? "حتى الآن"
                              : formatDateDisplay(item.endDate)}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-(--color-primary)/10 text-(--color-primary) font-black">
                          <Clock className="w-3.5 h-3.5" />
                          <span>المدة: {item.durationLabel}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setModalCommander(item)}
                        className="btn-action-primary p-2 rounded-xl hover:bg-(--color-primary)/10 text-(--color-primary) hover:text-(--app-info) cursor-pointer"
                        title="تعديل سجل القائد (مدير النظام فقط)"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="btn-action-primary p-2 rounded-xl hover:bg-(--color-primary)/10 text-(--color-primary) hover:text-(--app-info) cursor-pointer"
                        title="حذف سجل القائد (مدير النظام فقط)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {item.notes && (
                  <p className="text-sm font-medium text-(--app-foreground) leading-relaxed whitespace-pre-line pt-1">
                    {item.notes}
                  </p>
                )}
              </article>
            </div>
          ))}
        </div>
      )}

      {modalCommander !== undefined && (
        <HistoricalCommanderModal
          commander={modalCommander}
          activeCurrentCommander={currentCommander}
          onClose={() => setModalCommander(undefined)}
          onSaved={() => {
            setModalCommander(undefined);
            void fetchCommanders(searchInput);
          }}
        />
      )}

      {deleteTarget && (
        <HistoricalGovernanceModal
          mode="delete"
          entityLabel="سجل القائد"
          recordTitle={`${deleteTarget.officerSnapshot.rankLabel ?? deleteTarget.officerSnapshot.rank} / ${deleteTarget.officerSnapshot.fullName}`}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {lightboxState && (
        <PhotoLightboxModal
          photos={lightboxState.photos}
          title={lightboxState.title}
          onClose={() => setLightboxState(null)}
        />
      )}
    </div>
  );
}
