"use client";

import React, { useImperativeHandle, useState } from "react";
import {
  ArrowDownUp,
  Award,
  Clock,
  Edit3,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { PageStatusBar } from "@/components/layout/PageStatusBar";
import { ActionButton } from "@/components/officers/OfficersTable";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { DateBadge } from "@/components/ui/date-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { MonoBadge } from "@/components/ui/mono-badge";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import type {
  CommanderStatusFilter,
  HistoricalCommanderDTO,
  HistoricalCommandersListResponse,
  TimelineSortOrder,
} from "@/types/historical-record";
import { HistoricalCommanderModal } from "./HistoricalCommanderModal";
import { HistoricalGovernanceModal } from "./HistoricalGovernanceModal";
import { PhotoLightboxModal } from "./PhotoLightboxModal";
import {
  useHistoricalTabSync,
  type HistoricalTabHandle,
} from "./useHistoricalTabSync";

interface HistoricalCommandersTabProps {
  initialItems: HistoricalCommanderDTO[];
  initialCurrentCommander: HistoricalCommanderDTO | null;
  initialYears: number[];
  searchQuery: string;
  canAdd: boolean;
  isAdmin: boolean;
  onCountChange?: (count: number) => void;
}

const STATUS_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "جميع القادة" },
  { value: "current", label: "القائد الحالي فقط" },
  { value: "former", label: "القادة السابقون فقط" },
];

export const HistoricalCommandersTab = React.forwardRef<
  HistoricalTabHandle,
  HistoricalCommandersTabProps
>(function HistoricalCommandersTab(
  {
    initialItems,
    initialCurrentCommander,
    initialYears,
    searchQuery,
    canAdd,
    isAdmin,
    onCountChange,
  },
  ref,
) {
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

  useImperativeHandle(ref, () => ({
    openCreateModal: () => setModalCommander(null),
  }));

  const {
    loading,
    deleting,
    fetchList: fetchCommanders,
    executeDelete,
  } = useHistoricalTabSync<HistoricalCommandersListResponse>({
    endpoint: "/api/historical-record/commanders",
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
      if (selectedStatus && selectedStatus !== "all") {
        params.set("status", selectedStatus);
      }
      params.set("sortOrder", sortOrder);
      return params;
    },
    loadErrorMessage: "فشل تحميل سجل القادة",
    fallbackErrorMessage: "تعذر تحديث قائمة قادة الوحدة",
    onLoaded: (data) => {
      const nextItems = data.items ?? [];
      setItems(nextItems);
      onCountChange?.(nextItems.length);
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
      {
        fail: "فشل حذف سجل القائد",
        success: "تم حذف سجل القائد التاريخي بنجاح",
      },
      () => setDeleteTarget(null),
    );
  }

  const yearOptions: CustomSelectOption[] = [
    { value: "", label: "جميع السنوات" },
    ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Highlighted Current Commander Card */}
      {currentCommander && (
        <SectionWrapper className="bg-(--color-primary)/5 border-(--color-primary)/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
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
                className={`w-20 h-20 rounded-2xl overflow-hidden border border-(--color-primary)/25 bg-(--app-surface) shadow-xs flex items-center justify-center shrink-0 ${
                  currentCommander.photoUrl
                    ? "cursor-pointer hover:opacity-90"
                    : "cursor-default"
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

              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-(--color-primary) text-white text-[11px] font-black">
                    <Award className="w-3 h-3" />
                    <span>القائد الحالي للوحدة</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-(--app-surface) border border-(--app-border) text-(--color-primary) text-[11px] font-black">
                    <Clock className="w-3 h-3" />
                    <span>المدة: {currentCommander.durationLabel}</span>
                  </span>
                </div>

                <h2 className="text-lg font-black text-(--color-primary)">
                  {currentCommander.officerSnapshot.rankLabel ??
                    currentCommander.officerSnapshot.rank}{" "}
                  / {currentCommander.officerSnapshot.fullName}
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  <MonoBadge
                    label="ر.ع"
                    value={currentCommander.officerSnapshot.militaryId}
                    size="sm"
                    variant="surface"
                  />
                  {currentCommander.officerSnapshot.seniorityNumber && (
                    <MonoBadge
                      label="أقدمية"
                      value={currentCommander.officerSnapshot.seniorityNumber}
                      size="sm"
                      variant="muted"
                    />
                  )}
                  <DateBadge
                    date={currentCommander.startDate}
                    showIcon
                    variant="surface"
                    size="sm"
                  />
                  <span className="text-[11px] font-black text-(--color-primary)">
                    — حتى الآن
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1 shrink-0 self-start">
                <ActionButton
                  icon={<Edit3 className="w-4 h-4" />}
                  color="btn-action-primary"
                  title="تعديل سجل القائد (مدير النظام فقط)"
                  onClick={() => setModalCommander(currentCommander)}
                />
                <ActionButton
                  icon={<Trash2 className="w-4 h-4" />}
                  color="btn-action-primary"
                  title="حذف سجل القائد (مدير النظام فقط)"
                  onClick={() => setDeleteTarget(currentCommander)}
                />
              </div>
            )}
          </div>
        </SectionWrapper>
      )}

      <PageStatusBar
        title="تصفية العرض:"
        actions={
          <span className="text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface-container) px-3 py-1 rounded-full border border-(--app-border)">
            {items.length} فترة قيادة
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

        <div className="w-44">
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
      </PageStatusBar>

      <SectionWrapper>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-4 bg-(--color-primary) rounded-full" />
            <h3 className="text-sm font-black text-(--color-primary)">
              الخط الزمني لقادة المركز والوحدة
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
            message="جاري تحميل سجل قادة المركز والوحدة..."
          />
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
          <div className="relative pr-6 sm:pr-8 space-y-4 before:content-[''] before:absolute before:right-2.5 sm:before:right-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-(--app-border)">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <span
                  className={`absolute -right-[21px] sm:-right-[25px] top-6 w-3.5 h-3.5 rounded-full ring-4 ring-(--app-surface) ${
                    item.isCurrent
                      ? "bg-(--color-primary)"
                      : "bg-(--app-muted-foreground)"
                  }`}
                />

                <article className="p-4 sm:p-5 bg-(--app-surface-container-low) rounded-2xl border border-(--app-border) hover:border-(--color-primary)/30 transition-all shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
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
                        className={`w-16 h-16 rounded-xl overflow-hidden border border-(--app-border) bg-(--app-surface) shadow-xs flex items-center justify-center shrink-0 ${
                          item.photoUrl
                            ? "cursor-pointer hover:opacity-90"
                            : "cursor-default"
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

                      <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm sm:text-base font-black text-(--color-primary)">
                            {item.officerSnapshot.rankLabel ??
                              item.officerSnapshot.rank}{" "}
                            / {item.officerSnapshot.fullName}
                          </h4>
                          {item.isCurrent ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-(--color-primary) text-white text-[10px] font-black">
                              حتى الآن
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-(--app-surface) text-(--app-muted-foreground) border border-(--app-border) text-[10px] font-bold">
                              فترة منتهية
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <MonoBadge
                            label="ر.ع"
                            value={item.officerSnapshot.militaryId}
                            size="sm"
                            variant="surface"
                          />
                          {item.officerSnapshot.seniorityNumber && (
                            <MonoBadge
                              label="أقدمية"
                              value={item.officerSnapshot.seniorityNumber}
                              size="sm"
                              variant="muted"
                            />
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {item.isCurrent ? (
                            <div className="inline-flex items-center gap-1.5">
                              <DateBadge
                                date={item.startDate}
                                showIcon
                                variant="surface"
                                size="sm"
                              />
                              <span className="text-xs font-black text-(--color-primary)">
                                — حتى الآن
                              </span>
                            </div>
                          ) : (
                            <DateBadge
                              date={item.startDate}
                              endDate={item.endDate}
                              showIcon
                              variant="surface"
                              size="sm"
                            />
                          )}
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-(--color-primary)/5 border border-(--color-primary)/20 text-(--color-primary) text-[11px] font-black">
                            <Clock className="w-3.5 h-3.5" />
                            <span>المدة: {item.durationLabel}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <ActionButton
                          icon={<Edit3 className="w-4 h-4" />}
                          color="btn-action-primary"
                          title="تعديل سجل القائد (مدير النظام فقط)"
                          onClick={() => setModalCommander(item)}
                        />
                        <ActionButton
                          icon={<Trash2 className="w-4 h-4" />}
                          color="btn-action-primary"
                          title="حذف سجل القائد (مدير النظام فقط)"
                          onClick={() => setDeleteTarget(item)}
                        />
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
      </SectionWrapper>

      {modalCommander !== undefined && (
        <HistoricalCommanderModal
          commander={modalCommander}
          activeCurrentCommander={currentCommander}
          onClose={() => setModalCommander(undefined)}
          onSaved={() => {
            setModalCommander(undefined);
            void fetchCommanders(searchQuery);
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
});
