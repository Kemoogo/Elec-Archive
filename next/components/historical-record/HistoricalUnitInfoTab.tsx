"use client";

import React, { useImperativeHandle, useState } from "react";
import {
  ArrowDownUp,
  Building2,
  Calendar,
  Edit3,
  Flag,
  Landmark,
  MapPin,
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
import { SectionWrapper } from "@/components/ui/section-wrapper";
import {
  UNIT_MILESTONE_CATEGORIES,
  UNIT_MILESTONE_CATEGORY_LABELS,
  type HistoricalMilestonesListResponse,
  type TimelineSortOrder,
  type UnitHistoricalMilestoneDTO,
  type UnitHistoricalProfileDTO,
} from "@/types/historical-record";
import { UnitProfileModal } from "./UnitProfileModal";
import { HistoricalMilestoneModal } from "./HistoricalMilestoneModal";
import { HistoricalGovernanceModal } from "./HistoricalGovernanceModal";
import { PhotoLightboxModal } from "./PhotoLightboxModal";
import {
  useHistoricalTabSync,
  type HistoricalTabHandle,
} from "./useHistoricalTabSync";

interface HistoricalUnitInfoTabProps {
  initialProfile: UnitHistoricalProfileDTO | null;
  initialMilestones: UnitHistoricalMilestoneDTO[];
  initialYears: number[];
  searchQuery: string;
  canAdd: boolean;
  isAdmin: boolean;
  onCountChange?: (count: number) => void;
  onProfilePresenceChange?: (exists: boolean) => void;
}

const CATEGORY_FILTER_OPTIONS: CustomSelectOption[] = [
  { value: "", label: "جميع التصنيفات" },
  ...UNIT_MILESTONE_CATEGORIES.map((cat) => ({
    value: cat,
    label: UNIT_MILESTONE_CATEGORY_LABELS[cat],
  })),
];

export const HistoricalUnitInfoTab = React.forwardRef<
  HistoricalTabHandle,
  HistoricalUnitInfoTabProps
>(function HistoricalUnitInfoTab(
  {
    initialProfile,
    initialMilestones,
    initialYears,
    searchQuery,
    canAdd,
    isAdmin,
    onCountChange,
    onProfilePresenceChange,
  },
  ref,
) {
  const [profile, setProfile] = useState<UnitHistoricalProfileDTO | null>(
    initialProfile,
  );
  const [milestones, setMilestones] =
    useState<UnitHistoricalMilestoneDTO[]>(initialMilestones);
  const [availableYears, setAvailableYears] = useState<number[]>(initialYears);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortOrder, setSortOrder] = useState<TimelineSortOrder>("desc");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalMilestone, setModalMilestone] = useState<
    UnitHistoricalMilestoneDTO | null | undefined
  >(undefined);
  const [deleteTarget, setDeleteTarget] =
    useState<UnitHistoricalMilestoneDTO | null>(null);
  const [lightboxState, setLightboxState] = useState<{
    photos: string[];
    index: number;
    title: string;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    openCreateModal: () => setModalMilestone(null),
    openProfileModal: () => setShowProfileModal(true),
  }));

  const {
    loading,
    deleting,
    fetchList: fetchMilestones,
    executeDelete,
  } = useHistoricalTabSync<HistoricalMilestonesListResponse>({
    endpoint: "/api/historical-record/milestones",
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
      if (selectedCategory) {
        params.set("category", selectedCategory);
      }
      params.set("sortOrder", sortOrder);
      return params;
    },
    loadErrorMessage: "فشل تحميل المحطات التاريخية",
    fallbackErrorMessage: "تعذر تحديث المحطات التاريخية",
    onLoaded: (data) => {
      const nextItems = data.items ?? [];
      setMilestones(nextItems);
      onCountChange?.(nextItems.length);
      if (Array.isArray(data.availableYears)) {
        setAvailableYears(data.availableYears);
      }
    },
    deps: [selectedYear, selectedCategory, sortOrder],
  });

  async function handleConfirmDelete(gov: { reason: string; confirmed: true }) {
    if (!deleteTarget) return;
    await executeDelete(
      deleteTarget.id,
      gov,
      {
        fail: "فشل حذف المحطة التاريخية",
        success: "تم حذف المحطة التاريخية بنجاح",
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
      {/* Static Hero Reference Card: Unit Historical Profile */}
      {profile ? (
        <SectionWrapper className="bg-(--color-primary)/5 border-(--color-primary)/20 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <button
                type="button"
                disabled={!profile.emblemUrl}
                onClick={() =>
                  profile.emblemUrl &&
                  setLightboxState({
                    photos: [profile.emblemUrl],
                    index: 0,
                    title: `شعار ${profile.unitName}`,
                  })
                }
                className={`w-20 h-20 rounded-2xl overflow-hidden border border-(--color-primary)/25 bg-(--app-surface) shadow-xs flex items-center justify-center shrink-0 p-1.5 ${
                  profile.emblemUrl
                    ? "cursor-pointer hover:opacity-90"
                    : "cursor-default"
                }`}
              >
                {profile.emblemUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={profile.emblemUrl}
                    alt={profile.unitName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Shield className="w-10 h-10 text-(--color-primary)/70" />
                )}
              </button>

              <div className="space-y-1.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-(--color-primary) text-white text-[11px] font-black">
                  <Landmark className="w-3 h-3" />
                  <span>البطاقة التعريفية الرسمية للوحدة</span>
                </span>
                <h2 className="text-xl font-black text-(--color-primary)">
                  {profile.unitName}
                </h2>
                {profile.motto && (
                  <p className="text-xs font-black text-(--color-primary)/80">
                    « {profile.motto} »
                  </p>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="shrink-0">
                <ActionButton
                  icon={<Edit3 className="w-4 h-4" />}
                  color="btn-action-primary"
                  title="تعديل البطاقة التعريفية (مدير النظام فقط)"
                  onClick={() => setShowProfileModal(true)}
                />
              </div>
            )}
          </div>

          {(profile.foundingDate || profile.affiliation || profile.location) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {profile.foundingDate && (
                <div className="p-3.5 rounded-xl bg-(--app-surface) border border-(--app-border) shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-(--app-muted-foreground) flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-(--color-primary)" />
                    <span>تاريخ النشأة</span>
                  </span>
                  <div>
                    <DateBadge
                      date={profile.foundingDate}
                      variant="default"
                      size="md"
                    />
                  </div>
                </div>
              )}

              {profile.affiliation && (
                <div className="p-3.5 rounded-xl bg-(--app-surface) border border-(--app-border) shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-(--app-muted-foreground) flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-(--color-primary)" />
                    <span>التبعية</span>
                  </span>
                  <p className="text-sm font-bold text-(--app-foreground)">
                    {profile.affiliation}
                  </p>
                </div>
              )}

              {profile.location && (
                <div className="p-3.5 rounded-xl bg-(--app-surface) border border-(--app-border) shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-(--app-muted-foreground) flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-(--color-primary)" />
                    <span>الموقع / التمركز</span>
                  </span>
                  <p className="text-sm font-bold text-(--app-foreground)">
                    {profile.location}
                  </p>
                </div>
              )}
            </div>
          )}

          {profile.mission && (
            <div className="p-4 rounded-xl bg-(--app-surface) border border-(--app-border) shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                المهمة الرئيسية للوحدة
              </span>
              <p className="text-sm font-medium text-(--app-foreground) leading-relaxed whitespace-pre-line">
                {profile.mission}
              </p>
            </div>
          )}
        </SectionWrapper>
      ) : (
        <SectionWrapper>
          <EmptyState
            icon={Landmark}
            title="لم يتم تأسيس البطاقة التعريفية للوحدة بعد"
            description={
              isAdmin
                ? "قم بإدخال البيانات الأساسية للوحدة وشعارها الرسمي لتظهر كبطاقة مرجعية ثابتة أعلى هذا التبويب."
                : "البطاقة التعريفية للوحدة قيد الإعداد من قِبل مدير النظام."
            }
            action={
              isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="btn-primary text-xs inline-flex items-center gap-2 px-4 py-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>تأسيس البطاقة التعريفية للوحدة</span>
                </button>
              ) : undefined
            }
          />
        </SectionWrapper>
      )}

      <PageStatusBar
        title="تصفية المحطات:"
        actions={
          <span className="text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface-container) px-3 py-1 rounded-full border border-(--app-border)">
            {milestones.length} محطة تاريخية
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
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={CATEGORY_FILTER_OPTIONS}
            placeholder="التصنيف"
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
              الخط الزمني لمحطات الوحدة التاريخية
            </h3>
          </div>
          {searchQuery && (
            <span className="text-xs font-bold text-(--color-primary) bg-(--color-primary)/5 px-3 py-1 rounded-full border border-(--color-primary)/20">
              نتائج البحث: {searchQuery}
            </span>
          )}
        </div>

        {loading && milestones.length === 0 ? (
          <LoadingState
            variant="inline"
            message="جاري تحميل المحطات التاريخية للوحدة..."
          />
        ) : milestones.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="لا توجد محطات تاريخية مسجلة"
            description="لم يتم تسجيل أحداث أو محطات تاريخية تطابق معايير التصفية الحالية."
            action={
              canAdd ? (
                <button
                  type="button"
                  onClick={() => setModalMilestone(null)}
                  className="btn-primary text-xs inline-flex items-center gap-2 px-4 py-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل أول محطة تاريخية</span>
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="relative pr-6 sm:pr-8 space-y-4 before:content-[''] before:absolute before:right-2.5 sm:before:right-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-(--app-border)">
            {milestones.map((item) => (
              <div key={item.id} className="relative">
                <span className="absolute -right-[21px] sm:-right-[25px] top-5 w-3.5 h-3.5 rounded-full bg-(--color-primary) ring-4 ring-(--app-surface)" />

                <article className="p-4 sm:p-5 bg-(--app-surface-container-low) rounded-2xl border border-(--app-border) hover:border-(--color-primary)/30 transition-all shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <DateBadge
                          date={item.milestoneDate}
                          showIcon
                          variant="primary"
                          size="sm"
                        />
                        <span className="px-2.5 py-0.5 rounded-full bg-(--app-surface) text-(--color-primary) border border-(--color-primary)/20 text-[11px] font-black">
                          {item.categoryLabel}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-black text-(--color-primary)">
                        {item.title}
                      </h4>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <ActionButton
                          icon={<Edit3 className="w-4 h-4" />}
                          color="btn-action-primary"
                          title="تعديل المحطة (مدير النظام فقط)"
                          onClick={() => setModalMilestone(item)}
                        />
                        <ActionButton
                          icon={<Trash2 className="w-4 h-4" />}
                          color="btn-action-primary"
                          title="حذف المحطة (مدير النظام فقط)"
                          onClick={() => setDeleteTarget(item)}
                        />
                      </div>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-sm font-medium text-(--app-foreground) leading-relaxed whitespace-pre-line">
                      {item.description}
                    </p>
                  )}

                  {item.photos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5 pt-1">
                      {item.photos.map((photoUrl, idx) => (
                        <button
                          key={`${photoUrl}-${idx}`}
                          type="button"
                          onClick={() =>
                            setLightboxState({
                              photos: item.photos,
                              index: idx,
                              title: item.title,
                            })
                          }
                          className="group relative aspect-square rounded-xl overflow-hidden border border-(--app-border) bg-(--app-surface) hover:border-(--color-primary) transition-all cursor-pointer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoUrl}
                            alt={`${item.title} - صورة ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {item.createdByName && (
                    <div className="pt-2 border-t border-(--app-border)/60 text-[11px] font-bold text-(--app-muted-foreground)">
                      سُجل بواسطة: {item.createdByName}
                    </div>
                  )}
                </article>
              </div>
            ))}
          </div>
        )}
      </SectionWrapper>

      {showProfileModal && (
        <UnitProfileModal
          profile={profile}
          onClose={() => setShowProfileModal(false)}
          onSaved={(savedProfile) => {
            setProfile(savedProfile);
            onProfilePresenceChange?.(true);
            setShowProfileModal(false);
          }}
        />
      )}

      {modalMilestone !== undefined && (
        <HistoricalMilestoneModal
          milestone={modalMilestone}
          onClose={() => setModalMilestone(undefined)}
          onSaved={() => {
            setModalMilestone(undefined);
            void fetchMilestones(searchQuery);
          }}
        />
      )}

      {deleteTarget && (
        <HistoricalGovernanceModal
          mode="delete"
          entityLabel="المحطة التاريخية"
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
