"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  ShieldCheck,
  Building2,
  Plane,
  Lock,
  Activity,
} from "lucide-react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { useToast } from "@/components/ui/toast";
import { ActionButton } from "@/components/officers/OfficersTable";
import { ModalBadge } from "@/components/ui/modal-shell";
import {
  ConfirmSubmitModal,
  ConfirmReopenModal,
  DeleteTableModal,
  MissionDetailsModal,
  OfficerNoteModal,
} from "./rollcall/modals";
import { CustomRollcallTableModal, type OfficerOptionItem } from "./CustomRollcallTableModal";
import { RollcallHistoryModal } from "./RollcallHistoryModal";
import { RollcallPrintReport } from "./RollcallPrintReport";
import { QuickStatusModal, type QuickStatusResult } from "./QuickStatusModal";
import { getDayName, formatDateDisplay } from "@/components/ui/date-badge";
import {
  type ICustomRollcallTable,
  type RollcallStatus,
  ROLLCALL_STATUS_LABELS,
  isRollcallPresent,
  computeDetailedOutColumns,
} from "@/lib/db/models/DailyRollcall.shared";
import { extractApiError } from "@/lib/utils";

export interface RollcallOfficerData {
  id: string;
  militaryId: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  seniorityNumber: string;
  primaryPositionTitle: string;
  substitutePositionTitle: string;
  lastReturnDateFormatted: string;
  lastReturnDayName: string;
  lastReturnDateOnly: string;
  presenceDurationDays: number;
  // Status info
  status: RollcallStatus;
  isUnitDutyOfficer?: boolean;
  dutyTitle?: string;
  note?: string;
  customReason?: string;
  hospitalName?: string;
  hospitalAdmissionDate?: string;
  disciplinaryType?: "prison" | "unit_arrest" | "court";
  disciplinaryAuthority?: string;
  travelDestination?: string;
  travelPurpose?: string;
  statusStartDate?: string;
  statusEndDate?: string;
  isLocked?: boolean;
  lockReason?: string;
  // Leave info
  leaveTypeLabel?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  isReturningToday?: boolean;
  // External Mission / Course info
  missionTitle?: string;
  missionDestination?: string;
  missionStartDate?: string;
  missionEndDate?: string;
  isCourse?: boolean;
}

interface RollcallViewProps {
  date: string; // YYYY-MM-DD
  dateDisplay: string; // e.g. "الخميس 10-09-2026"
  officers: RollcallOfficerData[];
  initialCustomTables?: ICustomRollcallTable[];
  initialConfirmedOfficerIds?: string[];
  isSubmitted: boolean;
  isDraft: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  isCommander: boolean;
  unitName?: string;
}

export function RollcallView({
  date,
  dateDisplay,
  officers,
  initialCustomTables = [],
  initialConfirmedOfficerIds = [],
  isSubmitted,
  isDraft,
  canEdit,
  isAdmin,
  isCommander,
  unitName,
}: RollcallViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();
  const { showToast } = useToast();

  // Local officers state for live updates and instant mutations
  const [localOfficers, setLocalOfficers] = useState<RollcallOfficerData[]>(officers);

  useEffect(() => {
    setLocalOfficers(officers);
  }, [officers]);

  // Quick Status Modal state
  const [quickStatusOfficer, setQuickStatusOfficer] = useState<RollcallOfficerData | null>(null);

  // Viewing mission officer details modal state
  const [viewingMissionOfficer, setViewingMissionOfficer] = useState<RollcallOfficerData | null>(null);

  // Active note editing modal state
  const [editingNoteOfficer, setEditingNoteOfficer] = useState<{
    officer: RollcallOfficerData;
    noteText: string;
  } | null>(null);

  // Smart hierarchical hover state for Table 5 (جدول بيان تمام الضباط)
  const [table5Hover, setTable5Hover] = useState<{
    type: "total" | "present" | "present_child" | "out" | "out_child";
    id?: string;
  } | null>(null);

  // Custom Tables State
  const [customTables, setCustomTables] = useState<ICustomRollcallTable[]>(initialCustomTables);
  const [activeCustomTableModal, setActiveCustomTableModal] = useState<{
    isOpen: boolean;
    table: ICustomRollcallTable | null;
  }>({ isOpen: false, table: null });

  // History modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Modal confirmation states
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmReopenOpen, setConfirmReopenOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);

  // Auto-note helper
  const getAutoNote = useCallback((off: RollcallOfficerData) => {
    if (off.isReturningToday) {
      if (!off.note) return "عودة من إجازة";
      if (off.note.includes("عودة")) return off.note;
      return `عودة من إجازة - ${off.note}`;
    }
    const hasMission = Boolean(
      off.missionTitle ||
      off.status === "daily_mission" ||
      off.status === "external_mission" ||
      off.status === "mission" ||
      off.note?.includes("أثناء الإجازة")
    );
    if (hasMission) {
      // Missions are represented via dedicated presence columns or badges, do not duplicate in notes
      if (off.note) {
        const trimmed = off.note.trim();
        if (
          trimmed === "مأمورية" ||
          trimmed === "مأمورية أثناء الإجازة" ||
          trimmed.startsWith("مأمورية:") ||
          trimmed.startsWith("مأمورية أثناء الإجازة:") ||
          trimmed.startsWith("مأمورية خارجية:")
        ) {
          return "";
        }
        return off.note;
      }
      return "";
    }
    if (off.note) return off.note;
    // Missions and courses do NOT auto-fill notes (rendered in presence/details columns)
    return "";
  }, []);

  // Status notes map (for editing notes on the fly before submit)
  const [notesMap, setNotesMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const off of officers) {
      const note = getAutoNote(off);
      if (note) {
        initial[off.id] = note;
      }
    }
    return initial;
  });

  // Rollcall review/confirmation state for officers (Single-click Check to lock, Double-click Lock to unlock)
  const [confirmedOfficerIds, setConfirmedOfficerIds] = useState<Set<string>>(
    () => new Set(initialConfirmedOfficerIds)
  );

  useEffect(() => {
    setCustomTables(initialCustomTables);
  }, [initialCustomTables]);

  useEffect(() => {
    if (initialConfirmedOfficerIds) {
      setConfirmedOfficerIds(new Set(initialConfirmedOfficerIds));
    }
  }, [initialConfirmedOfficerIds]);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const off of officers) {
      const note = getAutoNote(off);
      if (note) {
        initial[off.id] = note;
      }
    }
    setNotesMap(initial);
  }, [officers, getAutoNote]);

  const handleToggleConfirmOfficer = (officerId: string) => {
    if (confirmedOfficerIds.has(officerId)) {
      // Unlocking is handled by double-click handler
      return;
    }
    setConfirmedOfficerIds((prev) => {
      const next = new Set(prev);
      next.add(officerId);
      return next;
    });
    showToast("تمت مراجعة وتأكيد تمام الضابط بنجاح", "info");
  };

  const handleUnlockOfficer = (officerId: string) => {
    if (!confirmedOfficerIds.has(officerId)) {
      return;
    }
    setConfirmedOfficerIds((prev) => {
      const next = new Set(prev);
      next.delete(officerId);
      return next;
    });
    showToast("تم إلغاء قفل تمام الضابط لإعادة المراجعة", "info");
  };

  // Remove single officer from custom table
  const handleRemoveOfficerFromCustomTable = async (tableId: string, officerId: string) => {
    const updated = customTables.map((tbl) => {
      if (tbl.id !== tableId) return tbl;
      return {
        ...tbl,
        officerIds: tbl.officerIds.filter((id) => String(id) !== String(officerId)),
      };
    });
    setCustomTables(updated);
    showToast("تم حذف الضابط من الجدول المخصص بنجاح", "info");
    await handleSaveDraft(updated);
  };

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Set of all officer IDs assigned to any custom table
  const customTableOfficerMap = useMemo(() => {
    const map = new Map<string, ICustomRollcallTable>();
    for (const tbl of customTables) {
      for (const offId of tbl.officerIds) {
        map.set(String(offId), tbl);
      }
    }
    return map;
  }, [customTables]);

  // Split officers into categories:
  // 1. In custom tables
  // 2. Regular present officers (inside unit, daily mission, clinic, custom present, or returning today)
  // 3. Regular leave / rest officers
  // 4. Regular external missions / courses officers
  // 5. Special officers (hospital, disciplinary, travel abroad, absent, custom out)

  const {
    presentOfficers,
    leaveOfficers,
    externalMissionOfficers,
    specialOfficers,
    customTableOfficersList,
  } = useMemo(() => {
    const present: RollcallOfficerData[] = [];
    const leave: RollcallOfficerData[] = [];
    const external: RollcallOfficerData[] = [];
    const special: RollcallOfficerData[] = [];
    const customListMap: Record<string, RollcallOfficerData[]> = {};

    for (const tbl of customTables) {
      customListMap[tbl.id] = [];
    }

    for (const off of localOfficers) {
      const assignedCustomTable = customTableOfficerMap.get(off.id);
      if (assignedCustomTable) {
        if (!customListMap[assignedCustomTable.id]) {
          customListMap[assignedCustomTable.id] = [];
        }
        customListMap[assignedCustomTable.id].push(off);
        continue;
      }

      // 1. If returning today: Table 1 (الموجودون)
      if (off.isReturningToday) {
        present.push(off);
      }
      // 2. Special cases (hospital, disciplinary, travel abroad, absent, custom out)
      else if (
        off.status === "hospital" ||
        off.status === "prison" ||
        off.status === "unit_arrest" ||
        off.status === "court" ||
        off.status === "travel_abroad" ||
        off.status === "absent" ||
        off.status === "custom_out"
      ) {
        special.push(off);
      }
      // 3. Regular leaves & rests
      else if (
        off.status === "leave" ||
        off.status === "rest" ||
        Boolean(off.leaveTypeLabel)
      ) {
        leave.push(off);
      }
      // 4. External missions & courses
      else if (
        off.status === "external_mission" ||
        off.status === "mission" ||
        off.status === "course" ||
        (Boolean(off.missionTitle) && off.status !== "daily_mission")
      ) {
        external.push(off);
      }
      // 5. Present (inside unit, daily mission, clinic, custom present)
      else {
        present.push(off);
      }
    }

    return {
      presentOfficers: present,
      leaveOfficers: leave,
      externalMissionOfficers: external,
      specialOfficers: special,
      customTableOfficersList: customListMap,
    };
  }, [localOfficers, customTables, customTableOfficerMap]);

  // Overall Statistics & Counts Calculation for Table 5 (جدول بيان تمام الضباط)
  const totalOfficersCount = localOfficers.length;

  // Filter displayed officer lists by search query without modifying official counts
  const matchSearch = useCallback(
    (o: RollcallOfficerData) => {
      if (!searchQuery) return true;
      const noteVal = notesMap[o.id] || o.note || "";
      return (
        o.fullName.toLowerCase().includes(searchQuery) ||
        (o.militaryId && o.militaryId.includes(searchQuery)) ||
        (o.rankLabel && o.rankLabel.toLowerCase().includes(searchQuery)) ||
        (o.rank && o.rank.toLowerCase().includes(searchQuery)) ||
        (o.primaryPositionTitle && o.primaryPositionTitle.toLowerCase().includes(searchQuery)) ||
        noteVal.toLowerCase().includes(searchQuery) ||
        (o.leaveTypeLabel && o.leaveTypeLabel.toLowerCase().includes(searchQuery)) ||
        (o.missionTitle && o.missionTitle.toLowerCase().includes(searchQuery)) ||
        (o.missionDestination && o.missionDestination.toLowerCase().includes(searchQuery)) ||
        (o.hospitalName && o.hospitalName.toLowerCase().includes(searchQuery)) ||
        (o.disciplinaryAuthority && o.disciplinaryAuthority.toLowerCase().includes(searchQuery)) ||
        (o.travelDestination && o.travelDestination.toLowerCase().includes(searchQuery)) ||
        (o.customReason && o.customReason.toLowerCase().includes(searchQuery))
      );
    },
    [searchQuery, notesMap]
  );

  const displayedPresentOfficers = useMemo(
    () => presentOfficers.filter(matchSearch),
    [presentOfficers, matchSearch]
  );

  const displayedLeaveOfficers = useMemo(
    () => leaveOfficers.filter(matchSearch),
    [leaveOfficers, matchSearch]
  );

  const displayedExternalMissionOfficers = useMemo(
    () => externalMissionOfficers.filter(matchSearch),
    [externalMissionOfficers, matchSearch]
  );

  const displayedSpecialOfficers = useMemo(
    () => specialOfficers.filter(matchSearch),
    [specialOfficers, matchSearch]
  );

  const stats = useMemo(() => {
    // 1. Custom tables counts
    let customInsideCount = 0;
    let customOutsideCount = 0;
    for (const tbl of customTables) {
      const count = (customTableOfficersList[tbl.id] || []).length;
      if (tbl.isInsideUnit) {
        customInsideCount += count;
      } else {
        customOutsideCount += count;
      }
    }

    // 2. Daily missions
    const dailyMissionCount = presentOfficers.filter(
      (o) => o.status === "daily_mission"
    ).length;

    // 3. Clinic
    const clinicCount = presentOfficers.filter(
      (o) => o.status === "clinic" || o.status === "medical"
    ).length;

    // 4. Custom present
    const customPresentCount = presentOfficers.filter(
      (o) => o.status === "custom_present"
    ).length;

    // 5. Inside center / unit (strictly regular inside unit)
    const insideCenterCount = Math.max(0, presentOfficers.length - dailyMissionCount - clinicCount - customPresentCount);

    const totalPresent = presentOfficers.length + customInsideCount;
    const totalOut = leaveOfficers.length + externalMissionOfficers.length + specialOfficers.length + customOutsideCount;

    return {
      totalOfficers: totalOfficersCount,
      totalPresent,
      insideCenterCount,
      dailyMissionCount,
      clinicCount,
      customPresentCount,
      customInsideCount,
      totalOut,
      leaveCount: leaveOfficers.length,
      externalMissionCount: externalMissionOfficers.length,
      specialCount: specialOfficers.length,
      customOutsideCount,
    };
  }, [
    totalOfficersCount,
    presentOfficers,
    customTables,
    customTableOfficersList,
    leaveOfficers.length,
    externalMissionOfficers.length,
    specialOfficers.length,
  ]);

  const medicalOfficers = useMemo(() => {
    return localOfficers.filter(
      (o) => o.status === "clinic" || o.status === "rest" || o.status === "hospital" || o.status === "medical"
    );
  }, [localOfficers]);

  const medicalCounts = useMemo(() => {
    return {
      clinic: medicalOfficers.filter((o) => o.status === "clinic" || o.status === "medical").length,
      rest: medicalOfficers.filter((o) => o.status === "rest").length,
      hospital: medicalOfficers.filter((o) => o.status === "hospital").length,
    };
  }, [medicalOfficers]);

  // Split custom tables into inside and outside for Table 5 dynamic columns
  const insideCustomTables = useMemo(
    () => customTables.filter((tbl) => tbl.isInsideUnit),
    [customTables]
  );
  const outsideCustomTables = useMemo(
    () => customTables.filter((tbl) => !tbl.isInsideUnit),
    [customTables]
  );

  const leaveBreakdownCounts = useMemo(() => {
    const leavesOnly = leaveOfficers.filter(
      (o) => o.status === "leave" || (!o.status.includes("rest") && o.status !== "absent")
    ).length;
    const restsOnly = leaveOfficers.filter((o) => o.status === "rest").length;
    const absentsOnly = leaveOfficers.filter((o) => o.status === "absent").length;
    const missionsOnly = externalMissionOfficers.length;

    return {
      leavesOnly,
      restsOnly,
      absentsOnly,
      missionsOnly,
    };
  }, [leaveOfficers, externalMissionOfficers]);

  // Handle Note Change
  const handleNoteChange = (officerId: string, val: string) => {
    setNotesMap((prev) => ({ ...prev, [officerId]: val }));
  };

  // Render Note Cell with "+" button or note preview badge
  const renderNoteCell = (row: RollcallOfficerData) => {
    let val = (notesMap[row.id] ?? row.note ?? "").trim();
    const canModify = canEdit && (!isSubmitted || isAdmin);

    // Suppress auto-mission duplication if officer already has dedicated mission display
    const isAutoMissionText =
      val === "مأمورية" ||
      val === "مأمورية أثناء الإجازة" ||
      val.startsWith("مأمورية:") ||
      val.startsWith("مأمورية أثناء الإجازة:") ||
      val.startsWith("مأمورية خارجية:");

    const hasDedicatedMissionDisplay = Boolean(
      row.missionTitle ||
      row.status === "daily_mission" ||
      row.status === "external_mission" ||
      row.status === "mission" ||
      row.note?.includes("أثناء الإجازة")
    );

    if (isAutoMissionText && hasDedicatedMissionDisplay) {
      val = "";
    }

    if (!val) {
      if (!canModify) {
        return <span className="text-xs text-(--app-muted-foreground)">ـ</span>;
      }
      return (
        <div className="flex items-center justify-center">
          <ActionButton
            icon={<Plus className="w-4 h-4" />}
            color="btn-action-primary hover:bg-(--app-border)"
            title="إضافة ملاحظة للضابط"
            onClick={() => setEditingNoteOfficer({ officer: row, noteText: "" })}
          />
        </div>
      );
    }

    // Note exists: display formatted badge with multi-line support, secondary-button hover style, hover tooltip without extra labels, and click-to-edit
    return (
      <div className="relative group/note flex items-center justify-center w-full">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (canModify) {
              setEditingNoteOfficer({ officer: row, noteText: val });
            }
          }}
          disabled={!canModify}
          className={`max-w-[240px] text-center px-2.5 py-1 rounded-lg text-xs font-bold leading-snug whitespace-pre-line break-words transition-all border ${
            canModify
              ? "bg-(--app-surface-container) border-(--app-border) text-(--color-primary) hover:bg-(--app-border) hover:text-(--color-primary) cursor-pointer"
              : "bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) cursor-default"
          }`}
          title={canModify ? "انقر لتعديل أو حذف الملاحظة" : undefined}
        >
          {val}
        </button>

        {/* Hover tooltip card displaying note content matching project ActionButton tooltip style */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover/note:block pointer-events-none w-max max-w-[240px] bg-(--app-foreground) text-(--app-surface) text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xl border border-(--app-border)/20 leading-relaxed whitespace-pre-wrap break-words text-center">
          {val}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-(--app-foreground)"></div>
        </div>
      </div>
    );
  };

  // Build Payload
  const getPayload = useCallback(
    (
      action: "save_draft" | "submit",
      customTablesOverride?: ICustomRollcallTable[],
      officersOverride?: RollcallOfficerData[]
    ) => {
      const activeCustom = customTablesOverride ?? customTables;
      const activeOfficers = officersOverride ?? localOfficers;

      const entries = activeOfficers.map((o) => {
        let finalStatus: RollcallStatus = o.status;

        if (o.isReturningToday) {
          finalStatus = "present";
        }

        return {
          officerId: o.id,
          status: finalStatus,
          note: notesMap[o.id] !== undefined ? notesMap[o.id] : o.note || undefined,
          customReason: o.customReason,
          hospitalName: o.hospitalName,
          hospitalAdmissionDate: o.hospitalAdmissionDate,
          disciplinaryType: o.disciplinaryType,
          disciplinaryAuthority: o.disciplinaryAuthority,
          travelDestination: o.travelDestination,
          travelPurpose: o.travelPurpose,
          statusStartDate: o.statusStartDate,
          statusEndDate: o.statusEndDate,
        };
      });

      return {
        date,
        action,
        entries,
        customTables: activeCustom,
        confirmedOfficerIds: Array.from(confirmedOfficerIds),
      };
    },
    [date, localOfficers, customTables, notesMap, confirmedOfficerIds]
  );

  // Save Draft (Accepts optional customTables override and officers override)
  const handleSaveDraft = useCallback(
    async (
      tablesOverride?: ICustomRollcallTable[],
      officersOverride?: RollcallOfficerData[]
    ) => {
      setSaving(true);
      try {
        const activeCustom = tablesOverride ?? customTables;
        const activeOfficers = officersOverride ?? localOfficers;
        const payload = getPayload("save_draft", activeCustom, activeOfficers);
        const res = await fetch("/api/officers/rollcall", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(extractApiError(data, "فشل في حفظ المسودة"));
        }
        showToast("تم حفظ مسودة التمام بنجاح", "success");
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "حدث خطأ في الاتصال", "error");
      } finally {
        setSaving(false);
      }
    },
    [customTables, localOfficers, getPayload, showToast, router]
  );

  // Handle Quick Status Save
  const handleQuickStatusSave = async (res: QuickStatusResult) => {
    let updatedList: RollcallOfficerData[] = [];
    setLocalOfficers((prev) => {
      const next: RollcallOfficerData[] = prev.map((off) => {
        if (off.id === res.officerId) {
          return {
            ...off,
            status: res.status,
            note: res.note ?? off.note,
            customReason: res.customReason,
            hospitalName: res.hospitalName,
            hospitalAdmissionDate: res.hospitalAdmissionDate,
            disciplinaryType: res.disciplinaryType,
            disciplinaryAuthority: res.disciplinaryAuthority,
            travelDestination: res.travelDestination,
            travelPurpose: res.travelPurpose,
            statusStartDate: res.statusStartDate,
            statusEndDate: res.statusEndDate,
          };
        }
        return off;
      });
      updatedList = next;
      return next;
    });

    if (res.note !== undefined) {
      setNotesMap((prev) => ({ ...prev, [res.officerId]: res.note || "" }));
    }

    showToast("تم تحديث تمام الضابط بنجاح", "success");
    await handleSaveDraft(customTables, updatedList);
  };

  // Submit Final
  const executeSubmitFinal = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/officers/rollcall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload("submit")),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل في تسليم التمام"));
      }
      setConfirmSubmitOpen(false);
      showToast("تم تسليم التمام النهائي بنجاح", "success");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ في الاتصال", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Reopen
  const executeReopen = async () => {
    try {
      const res = await fetch("/api/arkan-harb/rollcall/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشلت عملية إعادة التمام");
      }
      setConfirmReopenOpen(false);
      showToast("تم إعادة فتح التمام للتعديل بنجاح", "success");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ أثناء إعادة الفتح", "error");
    }
  };

  // Delete Custom Table
  const executeDeleteCustomTable = async (tableId: string) => {
    const updated = customTables.filter((t) => t.id !== tableId);
    setCustomTables(updated);
    setTableToDelete(null);
    showToast("تم حذف الجدول المستقل بنجاح", "success");
    await handleSaveDraft(updated);
  };

  // Listen to Window Custom Events from PageHeader buttons
  useEffect(() => {
    const onTriggerSubmit = () => setConfirmSubmitOpen(true);
    const onTriggerSaveDraft = () => handleSaveDraft();
    const onTriggerReopen = () => setConfirmReopenOpen(true);
    const onTriggerHistory = () => setIsHistoryOpen(true);
    const onTriggerAddCustomTable = () => setActiveCustomTableModal({ isOpen: true, table: null });
    const onTriggerPrint = () => {
      const originalTitle = document.title;
      document.title = "";
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    };

    window.addEventListener("rollcall-submit-final", onTriggerSubmit);
    window.addEventListener("rollcall-save-draft", onTriggerSaveDraft);
    window.addEventListener("rollcall-reopen", onTriggerReopen);
    window.addEventListener("rollcall-open-history", onTriggerHistory);
    window.addEventListener("rollcall-add-custom-table", onTriggerAddCustomTable);
    window.addEventListener("rollcall-print", onTriggerPrint);

    return () => {
      window.removeEventListener("rollcall-submit-final", onTriggerSubmit);
      window.removeEventListener("rollcall-save-draft", onTriggerSaveDraft);
      window.removeEventListener("rollcall-reopen", onTriggerReopen);
      window.removeEventListener("rollcall-open-history", onTriggerHistory);
      window.removeEventListener("rollcall-add-custom-table", onTriggerAddCustomTable);
      window.removeEventListener("rollcall-print", onTriggerPrint);
    };
  }, [handleSaveDraft]);

  // Save/Update Custom Table
  const handleSaveCustomTable = async (savedTable: ICustomRollcallTable) => {
    let updated: ICustomRollcallTable[];
    const idx = customTables.findIndex((t) => t.id === savedTable.id);
    if (idx >= 0) {
      const copy = [...customTables];
      copy[idx] = savedTable;
      updated = copy;
    } else {
      updated = [...customTables, savedTable];
    }
    setCustomTables(updated);
    showToast(`تم حفظ الجدول "${savedTable.name}" بنجاح`, "success");
    await handleSaveDraft(updated);
  };

  // Delete Custom Table Trigger
  const handleDeleteCustomTable = (tableId: string) => {
    setTableToDelete(tableId);
  };

  // Officers options item list for Custom Table Modal
  const allOfficersOptionList: OfficerOptionItem[] = useMemo(() => {
    return localOfficers.map((o) => {
      let statusLabel: string;
      const isExtMissionOrCourse = Boolean(
        o.status === "external_mission" ||
        o.status === "mission" ||
        o.status === "course" ||
        o.isCourse
      );

      if (o.status === "daily_mission") {
        statusLabel = o.missionTitle ? `مأمورية يومية (${o.missionTitle})` : "مأمورية يومية";
      } else if (isRollcallPresent(o.status) || o.isReturningToday) {
        statusLabel = "موجود";
      } else if (o.status === "leave") {
        statusLabel = o.leaveTypeLabel || "إجازة";
      } else if (isExtMissionOrCourse) {
        statusLabel = o.isCourse || o.status === "course"
          ? `فرقة (${o.missionTitle || "تعليمية"})`
          : (o.missionTitle ? `مأمورية خارجية (${o.missionTitle})` : "مأمورية خارجية");
      } else {
        statusLabel = ROLLCALL_STATUS_LABELS[o.status] || "خارج الوحدة";
      }

      return {
        id: o.id,
        fullName: o.fullName,
        rank: o.rank,
        rankLabel: o.rankLabel,
        militaryId: o.militaryId,
        seniorityNumber: o.seniorityNumber,
        primaryPosition: o.primaryPositionTitle,
        currentStatusLabel: statusLabel,
        isExternalMissionOrCourse: isExtMissionOrCourse,
      };
    });
  }, [localOfficers]);

  // ----------------------------------------------------
  // Cumulative Serial Number Offset Calculation
  // ----------------------------------------------------
  const table1Start = 1;
  const table2Start = table1Start + presentOfficers.length;
  const table3Start = table2Start + leaveOfficers.length;
  const specialTableStart = table3Start + externalMissionOfficers.length;

  let nextSerialOffset = specialTableStart + specialOfficers.length;
  const customTableOffsets: Record<string, number> = {};
  for (const tbl of customTables) {
    customTableOffsets[tbl.id] = nextSerialOffset;
    nextSerialOffset += (customTableOfficersList[tbl.id] || []).length;
  }

  // ----------------------------------------------------
  // TABLE 1 COLUMNS: جدول الموجود بالوحدة
  // م | الأقدمية | الرتبة | الاسم | التواجد (صح) | آخر عودة (يوم + تاريخ) | الوظيفة (الأساسي | البديل) | ملاحظات
  // ----------------------------------------------------
  const presentTableColumns: TableColumn<RollcallOfficerData>[] = [
    {
      header: "م",
      cellAlign: "center",
      minWidth: true,
      render: (_v, _row) => {
        const idx = presentOfficers.findIndex((o) => o.id === _row.id);
        return <span className="font-mono font-bold text-xs">{table1Start + idx}</span>;
      },
    },
    {
      header: "الأقدمية",
      accessor: "seniorityNumber",
      cellAlign: "center",
      minWidth: true,
      render: (v) => <span className="font-mono text-xs text-(--app-muted-foreground)">{String(v || "ـ")}</span>,
    },
    {
      header: "الرتبة",
      accessor: "rankLabel",
      cellAlign: "center",
      minWidth: true,
      render: (v) => <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v)}</span>,
    },
    {
      header: "الاسم",
      accessor: "fullName",
      cellAlign: "right",
      render: (v, row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-black text-(--color-primary)">{String(v)}</span>
          {row.isUnitDutyOfficer && (
            <span
              className="px-1.5 py-0.5 rounded-md bg-(--color-primary) text-white text-[10px] font-black"
              title={row.dutyTitle || "نوبتجي الوحدة اليوم"}
            >
              {row.dutyTitle || "نوبتجي اليوم"}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "التواجد",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_v, row) => {
        const isMission = Boolean(
          row.status === "daily_mission" ||
          row.status === "external_mission" ||
          row.status === "mission" ||
          row.missionTitle
        );
        const canModify = canEdit && (!isSubmitted || isAdmin);

        if (isMission) {
          const missionTooltip = row.missionTitle
            ? `${row.missionTitle}${row.missionDestination ? ` - ${row.missionDestination}` : ""}`
            : "مأمورية";
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setViewingMissionOfficer(row)}
                className="px-2.5 py-0.5 rounded-full bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 text-xs font-black hover:bg-(--color-primary)/20 cursor-pointer transition-all shadow-xs active:scale-95"
                title={missionTooltip}
              >
                مأمورية
              </button>
            </div>
          );
        }

        if (row.status === "clinic") {
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  if (canModify) setQuickStatusOfficer(row);
                }}
                className="px-2.5 py-0.5 rounded-full bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 text-xs font-black hover:bg-(--color-primary)/20 cursor-pointer transition-all shadow-xs active:scale-95"
                title="عيادة (انقر لتعديل التمام)"
              >
                عيادة
              </button>
            </div>
          );
        }

        if (row.status === "custom_present") {
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  if (canModify) setQuickStatusOfficer(row);
                }}
                className="px-2.5 py-0.5 rounded-full bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 text-xs font-black hover:bg-(--color-primary)/20 cursor-pointer transition-all shadow-xs active:scale-95"
                title={row.customReason || "سبب آخر (موجود)"}
              >
                {row.customReason || "سبب آخر"}
              </button>
            </div>
          );
        }

        return (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                if (canModify) setQuickStatusOfficer(row);
              }}
              className="w-5 h-5 rounded-full bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center hover:bg-(--color-primary)/20 cursor-pointer transition-all"
              title="موجود داخل الوحدة (انقر لتعديل التمام)"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        );
      },
    },
    {
      header: "آخر عودة",
      headerAlign: "center",
      cellAlign: "center",
      minWidth: true,
      render: (_v, row) => {
        if (!row.lastReturnDateOnly || row.lastReturnDateOnly === "ـ") {
          return <span className="text-xs text-(--app-muted-foreground)">لا توجد عودة</span>;
        }
        return (
          <div className="flex flex-col items-center leading-tight">
            <span className="text-xs font-bold text-(--color-primary)">{row.lastReturnDayName}</span>
            <span className="text-[11px] font-mono text-(--app-muted-foreground)">{row.lastReturnDateOnly}</span>
          </div>
        );
      },
    },
    {
      header: "الوظيفة",
      headerAlign: "center",
      cellAlign: "center",
      minWidth: true,
      children: [
        {
          header: "الأساسي",
          accessor: "primaryPositionTitle",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (v) => (
            <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v || "ـ")}</span>
          ),
        },
        {
          header: "البديل",
          accessor: "substitutePositionTitle",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (v) => (
            <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v || "ـ")}</span>
          ),
        },
      ],
    },
    {
      header: "ملاحظات",
      cellAlign: "center",
      headerAlign: "center",
      render: (_v, row) => renderNoteCell(row),
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_v, row) => {
        const isConfirmed = confirmedOfficerIds.has(row.id);
        const canModify = canEdit && (!isSubmitted || isAdmin);
        return (
          <div className="flex items-center justify-center gap-1">
            {canModify && (
              <ActionButton
                icon={<Activity className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary hover:bg-(--app-border)"
                title="تعديل التمام"
                onClick={() => setQuickStatusOfficer(row)}
              />
            )}
            {isConfirmed ? (
              <ActionButton
                icon={<Lock className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary"
                title="تم التأكيد (انقر مرتين لإلغاء القفل وإعادة المراجعة)"
                onClick={() => { }}
                onDoubleClick={() => handleUnlockOfficer(row.id)}
              />
            ) : (
              <ActionButton
                icon={<Check className="w-4 h-4 text-(--app-muted-foreground)" />}
                color="btn-action-primary"
                title="تأكيد التمام بعد المراجعة"
                onClick={() => handleToggleConfirmOfficer(row.id)}
              />
            )}
          </div>
        );
      },
    },
  ];

  // ----------------------------------------------------
  // TABLE 2 COLUMNS: جدول الإجازات والراحات
  // م | الأقدمية | الرتبة | الاسم | نوع الإجازة | المدة (من | إلى) | الوظيفة (الأساسي | البديل) | ملاحظات
  // ----------------------------------------------------
  const leaveTableColumns: TableColumn<RollcallOfficerData>[] = [
    {
      header: "م",
      cellAlign: "center",
      minWidth: true,
      render: (_v, _row) => {
        const idx = leaveOfficers.findIndex((o) => o.id === _row.id);
        return <span className="font-mono font-bold text-xs">{table2Start + idx}</span>;
      },
    },
    {
      header: "الأقدمية",
      accessor: "seniorityNumber",
      cellAlign: "center",
      minWidth: true,
      render: (v) => <span className="font-mono text-xs text-(--app-muted-foreground)">{String(v || "ـ")}</span>,
    },
    {
      header: "الرتبة",
      accessor: "rankLabel",
      cellAlign: "center",
      minWidth: true,
      render: (v) => <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v)}</span>,
    },
    {
      header: "الاسم",
      accessor: "fullName",
      cellAlign: "right",
      render: (v) => (
        <span className="text-xs font-black text-(--color-primary)">{String(v)}</span>
      ),
    },
    {
      header: "نوع الإجازة",
      accessor: "leaveTypeLabel",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (v, row) => (
        <span className="text-xs font-bold text-(--app-muted-foreground) px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) whitespace-nowrap">
          {String(v || (row.status === "rest" ? "راحة" : "إجازة رسمية"))}
        </span>
      ),
    },
    {
      header: "المدة",
      headerAlign: "center",
      cellAlign: "center",
      minWidth: true,
      children: [
        {
          header: "من",
          accessor: "leaveStartDate",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (v) => {
            if (!v) return <span className="text-xs text-(--app-muted-foreground)">ـ</span>;
            return (
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xs font-bold text-(--color-primary)">{getDayName(v as string)}</span>
                <span className="text-[11px] font-mono text-(--app-muted-foreground)">{formatDateDisplay(v as string)}</span>
              </div>
            );
          },
        },
        {
          header: "إلى",
          accessor: "leaveEndDate",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (v) => {
            if (!v) return <span className="text-xs text-(--app-muted-foreground)">ـ</span>;
            return (
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xs font-bold text-(--color-primary)">{getDayName(v as string)}</span>
                <span className="text-[11px] font-mono text-(--app-muted-foreground)">{formatDateDisplay(v as string)}</span>
              </div>
            );
          },
        },
      ],
    },
    {
      header: "الوظيفة",
      headerAlign: "center",
      cellAlign: "center",
      minWidth: true,
      children: [
        {
          header: "الأساسي",
          accessor: "primaryPositionTitle",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (v) => (
            <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v || "ـ")}</span>
          ),
        },
        {
          header: "البديل",
          accessor: "substitutePositionTitle",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (v) => (
            <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v || "ـ")}</span>
          ),
        },
      ],
    },
    {
      header: "ملاحظات",
      cellAlign: "center",
      headerAlign: "center",
      render: (_v, row) => {
        const hasMission = Boolean(
          row.missionTitle ||
          row.status === "daily_mission" ||
          row.status === "external_mission" ||
          row.status === "mission" ||
          row.note?.includes("أثناء الإجازة")
        );
        return (
          <div className="flex flex-col items-center justify-center gap-1.5 w-full">
            {hasMission && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewingMissionOfficer(row);
                }}
                className="px-2.5 py-1 rounded-full bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 text-[11px] font-black hover:bg-(--color-primary)/20 cursor-pointer transition-all shadow-xs active:scale-95 whitespace-nowrap shrink-0"
                title={row.missionTitle ? `${row.missionTitle}${row.missionDestination ? ` - ${row.missionDestination}` : ""}` : "مأمورية أثناء الإجازة"}
              >
                مأمورية أثناء الإجازة
              </button>
            )}
            <div className="w-full flex justify-center">
              {renderNoteCell(row)}
            </div>
          </div>
        );
      },
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_v, row) => {
        const isConfirmed = confirmedOfficerIds.has(row.id);
        const canModify = canEdit && (!isSubmitted || isAdmin);
        return (
          <div className="flex items-center justify-center gap-1">
            {canModify && (
              <ActionButton
                icon={<Activity className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary hover:bg-(--app-border)"
                title="تعديل التمام"
                onClick={() => setQuickStatusOfficer(row)}
              />
            )}
            {isConfirmed ? (
              <ActionButton
                icon={<Lock className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary"
                title="تم التأكيد (انقر مرتين لإلغاء القفل وإعادة المراجعة)"
                onClick={() => { }}
                onDoubleClick={() => handleUnlockOfficer(row.id)}
              />
            ) : (
              <ActionButton
                icon={<Check className="w-4 h-4 text-(--app-muted-foreground)" />}
                color="btn-action-primary"
                title="تأكيد التمام بعد المراجعة"
                onClick={() => handleToggleConfirmOfficer(row.id)}
              />
            )}
          </div>
        );
      },
    },
  ];

  // ----------------------------------------------------
  // TABLE 3 COLUMNS: جدول الفرق والدورات والمأموريات الخارجية
  // م | الأقدمية | الرتبة | الاسم | الفرقة / المأمورية | جهة المأمورية | المدة (من | إلى) | ملاحظات
  // ----------------------------------------------------
  const externalMissionTableColumns: TableColumn<RollcallOfficerData>[] = [
    {
      header: "م",
      cellAlign: "center",
      minWidth: true,
      render: (_v, _row) => {
        const idx = externalMissionOfficers.findIndex((o) => o.id === _row.id);
        return <span className="font-mono font-bold text-xs">{table3Start + idx}</span>;
      },
    },
    {
      header: "الأقدمية",
      accessor: "seniorityNumber",
      cellAlign: "center",
      minWidth: true,
      render: (v) => <span className="font-mono text-xs text-(--app-muted-foreground)">{String(v || "ـ")}</span>,
    },
    {
      header: "الرتبة",
      accessor: "rankLabel",
      cellAlign: "center",
      minWidth: true,
      render: (v) => <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v)}</span>,
    },
    {
      header: "الاسم",
      accessor: "fullName",
      cellAlign: "right",
      render: (v) => (
        <span className="text-xs font-black text-(--color-primary)">{String(v)}</span>
      ),
    },
    {
      header: "الفرقة / المأمورية",
      accessor: "missionTitle",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (v, row) => (
        <span className="text-xs font-bold text-(--color-primary) px-2.5 py-0.5 rounded-full bg-(--color-primary)/10 border border-(--color-primary)/20">
          {String(v || (row.isCourse ? "فرقة تدريبية" : "مأمورية رسمية"))}
        </span>
      ),
    },
    {
      header: "جهة المأمورية",
      accessor: "missionDestination",
      cellAlign: "center",
      headerAlign: "center",
      render: (v) => <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v || "ـ")}</span>,
    },
    {
      header: "المدة",
      headerAlign: "center",
      cellAlign: "center",
      minWidth: true,
      children: [
        {
          header: "من",
          accessor: "missionStartDate",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (v) => {
            if (!v) return <span className="text-xs text-(--app-muted-foreground)">ـ</span>;
            return (
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xs font-bold text-(--color-primary)">{getDayName(v as string)}</span>
                <span className="text-[11px] font-mono text-(--app-muted-foreground)">{formatDateDisplay(v as string)}</span>
              </div>
            );
          },
        },
        {
          header: "إلى",
          accessor: "missionEndDate",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (v) => {
            if (!v) return <span className="text-xs text-(--app-muted-foreground)">مستمر</span>;
            return (
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xs font-bold text-(--color-primary)">{getDayName(v as string)}</span>
                <span className="text-[11px] font-mono text-(--app-muted-foreground)">{formatDateDisplay(v as string)}</span>
              </div>
            );
          },
        },
      ],
    },
    {
      header: "ملاحظات",
      cellAlign: "center",
      headerAlign: "center",
      render: (_v, row) => renderNoteCell(row),
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_v, row) => {
        const isConfirmed = confirmedOfficerIds.has(row.id);
        const canModify = canEdit && (!isSubmitted || isAdmin);
        return (
          <div className="flex items-center justify-center gap-1">
            {canModify && (
              <ActionButton
                icon={<Activity className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary hover:bg-(--app-border)"
                title="تعديل التمام"
                onClick={() => setQuickStatusOfficer(row)}
              />
            )}
            {isConfirmed ? (
              <ActionButton
                icon={<Lock className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary"
                title="تم التأكيد (انقر مرتين لإلغاء القفل وإعادة المراجعة)"
                onClick={() => { }}
                onDoubleClick={() => handleUnlockOfficer(row.id)}
              />
            ) : (
              <ActionButton
                icon={<Check className="w-4 h-4 text-(--app-muted-foreground)" />}
                color="btn-action-primary"
                title="تأكيد التمام بعد المراجعة"
                onClick={() => handleToggleConfirmOfficer(row.id)}
              />
            )}
          </div>
        );
      },
    },
  ];

  // ----------------------------------------------------
  // TABLE: جدول الحالات الخاصة والانضباطية والمستشفيات
  // م | الأقدمية | الرتبة | الاسم | نوع الحالة والتمام | الجهة / التفاصيل | الفترة والمدة | ملاحظات | الإجراءات
  // ----------------------------------------------------
  const specialOfficersTableColumns: TableColumn<RollcallOfficerData>[] = [
    {
      header: "م",
      cellAlign: "center",
      minWidth: true,
      render: (_v, _row) => {
        const idx = specialOfficers.findIndex((o) => o.id === _row.id);
        return <span className="font-mono font-bold text-xs">{specialTableStart + idx}</span>;
      },
    },
    {
      header: "الأقدمية",
      accessor: "seniorityNumber",
      cellAlign: "center",
      minWidth: true,
      render: (v) => <span className="font-mono text-xs text-(--app-muted-foreground)">{String(v || "ـ")}</span>,
    },
    {
      header: "الرتبة",
      accessor: "rankLabel",
      cellAlign: "center",
      minWidth: true,
      render: (v) => <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v)}</span>,
    },
    {
      header: "الاسم",
      accessor: "fullName",
      cellAlign: "right",
      render: (v) => (
        <span className="text-xs font-black text-(--color-primary)">{String(v)}</span>
      ),
    },
    {
      header: "نوع الحالة والتمام",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_v, row) => {
        let label = ROLLCALL_STATUS_LABELS[row.status] || "خارج الوحدة";
        if (row.status === "custom_out" && row.customReason) {
          label = row.customReason;
        }
        const canModify = canEdit && (!isSubmitted || isAdmin);
        return (
          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                if (canModify) setQuickStatusOfficer(row);
              }}
              className="px-2.5 py-0.5 rounded-full bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 text-xs font-black hover:bg-(--color-primary)/20 cursor-pointer transition-all shadow-xs"
              title="انقر لتعديل التمام"
            >
              {label}
            </button>
          </div>
        );
      },
    },
    {
      header: "الجهة / التفاصيل",
      cellAlign: "center",
      headerAlign: "center",
      render: (_v, row) => {
        let details = "ـ";
        if (row.status === "hospital" && row.hospitalName) {
          details = `مستشفى: ${row.hospitalName}`;
        } else if (
          (row.status === "prison" || row.status === "unit_arrest" || row.status === "court") &&
          row.disciplinaryAuthority
        ) {
          details = row.disciplinaryAuthority;
        } else if (row.status === "travel_abroad" && row.travelDestination) {
          details = `${row.travelDestination}${row.travelPurpose ? ` (${row.travelPurpose})` : ""}`;
        } else if (row.customReason) {
          details = row.customReason;
        }
        return <span className="text-xs font-bold text-(--app-foreground)">{details}</span>;
      },
    },
    {
      header: "الفترة والمدة",
      headerAlign: "center",
      cellAlign: "center",
      minWidth: true,
      render: (_v, row) => {
        const sDate = row.statusStartDate || row.hospitalAdmissionDate;
        const eDate = row.statusEndDate;
        if (!sDate && !eDate) {
          return <span className="text-xs text-(--app-muted-foreground)">ـ</span>;
        }
        return (
          <div className="flex flex-col items-center leading-tight">
            {sDate && (
              <span className="text-[11px] font-mono text-(--color-primary)">
                من: {formatDateDisplay(sDate)}
              </span>
            )}
            {eDate && (
              <span className="text-[11px] font-mono text-(--app-muted-foreground)">
                إلى: {formatDateDisplay(eDate)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "ملاحظات",
      cellAlign: "center",
      headerAlign: "center",
      render: (_v, row) => renderNoteCell(row),
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_v, row) => {
        const isConfirmed = confirmedOfficerIds.has(row.id);
        const canModify = canEdit && (!isSubmitted || isAdmin);
        return (
          <div className="flex items-center justify-center gap-1">
            {canModify && (
              <ActionButton
                icon={<Activity className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary hover:bg-(--app-border)"
                title="تعديل التمام"
                onClick={() => setQuickStatusOfficer(row)}
              />
            )}
            {isConfirmed ? (
              <ActionButton
                icon={<Lock className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary"
                title="تم التأكيد (انقر مرتين لإلغاء القفل وإعادة المراجعة)"
                onClick={() => {}}
                onDoubleClick={() => handleUnlockOfficer(row.id)}
              />
            ) : (
              <ActionButton
                icon={<Check className="w-4 h-4 text-(--app-muted-foreground)" />}
                color="btn-action-primary"
                title="تأكيد التمام بعد المراجعة"
                onClick={() => handleToggleConfirmOfficer(row.id)}
              />
            )}
          </div>
        );
      },
    },
  ];

  // Helper to build Custom Sub-Table Columns (Dynamic according to personnel presence/leaves)
  const getCustomSubTableColumns = (table: ICustomRollcallTable): TableColumn<RollcallOfficerData>[] => {
    const startIdx = customTableOffsets[table.id] || 1;
    const tableOfficers = customTableOfficersList[table.id] || [];

    const isOfficerOnLeave = (o: RollcallOfficerData) => {
      if (o.isReturningToday) return false;
      return o.status === "leave" || o.status === "rest" || Boolean(o.leaveStartDate || o.leaveTypeLabel);
    };

    const isAllLeave = tableOfficers.length > 0 && tableOfficers.every(isOfficerOnLeave);
    const isAllPresent = tableOfficers.length === 0 || tableOfficers.every((o) => !isOfficerOnLeave(o));
    const isMixed = !isAllLeave && !isAllPresent;

    const cols: TableColumn<RollcallOfficerData>[] = [
      {
        header: "م",
        cellAlign: "center",
        minWidth: true,
        render: (_v, _row) => {
          const idx = tableOfficers.findIndex((o) => o.id === _row.id);
          return <span className="font-mono font-bold text-xs">{startIdx + idx}</span>;
        },
      },
      {
        header: "الأقدمية",
        accessor: "seniorityNumber",
        cellAlign: "center",
        minWidth: true,
        render: (v) => <span className="font-mono text-xs text-(--app-muted-foreground)">{String(v || "ـ")}</span>,
      },
      {
        header: "الرتبة",
        accessor: "rankLabel",
        cellAlign: "center",
        minWidth: true,
        render: (v) => <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v)}</span>,
      },
      {
        header: "الاسم",
        accessor: "fullName",
        cellAlign: "right",
        minWidth: isMixed ? true : undefined,
        render: (v) => (
          <span className="text-xs font-black text-(--color-primary)">{String(v)}</span>
        ),
      },
    ];

    if (isAllPresent) {
      // ------------------------------------------------------------------
      // CASE 1: All officers are present -> Exactly like Table 1 (بالوحدة)
      // ------------------------------------------------------------------
      cols.push(
        {
          header: "التواجد",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (_v, row) => {
            const isMission = Boolean(
              row.status === "daily_mission" ||
              row.status === "external_mission" ||
              row.status === "mission" ||
              row.missionTitle
            );
            if (isMission && !row.isCourse && row.status !== "course") {
              return (
                <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {isRollcallPresent(row.status) && (
                    <div className="w-5 h-5 rounded-full bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingMissionOfficer(row)}
                    className="px-2.5 py-0.5 rounded-full bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 text-[11px] font-black hover:bg-(--color-primary)/20 cursor-pointer transition-all shadow-xs active:scale-95 whitespace-nowrap"
                    title="اضغط لعرض تفاصيل وبيانات المأمورية"
                  >
                    مأمورية
                  </button>
                </div>
              );
            }
            return (
              <div className="flex justify-center">
                <div className="w-5 h-5 rounded-full bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
            );
          },
        },
        {
          header: "آخر عودة",
          headerAlign: "center",
          cellAlign: "center",
          minWidth: true,
          render: (_v, row) => {
            if (!row.lastReturnDateOnly || row.lastReturnDateOnly === "ـ") {
              return <span className="text-xs text-(--app-muted-foreground)">لا توجد عودة</span>;
            }
            return (
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xs font-bold text-(--color-primary)">{row.lastReturnDayName}</span>
                <span className="text-[11px] font-mono text-(--app-muted-foreground)">{row.lastReturnDateOnly}</span>
              </div>
            );
          },
        }
      );
    } else if (isAllLeave) {
      // ------------------------------------------------------------------
      // CASE 2: All officers are on leave -> Exactly like Table 2 (الإجازات)
      // ------------------------------------------------------------------
      cols.push(
        {
          header: "نوع الإجازة",
          accessor: "leaveTypeLabel",
          cellAlign: "center",
          minWidth: true,
          render: (v, row) => {
            const label = String(v || (row.status === "rest" ? "راحة أسبوعية" : "إجازة اعتيادية"));
            const formatted = label.includes("إجازة") || label.includes("راحة") ? label : `إجازة ${label}`;
            const hasMission = Boolean(
              row.missionTitle ||
              row.status === "daily_mission" ||
              row.status === "external_mission" ||
              row.status === "mission"
            );
            return (
              <span className="text-xs font-bold text-(--app-muted-foreground) px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) whitespace-nowrap">
                {formatted}
              </span>
            );
          },
        },
        {
          header: "المدة",
          headerAlign: "center",
          cellAlign: "center",
          minWidth: true,
          children: [
            {
              header: "من",
              accessor: "leaveStartDate",
              cellAlign: "center",
              headerAlign: "center",
              minWidth: true,
              render: (v) => {
                if (!v) return <span className="text-xs text-(--app-muted-foreground)">ـ</span>;
                return (
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-xs font-bold text-(--color-primary)">{getDayName(v as string)}</span>
                    <span className="text-[11px] font-mono text-(--app-muted-foreground)">{formatDateDisplay(v as string)}</span>
                  </div>
                );
              },
            },
            {
              header: "إلى",
              accessor: "leaveEndDate",
              cellAlign: "center",
              headerAlign: "center",
              minWidth: true,
              render: (v) => {
                if (!v) return <span className="text-xs text-(--app-muted-foreground)">مستمر</span>;
                return (
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-xs font-bold text-(--color-primary)">{getDayName(v as string)}</span>
                    <span className="text-[11px] font-mono text-(--app-muted-foreground)">{formatDateDisplay(v as string)}</span>
                  </div>
                );
              },
            },
          ],
        }
      );
    } else {
      // ------------------------------------------------------------------
      // CASE 3: Mixed (Some present, some on leave)
      // ------------------------------------------------------------------
      cols.push(
        {
          header: "التواجد",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (_v, row) => {
            const hasMission = Boolean(
              row.missionTitle ||
              row.status === "daily_mission" ||
              row.status === "external_mission" ||
              row.status === "mission"
            );

            if (isOfficerOnLeave(row)) {
              const label = row.leaveTypeLabel
                ? (row.leaveTypeLabel.includes("إجازة") || row.leaveTypeLabel.includes("راحة")
                  ? row.leaveTypeLabel
                  : `إجازة ${row.leaveTypeLabel}`)
                : (row.status === "rest" ? "راحة" : "إجازة");
              return (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) whitespace-nowrap">
                  {label}
                </span>
              );
            }

            if (hasMission && !row.isCourse && row.status !== "course") {
              return (
                <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {isRollcallPresent(row.status) && (
                    <div className="w-5 h-5 rounded-full bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingMissionOfficer(row)}
                    className="px-2.5 py-0.5 rounded-full bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 text-[11px] font-black hover:bg-(--color-primary)/20 cursor-pointer transition-all shadow-xs active:scale-95 whitespace-nowrap"
                    title="اضغط لعرض تفاصيل وبيانات المأمورية"
                  >
                    مأمورية
                  </button>
                </div>
              );
            }

            return (
              <div className="flex justify-center">
                <div className="w-5 h-5 rounded-full bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
            );
          },
        },
        {
          header: "المدة",
          headerAlign: "center",
          cellAlign: "center",
          minWidth: true,
          children: [
            {
              header: "من",
              cellAlign: "center",
              headerAlign: "center",
              minWidth: true,
              render: (_v, row) => {
                if (!isOfficerOnLeave(row)) return <span className="text-xs text-(--app-muted-foreground)">ـ</span>;
                const startDate = row.leaveStartDate;
                if (!startDate) return <span className="text-xs text-(--app-muted-foreground)">ـ</span>;
                return (
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-xs font-bold text-(--color-primary)">{getDayName(startDate)}</span>
                    <span className="text-[11px] font-mono text-(--app-muted-foreground)">{formatDateDisplay(startDate)}</span>
                  </div>
                );
              },
            },
            {
              header: "إلى",
              cellAlign: "center",
              headerAlign: "center",
              minWidth: true,
              render: (_v, row) => {
                if (!isOfficerOnLeave(row)) return <span className="text-xs text-(--app-muted-foreground)">ـ</span>;
                const endDate = row.leaveEndDate;
                if (!endDate) return <span className="text-xs text-(--app-muted-foreground)">مستمر</span>;
                return (
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-xs font-bold text-(--color-primary)">{getDayName(endDate)}</span>
                    <span className="text-[11px] font-mono text-(--app-muted-foreground)">{formatDateDisplay(endDate)}</span>
                  </div>
                );
              },
            },
          ],
        },
        {
          header: "آخر عودة",
          headerAlign: "center",
          cellAlign: "center",
          minWidth: true,
          render: (_v, row) => {
            if (isOfficerOnLeave(row) || !row.lastReturnDateOnly || row.lastReturnDateOnly === "ـ") {
              return <span className="text-xs text-(--app-muted-foreground)">ـ</span>;
            }
            return (
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xs font-bold text-(--color-primary)">{row.lastReturnDayName}</span>
                <span className="text-[11px] font-mono text-(--app-muted-foreground)">{row.lastReturnDateOnly}</span>
              </div>
            );
          },
        }
      );
    }

    // Optional task column if tasks are assigned
    if (table.officerTasks && Object.values(table.officerTasks).some(Boolean)) {
      cols.push({
        header: "المهمة المكلف بها",
        cellAlign: "center",
        headerAlign: "center",
        minWidth: true,
        render: (_v, row) => {
          const task = table.officerTasks?.[row.id];
          return (
            <span className="text-xs font-bold text-(--app-muted-foreground)">
              {task || "ـ"}
            </span>
          );
        },
      });
    }

    // Positions (Primary and Substitute)
    cols.push({
      header: "الوظيفة",
      headerAlign: "center",
      cellAlign: "center",
      minWidth: true,
      children: [
        {
          header: "الأساسي",
          accessor: "primaryPositionTitle",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (v) => (
            <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v || "ـ")}</span>
          ),
        },
        {
          header: "البديل",
          accessor: "substitutePositionTitle",
          cellAlign: "center",
          headerAlign: "center",
          minWidth: true,
          render: (v) => (
            <span className="text-xs font-bold text-(--app-muted-foreground)">{String(v || "ـ")}</span>
          ),
        },
      ],
    });

    // Notes
    cols.push({
      header: "ملاحظات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: isMixed ? true : undefined,
      render: (_v, row) => {
        const onLeave = isOfficerOnLeave(row);
        const hasMission = Boolean(
          row.missionTitle ||
          row.status === "daily_mission" ||
          row.status === "external_mission" ||
          row.status === "mission" ||
          row.note?.includes("أثناء الإجازة")
        );
        const showMissionBadge = (isAllLeave || onLeave || isMixed) && hasMission;

        if (showMissionBadge) {
          return (
            <div className="flex flex-col items-center justify-center gap-1.5 w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewingMissionOfficer(row);
                }}
                className="px-2.5 py-1 rounded-full bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 text-[11px] font-black hover:bg-(--color-primary)/20 cursor-pointer transition-all shadow-xs active:scale-95 whitespace-nowrap shrink-0"
                title={row.missionTitle ? `${row.missionTitle}${row.missionDestination ? ` - ${row.missionDestination}` : ""}` : (onLeave ? "مأمورية أثناء الإجازة" : "مأمورية")}
              >
                {onLeave ? "مأمورية أثناء الإجازة" : "مأمورية"}
              </button>
              <div className="w-full flex justify-center">
                {renderNoteCell(row)}
              </div>
            </div>
          );
        }

        return (
          <div className="w-full flex justify-center">
            {renderNoteCell(row)}
          </div>
        );
      },
    });

    // Actions
    cols.push({
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      minWidth: true,
      render: (_v, row) => {
        const isConfirmed = confirmedOfficerIds.has(row.id);
        return (
          <div className="flex items-center justify-center gap-1">
            {isConfirmed ? (
              <ActionButton
                icon={<Lock className="w-4 h-4 text-(--color-primary)" />}
                color="btn-action-primary"
                title="تم التأكيد (انقر مرتين لإلغاء القفل وإعادة المراجعة)"
                onClick={() => { }}
                onDoubleClick={() => handleUnlockOfficer(row.id)}
              />
            ) : (
              <ActionButton
                icon={<Check className="w-4 h-4 text-(--app-muted-foreground)" />}
                color="btn-action-primary"
                title="تأكيد التمام بعد المراجعة"
                onClick={() => handleToggleConfirmOfficer(row.id)}
              />
            )}
            {canEdit && !isSubmitted && (
              <ActionButton
                icon={<Trash2 className="w-4 h-4" />}
                color="btn-action-primary"
                title="حذف الضابط من الجدول المخصص"
                onClick={() => handleRemoveOfficerFromCustomTable(table.id, row.id)}
              />
            )}
          </div>
        );
      },
    });

    return cols;
  };

  return (
    <div className="space-y-8">
      <div className="space-y-8 print:hidden">
        {/* Medical Status Alert Banner */}
        {medicalOfficers.length > 0 && (
          <div className="p-4 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-right">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-(--color-primary)/10 text-(--color-primary) rounded-xl shrink-0">
                <Activity className="w-5 h-5 text-(--color-primary)" />
              </div>
              <div>
                <h4 className="text-sm font-black text-(--color-primary)">
                  بيان المزامنة الطبية التلقائية ({medicalOfficers.length} ضابط)
                </h4>
                <p className="text-xs font-bold text-(--app-muted-foreground) mt-0.5">
                  تم تحديث وقفل حالات الكشف بالعيادة، الراحات الطبية، والتحويل للمستشفيات العسكرية تلقائياً من النقطة الطبية.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {medicalCounts.clinic > 0 && (
                <span className="px-3 py-1.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-xs font-bold text-(--app-muted-foreground)">
                  عيادة: <strong className="text-(--color-primary) font-black">{medicalCounts.clinic}</strong>
                </span>
              )}
              {medicalCounts.rest > 0 && (
                <span className="px-3 py-1.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-xs font-bold text-(--app-muted-foreground)">
                  راحة طبية: <strong className="text-(--color-primary) font-black">{medicalCounts.rest}</strong>
                </span>
              )}
              {medicalCounts.hospital > 0 && (
                <span className="px-3 py-1.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-xs font-bold text-(--app-muted-foreground)">
                  حجز بمستشفى: <strong className="text-(--color-primary) font-black">{medicalCounts.hospital}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 1. TABLE 1: الموجود بالوحدة */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                <Building2 className="h-5 w-5 text-(--color-primary)" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-(--color-primary) flex items-center gap-2">
                  <span>الموجود بالوحدة</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                    {displayedPresentOfficers.length !== presentOfficers.length
                      ? `${displayedPresentOfficers.length} من ${presentOfficers.length} ضابط`
                      : `${presentOfficers.length} ضابط`}
                  </span>
                </h2>
              </div>
            </div>
          </div>

          <MainTable<RollcallOfficerData>
            columns={presentTableColumns}
            data={displayedPresentOfficers}
            showSerialNumber={false}
            emptyTitle="لا يوجد ضباط متواجدين حالياً"
          />
        </div>

        {/* ---------------------------------------------------- */}
        {/* 3. TABLE 2: الإجازات والراحات */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                <Calendar className="h-5 w-5 text-(--color-primary)" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-(--color-primary) flex items-center gap-2">
                  <span>الإجازات والراحات</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                    {displayedLeaveOfficers.length !== leaveOfficers.length
                      ? `${displayedLeaveOfficers.length} من ${leaveOfficers.length} ضابط`
                      : `${leaveOfficers.length} ضابط`}
                  </span>
                </h2>
              </div>
            </div>
          </div>

          <MainTable<RollcallOfficerData>
            columns={leaveTableColumns}
            data={displayedLeaveOfficers}
            showSerialNumber={false}
            emptyTitle="لا يوجد ضباط في إجازات أو راحات"
          />
        </div>

        {/* ---------------------------------------------------- */}
        {/* 4. TABLE 3: الفرق والدورات والمأموريات الخارجية */}
        {/* ---------------------------------------------------- */}
        {externalMissionOfficers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                  <Plane className="h-5 w-5 text-(--color-primary)" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-(--color-primary) flex items-center gap-2">
                    <span>الفرق والدورات والمأموريات الخارجية</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                      {displayedExternalMissionOfficers.length !== externalMissionOfficers.length
                        ? `${displayedExternalMissionOfficers.length} من ${externalMissionOfficers.length} ضابط`
                        : `${externalMissionOfficers.length} ضابط`}
                    </span>
                  </h2>
                </div>
              </div>
            </div>

            <MainTable<RollcallOfficerData>
              columns={externalMissionTableColumns}
              data={displayedExternalMissionOfficers}
              showSerialNumber={false}
              emptyTitle="لا يوجد ضباط في فرق أو مأموريات خارجية"
            />
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 4.5. TABLE: الحالات الخاصة والانضباطية والمستشفيات */}
        {/* ---------------------------------------------------- */}
        {specialOfficers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                  <Activity className="h-5 w-5 text-(--color-primary)" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-(--color-primary) flex items-center gap-2">
                    <span>الحالات الخاصة والانضباطية والمستشفيات</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                      {displayedSpecialOfficers.length !== specialOfficers.length
                        ? `${displayedSpecialOfficers.length} من ${specialOfficers.length} ضابط`
                        : `${specialOfficers.length} ضابط`}
                    </span>
                  </h2>
                </div>
              </div>
            </div>

            <MainTable<RollcallOfficerData>
              columns={specialOfficersTableColumns}
              data={displayedSpecialOfficers}
              showSerialNumber={false}
              emptyTitle="لا توجد حالات خاصة أو انضباطية أو مستشفيات مسجلة"
            />
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 5. Custom Sub-Tables (الجداول المستقلة) */}
        {/* ---------------------------------------------------- */}
        {customTables.map((customTable) => {
          const allTableOfficers = customTableOfficersList[customTable.id] || [];
          const tableOfficers = allTableOfficers.filter(matchSearch);
          return (
            <div key={customTable.id} className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                    <Layers className="h-5 w-5 text-(--color-primary)" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-(--color-primary) flex items-center gap-2">
                      <span>{customTable.name}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                        {tableOfficers.length !== allTableOfficers.length
                          ? `${tableOfficers.length} من ${allTableOfficers.length} ضابط`
                          : `${allTableOfficers.length} ضابط`}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 font-bold">
                        {customTable.isInsideUnit ? "يحتسب موجود بالوحدة" : "يحتسب خارج الوحدة"}
                      </span>
                    </h2>
                    {customTable.notes && (
                      <p className="text-xs text-(--app-muted-foreground) mt-0.5">{customTable.notes}</p>
                    )}
                  </div>
                </div>

                {canEdit && !isSubmitted && (
                  <div className="flex items-center gap-2">
                    <ActionButton
                      icon={<Edit2 className="w-4 h-4" />}
                      color="btn-action-primary"
                      title={`تعديل جدول "${customTable.name}"`}
                      onClick={() => setActiveCustomTableModal({ isOpen: true, table: customTable })}
                    />
                    <ActionButton
                      icon={<Trash2 className="w-4 h-4" />}
                      color="btn-action-primary"
                      title={`حذف جدول "${customTable.name}"`}
                      onClick={() => handleDeleteCustomTable(customTable.id)}
                    />
                  </div>
                )}
              </div>

              <MainTable<RollcallOfficerData>
                columns={getCustomSubTableColumns(customTable)}
                data={tableOfficers}
                showSerialNumber={false}
                emptyTitle="لم يتم إدراج ضباط في هذا الجدول بعد"
              />
            </div>
          );
        })}

        {/* ---------------------------------------------------- */}
        {/* 6. TABLE 5: بيان تمام الضباط (الإحصائية العسكرية المعتمدة) */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                <ShieldCheck className="h-5 w-5 text-(--color-primary)" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-(--color-primary) flex items-center gap-2">
                  <span>بيان تمام الضباط</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) font-bold">
                    <span className="font-mono text-(--color-primary)">{dateDisplay}</span>
                  </span>
                </h2>
              </div>
            </div>
          </div>

          {/* Dynamic Out Columns Calculation */}
          {(() => {
            const dynamicOutColumns = computeDetailedOutColumns(localOfficers, customTables);

            const hasOut = stats.totalOut > 0;
            const outColSpan = Math.max(1, dynamicOutColumns.length);

            // Check if there are other presence categories besides inside unit (daily mission, clinic, custom tables)
            const hasMultiplePresentCategories = stats.dailyMissionCount > 0 || stats.clinicCount > 0 || insideCustomTables.length > 0;
            const hasMultiLevelHeader = hasMultiplePresentCategories || hasOut;
            const presentColSpan = hasMultiplePresentCategories ? (3 + insideCustomTables.length) : 1;

            // Smart Hierarchical Hover Helpers:
            // Highlighting rules according to requirement:
            // 1. When hovering parent (الأب): highlight all children in tbody, NO headers highlighted.
            // 2. When hovering child (الابن) in tbody: highlight its direct ancestor parents (both headers and cells) up to root, but DO NOT highlight sibling children.

            const isBodyCellHighlighted = (cellKey: "total" | "present_summary" | "present_child" | "out_summary" | "out_child", childId?: string) => {
              if (!table5Hover) return false;

              // If hovering "total" parent: all body cells highlighted!
              if (table5Hover.type === "total") {
                return true;
              }

              // If hovering "present" parent: all present body cells highlighted
              if (table5Hover.type === "present") {
                return cellKey === "present_summary" || cellKey === "present_child";
              }

              // If hovering "out" parent: all out body cells highlighted (summary + detailed)
              if (table5Hover.type === "out") {
                return cellKey === "out_summary" || cellKey === "out_child";
              }

              // If hovering a "present_child" cell:
              if (table5Hover.type === "present_child") {
                // Highlight itself
                if (cellKey === "present_child" && table5Hover.id === childId) return true;
                return false;
              }

              // If hovering an "out_child" cell:
              if (table5Hover.type === "out_child") {
                // Highlight itself and ancestor summary cell
                if (cellKey === "out_child" && table5Hover.id === childId) return true;
                if (cellKey === "out_summary") return true;
                return false;
              }

              return false;
            };

            const bodyHighlightClass = "!bg-(--app-surface-container)/60 transition-colors duration-150";

            return (
              <SectionWrapper noPadding className="overflow-hidden rounded-2xl">
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-center text-xs divide-y divide-(--app-border)/40"
                    onMouseLeave={() => setTable5Hover(null)}
                  >
                    <thead className="bg-[var(--color-primary)] dark:bg-(--color-primary)/10 text-white dark:text-(--color-primary) border-b border-(--app-border) text-xs">
                      <tr>
                        {/* Parent: Total Officers Header */}
                        <th
                          onMouseEnter={() => setTable5Hover({ type: "total" })}
                          className="py-3 px-4 text-center font-extrabold cursor-pointer"
                          rowSpan={hasMultiLevelHeader ? 2 : 1}
                          style={{ width: "1%", whiteSpace: "nowrap" }}
                        >
                          اجمالي القوة
                        </th>

                        {/* Parent: Present Officers Header */}
                        {hasMultiplePresentCategories ? (
                          <th
                            onMouseEnter={() => setTable5Hover({ type: "present" })}
                            className="py-2.5 px-4 text-center font-extrabold cursor-pointer"
                            colSpan={presentColSpan}
                            style={{ width: "1%", whiteSpace: "nowrap" }}
                          >
                            الموجود ({stats.totalPresent}) ضابط
                          </th>
                        ) : (
                          <th
                            onMouseEnter={() => setTable5Hover({ type: "present" })}
                            className="py-3 px-4 text-center font-extrabold cursor-pointer"
                            rowSpan={hasMultiLevelHeader ? 2 : 1}
                            style={{ width: "1%", whiteSpace: "nowrap" }}
                          >
                            الموجود
                          </th>
                        )}

                        {/* Parent: Out Officers Header */}
                        {hasOut ? (
                          <>
                            <th
                              onMouseEnter={() => setTable5Hover({ type: "out" })}
                              className="py-3 px-4 text-center font-extrabold cursor-pointer"
                              rowSpan={2}
                              style={{ width: "1%", whiteSpace: "nowrap" }}
                            >
                              الخارج ({stats.totalOut}) ضابط
                            </th>
                            <th
                              onMouseEnter={() => setTable5Hover({ type: "out" })}
                              className="py-2.5 px-4 text-center font-extrabold cursor-pointer"
                              colSpan={outColSpan}
                              style={{ width: "1%", whiteSpace: "nowrap" }}
                            >
                              بيان تفصيلي للخارج
                            </th>
                          </>
                        ) : (
                          <th
                            onMouseEnter={() => setTable5Hover({ type: "out" })}
                            className="py-3 px-4 text-center font-extrabold cursor-pointer"
                            rowSpan={hasMultiLevelHeader ? 2 : 1}
                            style={{ width: "1%", whiteSpace: "nowrap" }}
                          >
                            الخارج
                          </th>
                        )}
                      </tr>

                      {hasMultiLevelHeader && (
                        <tr className="border-t border-white/20 dark:border-white/10 text-[11px] font-bold">
                          {/* الموجود sub-columns (only if multiple categories) */}
                          {hasMultiplePresentCategories && (
                            <>
                              <th
                                onMouseEnter={() => setTable5Hover({ type: "present_child", id: "inside_unit" })}
                                className="py-2 px-3 text-center cursor-pointer"
                                style={{ width: "1%", whiteSpace: "nowrap" }}
                              >
                                داخل الوحدة
                              </th>
                              <th
                                onMouseEnter={() => setTable5Hover({ type: "present_child", id: "daily_mission" })}
                                className="py-2 px-3 text-center cursor-pointer"
                                style={{ width: "1%", whiteSpace: "nowrap" }}
                              >
                                مأمورية يومية
                              </th>
                              <th
                                onMouseEnter={() => setTable5Hover({ type: "present_child", id: "clinic" })}
                                className="py-2 px-3 text-center cursor-pointer"
                                style={{ width: "1%", whiteSpace: "nowrap" }}
                              >
                                عيادة
                              </th>
                              {insideCustomTables.map((tbl) => (
                                <th
                                  key={tbl.id}
                                  onMouseEnter={() => setTable5Hover({ type: "present_child", id: tbl.id })}
                                  className="py-2 px-3 text-center cursor-pointer"
                                  style={{ width: "1%", whiteSpace: "nowrap" }}
                                >
                                  {tbl.name}
                                </th>
                              ))}
                            </>
                          )}

                          {/* بيان تفصيلي للخارج sub-columns (Dynamic, only when hasOut) */}
                          {hasOut &&
                            dynamicOutColumns.map((col) => (
                              <th
                                key={col.id}
                                onMouseEnter={() => setTable5Hover({ type: "out_child", id: col.id })}
                                className="py-2 px-3 text-center cursor-pointer"
                                style={{ width: "1%", whiteSpace: "nowrap" }}
                              >
                                {col.label}
                              </th>
                            ))}
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-(--app-border)/40 text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface)">
                      <tr className="transition-colors">
                        {/* اجمالي القوة with ModalBadge (Parent Hover Trigger) */}
                        <td
                          onMouseEnter={() => setTable5Hover({ type: "total" })}
                          className={`py-3.5 px-4 whitespace-nowrap cursor-pointer transition-colors ${
                            isBodyCellHighlighted("total") ? bodyHighlightClass : "hover:bg-(--app-surface-container)/60"
                          }`}
                          style={{ width: "1%", whiteSpace: "nowrap" }}
                        >
                          <div className="flex justify-center">
                            <ModalBadge>
                              <span className="font-mono text-sm font-black text-(--color-primary)">
                                {stats.totalOfficers}
                              </span>
                            </ModalBadge>
                          </div>
                        </td>

                        {/* الموجود values */}
                        {hasMultiplePresentCategories ? (
                          <>
                            <td
                              onMouseEnter={() => setTable5Hover({ type: "present_child", id: "inside_unit" })}
                              className={`py-3.5 px-3 font-mono text-sm font-extrabold text-(--app-foreground) whitespace-nowrap cursor-pointer transition-colors ${
                                isBodyCellHighlighted("present_child", "inside_unit")
                                  ? bodyHighlightClass
                                  : "hover:bg-(--app-surface-container)/60"
                              }`}
                              style={{ width: "1%", whiteSpace: "nowrap" }}
                            >
                              {stats.insideCenterCount}
                            </td>
                            <td
                              onMouseEnter={() => setTable5Hover({ type: "present_child", id: "daily_mission" })}
                              className={`py-3.5 px-3 font-mono text-sm font-extrabold text-(--app-foreground) whitespace-nowrap cursor-pointer transition-colors ${
                                isBodyCellHighlighted("present_child", "daily_mission")
                                  ? bodyHighlightClass
                                  : "hover:bg-(--app-surface-container)/60"
                              }`}
                              style={{ width: "1%", whiteSpace: "nowrap" }}
                            >
                              {stats.dailyMissionCount}
                            </td>
                            <td
                              onMouseEnter={() => setTable5Hover({ type: "present_child", id: "clinic" })}
                              className={`py-3.5 px-3 font-mono text-sm font-extrabold text-(--app-foreground) whitespace-nowrap cursor-pointer transition-colors ${
                                isBodyCellHighlighted("present_child", "clinic")
                                  ? bodyHighlightClass
                                  : "hover:bg-(--app-surface-container)/60"
                              }`}
                              style={{ width: "1%", whiteSpace: "nowrap" }}
                            >
                              {stats.clinicCount}
                            </td>
                            {insideCustomTables.map((tbl) => {
                              const count = (customTableOfficersList[tbl.id] || []).length;
                              return (
                                <td
                                  key={tbl.id}
                                  onMouseEnter={() => setTable5Hover({ type: "present_child", id: tbl.id })}
                                  className={`py-3.5 px-3 font-mono text-sm font-extrabold text-(--app-foreground) whitespace-nowrap cursor-pointer transition-colors ${
                                    isBodyCellHighlighted("present_child", tbl.id)
                                      ? bodyHighlightClass
                                      : "hover:bg-(--app-surface-container)/60"
                                  }`}
                                  style={{ width: "1%", whiteSpace: "nowrap" }}
                                >
                                  {count}
                                </td>
                              );
                            })}
                          </>
                        ) : (
                          <td
                            onMouseEnter={() => setTable5Hover({ type: "present" })}
                            className={`py-3.5 px-4 whitespace-nowrap cursor-pointer transition-colors ${
                              isBodyCellHighlighted("present_summary")
                                ? bodyHighlightClass
                                : "hover:bg-(--app-surface-container)/60"
                            }`}
                            style={{ width: "1%", whiteSpace: "nowrap" }}
                          >
                            <div className="flex justify-center">
                              <ModalBadge>
                                <span className="font-mono text-sm font-black text-(--color-primary)">
                                  {stats.totalPresent}
                                </span>
                              </ModalBadge>
                            </div>
                          </td>
                        )}

                        {/* الخارج with ModalBadge (Parent Hover Trigger) */}
                        {hasOut ? (
                          <>
                            <td
                              onMouseEnter={() => setTable5Hover({ type: "out" })}
                              className={`py-3.5 px-4 whitespace-nowrap cursor-pointer transition-colors ${
                                isBodyCellHighlighted("out_summary")
                                  ? bodyHighlightClass
                                  : "hover:bg-(--app-surface-container)/60"
                              }`}
                              style={{ width: "1%", whiteSpace: "nowrap" }}
                            >
                              <div className="flex justify-center">
                                <ModalBadge>
                                  <span className="font-mono text-sm font-black text-(--color-primary)">
                                    {stats.totalOut}
                                  </span>
                                </ModalBadge>
                              </div>
                            </td>

                            {/* بيان تفصيلي للخارج sub-columns values (Child Hover Trigger) */}
                            {dynamicOutColumns.map((col) => (
                              <td
                                key={col.id}
                                onMouseEnter={() => setTable5Hover({ type: "out_child", id: col.id })}
                                className={`py-3.5 px-3 font-mono text-sm font-extrabold text-(--app-foreground) whitespace-nowrap cursor-pointer transition-colors ${
                                  isBodyCellHighlighted("out_child", col.id)
                                    ? bodyHighlightClass
                                    : "hover:bg-(--app-surface-container)/60"
                                }`}
                                style={{ width: "1%", whiteSpace: "nowrap" }}
                              >
                                {col.count}
                              </td>
                            ))}
                          </>
                        ) : (
                          <td
                            onMouseEnter={() => setTable5Hover({ type: "out" })}
                            className={`py-3.5 px-4 whitespace-nowrap cursor-pointer transition-colors ${
                              isBodyCellHighlighted("out_summary")
                                ? bodyHighlightClass
                                : "hover:bg-(--app-surface-container)/60"
                            }`}
                            style={{ width: "1%", whiteSpace: "nowrap" }}
                          >
                            <div className="flex justify-center">
                              <ModalBadge>
                                <span className="text-xs font-black text-(--color-primary)">لا خارج</span>
                              </ModalBadge>
                            </div>
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </SectionWrapper>
            );
          })()}
        </div>
      </div>

      {/* Hidden print container */}
      <div className="hidden print:block">
        <RollcallPrintReport
          unitName={unitName}
          date={date}
          dateDisplay={dateDisplay}
          isSubmitted={isSubmitted}
          entries={localOfficers.map((o) => {
            const assignedCustom = customTableOfficerMap.get(o.id);
            let finalStatus: RollcallStatus = o.status;
            if (o.isReturningToday) {
              finalStatus = "present";
            }
            return {
              officerId: o.id,
              militaryId: o.militaryId,
              fullName: o.fullName,
              rank: o.rank,
              rankLabel: o.rankLabel,
              primaryPositionTitle: o.primaryPositionTitle,
              status: finalStatus,
              note: notesMap[o.id] || o.note,
              customReason: assignedCustom ? assignedCustom.name : o.customReason,
              hospitalName: o.hospitalName,
              hospitalAdmissionDate: o.hospitalAdmissionDate,
              disciplinaryType: o.disciplinaryType,
              disciplinaryAuthority: o.disciplinaryAuthority,
              travelDestination: o.travelDestination,
              travelPurpose: o.travelPurpose,
              statusStartDate: o.statusStartDate,
              statusEndDate: o.statusEndDate,
              leaveTypeLabel: o.leaveTypeLabel,
              leaveStartDate: o.leaveStartDate,
              leaveEndDate: o.leaveEndDate,
              missionTitle: o.missionTitle,
              missionDestination: o.missionDestination,
              missionStartDate: o.missionStartDate,
              missionEndDate: o.missionEndDate,
              isReturningToday: o.isReturningToday,
              lastReturnDateOnly: o.lastReturnDateOnly,
              lastReturnDayName: o.lastReturnDayName,
            };
          })}
          targetOfficerCount={totalOfficersCount}
          customTables={customTables}
        />
      </div>

      {/* Confirmation Modals */}
      <ConfirmSubmitModal
        isOpen={confirmSubmitOpen}
        submitting={submitting}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={executeSubmitFinal}
      />

      <ConfirmReopenModal
        isOpen={confirmReopenOpen}
        onClose={() => setConfirmReopenOpen(false)}
        onConfirm={executeReopen}
      />

      {tableToDelete && (() => {
        const tblObj = customTables.find((t) => t.id === tableToDelete);
        const tblName = tblObj ? `جدول "${tblObj.name}"` : "الجدول";
        return (
          <DeleteTableModal
            tableName={tblName}
            isOpen={Boolean(tableToDelete)}
            onClose={() => setTableToDelete(null)}
            onConfirm={() => {
              if (tableToDelete) {
                executeDeleteCustomTable(tableToDelete);
              }
            }}
          />
        );
      })()}

      {/* Modals */}
      <CustomRollcallTableModal
        isOpen={activeCustomTableModal.isOpen}
        tableData={activeCustomTableModal.table}
        allOfficers={allOfficersOptionList}
        onClose={() => setActiveCustomTableModal({ isOpen: false, table: null })}
        onSave={handleSaveCustomTable}
      />

      <RollcallHistoryModal
        isOpen={isHistoryOpen}
        currentDate={date}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Officer Mission Details Modal */}
      <MissionDetailsModal
        officer={viewingMissionOfficer}
        onClose={() => setViewingMissionOfficer(null)}
      />

      {/* Note Edit Modal */}
      <OfficerNoteModal
        officer={editingNoteOfficer?.officer || null}
        initialNote={editingNoteOfficer?.noteText || ""}
        isOpen={Boolean(editingNoteOfficer)}
        onClose={() => setEditingNoteOfficer(null)}
        onSave={(officerId, note) => {
          handleNoteChange(officerId, note);
          setEditingNoteOfficer(null);
          showToast("تم حفظ الملاحظة بنجاح", "success");
        }}
        onDelete={(officerId) => {
          handleNoteChange(officerId, "");
          setEditingNoteOfficer(null);
          showToast("تم حذف الملاحظة بنجاح", "info");
        }}
      />

      {/* Quick Status Modal (عيادة / مستشفى / حالات انضباطية / سفر / راحات / غياب) */}
      <QuickStatusModal
        isOpen={Boolean(quickStatusOfficer)}
        onClose={() => setQuickStatusOfficer(null)}
        officer={quickStatusOfficer}
        onSave={handleQuickStatusSave}
      />
    </div>
  );
}
