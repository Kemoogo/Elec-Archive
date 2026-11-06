"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Shield,
  AlertCircle,
  Plus,
  BarChart3,
  RefreshCw,
  X,
  History,
  AlertTriangle,
  ArrowRight,
  Clock,
  ShieldCheck,
  ArrowLeftRight,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { LoadingState } from "@/components/ui/loading-state";
import { ModalShell, ModalHeaderCard } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { DateField } from "@/components/ui/date-field";
import { useToast } from "@/components/ui/toast";
import {
  getWeekRange,
  getSmartWeekRangeInfo,
  checkDutyConflict,
  type SmartWeekRangeInfo,
  type WeekInfo,
} from "@/lib/arkan-harb/roster-engine";
import { RosterWeekDisplay } from "@/components/arkan-harb/RosterWeekDisplay";
import { DutySwapModal } from "@/components/arkan-harb/DutySwapModal";
import { DutySwapHistoryModal } from "@/components/arkan-harb/DutySwapHistoryModal";
import {
  DEFAULT_DUTY_ROLES,
  type DutyRosterStatus,
  type IOfficerDutyEquityStat,
  type WeekDayInfo,
  type IDutySwapRecord,
} from "@/lib/db/models/DutyRoster.shared";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/db/models/Leave.shared";
import type { OfficerOption } from "@/types";

interface FormattedRosterEntry {
  date: string; // YYYY-MM-DD
  dutyType: string;
  dutyTitle: string;
  assignedOfficerId: string;
  assignedOfficerName?: string;
  assignedOfficerRank?: string;
  assignedOfficerLabel?: string;
  yadakOfficerId?: string;
  yadakOfficerName?: string;
  yadakOfficerRank?: string;
  yadakOfficerLabel?: string;
  isSwapped?: boolean;
  originalOfficerId?: string;
  originalOfficerName?: string;
  originalOfficerRank?: string;
  originalOfficerLabel?: string;
  swapReason?: string;
  swappedAt?: string;
  swapHistory?: IDutySwapRecord[];
  substituteOfficerId?: string;
  substituteOfficerName?: string;
  isForcedAssignment?: boolean;
  notes?: string;
  isHoliday: boolean;
}

interface DutyRosterTabProps {
  officers: OfficerOption[];
  canEdit: boolean;
  isAdmin?: boolean;
  isCommander?: boolean;
}

interface DutyRoleColumn {
  key: string;
  title: string;
  isCustom?: boolean;
}

export function DutyRosterTab({
  officers = [],
  canEdit,
  isAdmin = false,
  isCommander = false,
}: DutyRosterTabProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive selected reference date for the week directly from URL searchParams
  const dateParam = searchParams.get("date");
  const activeTabParam = searchParams.get("tab") || "dashboard";
  const urlSearch = (searchParams.get("search") || "").trim().toLowerCase();
  const selectedDate = useMemo(() => {
    if (dateParam && !isNaN(Date.parse(dateParam))) {
      return new Date(dateParam);
    }
    return new Date();
  }, [dateParam]);

  // Calculate week schedule (8 days for current week, 7 days for other weeks)
  const weekInfo: WeekInfo = useMemo(
    () => getWeekRange(selectedDate, new Date()),
    [selectedDate]
  );
  const weekRangeInfo: SmartWeekRangeInfo = useMemo(
    () => getSmartWeekRangeInfo(selectedDate, new Date()),
    [selectedDate]
  );
  const isViewingDifferentWeek = !weekRangeInfo.isCurrentWeek;

  const [status, setStatus] = useState<DutyRosterStatus>("draft");
  const [approvedByCommander, setApprovedByCommander] = useState(false);
  const [commanderNotes, setCommanderNotes] = useState("");
  const [entries, setEntries] = useState<FormattedRosterEntry[]>([]);
  const [customDuties, setCustomDuties] = useState<string[]>([]);
  const [equityStats, setEquityStats] = useState<IOfficerDutyEquityStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showEquity, setShowEquity] = useState(false);
  const [weekLeaves, setWeekLeaves] = useState<
    Array<{ officerId: string; startDate: string; endDate: string; status: string; type?: string }>
  >([]);
  const [weekMissions, setWeekMissions] = useState<
    Array<{ officerId: string; startDate: string; endDate?: string | null; status: string; title: string; missionType?: string }>
  >([]);

  // Modal State for Assigning / Editing Officer in a Duty Cell (Draft Mode)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [modalTargetDay, setModalTargetDay] = useState<WeekDayInfo | null>(null);
  const [modalDutyKey, setModalDutyKey] = useState<string>("");
  const [modalDutyTitle, setModalDutyTitle] = useState<string>("");
  const [modalAssignedOfficerId, setModalAssignedOfficerId] = useState("");
  const [modalYadakOfficerId, setModalYadakOfficerId] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalConflictWarning, setModalConflictWarning] = useState<string | null>(null);
  const [modalIsEditing, setModalIsEditing] = useState(false);
  const [forceAssignOnLeave, setForceAssignOnLeave] = useState(false);

  // Modal State for Duty Swap (Approved Mode - تقديم مبادلة)
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTargetData, setSwapTargetData] = useState<{
    day: WeekDayInfo;
    dutyType: string;
    dutyTitle: string;
    entry: FormattedRosterEntry;
    targetRole?: "primary" | "yadak";
  } | null>(null);

  // Modal State for Duty Swap History (عرض السجل التاريخي)
  const [isSwapHistoryModalOpen, setIsSwapHistoryModalOpen] = useState(false);
  const [swapHistoryTargetData, setSwapHistoryTargetData] = useState<{
    day: WeekDayInfo;
    dutyType: string;
    dutyTitle: string;
    entry: FormattedRosterEntry;
    targetRole?: "primary" | "yadak";
  } | null>(null);


  // Today reference for highlighting and past duties protection
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // Table rows with today's row highlighted, keeping hover effect on text only
  const tableData = useMemo(() => {
    const mapped = weekInfo.days.map((day) => {
      const isToday = day.dateString === todayStr;
      return {
        ...day,
        className: isToday
          ? "bg-(--color-primary)/8 hover:bg-(--color-primary)/8 font-bold transition-colors"
          : "hover:bg-transparent transition-colors",
      };
    });
    if (!urlSearch) return mapped;
    return mapped.filter((day) => {
      if (day.dayName.toLowerCase().includes(urlSearch) || day.dateString.includes(urlSearch)) {
        return true;
      }
      const dayEntries = entries.filter((e) => e.date === day.dateString);
      return dayEntries.some(
        (e) =>
          (e.assignedOfficerLabel && e.assignedOfficerLabel.toLowerCase().includes(urlSearch)) ||
          (e.assignedOfficerName && e.assignedOfficerName.toLowerCase().includes(urlSearch)) ||
          (e.yadakOfficerLabel && e.yadakOfficerLabel.toLowerCase().includes(urlSearch)) ||
          (e.yadakOfficerName && e.yadakOfficerName.toLowerCase().includes(urlSearch)) ||
          (e.dutyTitle && e.dutyTitle.toLowerCase().includes(urlSearch))
      );
    });
  }, [weekInfo.days, todayStr, urlSearch, entries]);

  // Modal State for Adding Custom Duty
  const [isAddDutyModalOpen, setIsAddDutyModalOpen] = useState(false);
  const [newDutyTitle, setNewDutyTitle] = useState("");

  // Modal State for Ending / Removing Custom Duty
  const [endingCustomDutyTitle, setEndingCustomDutyTitle] = useState<string | null>(null);

  // Modal State for History / Date Selector
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetDate, setHistoryTargetDate] = useState<string>(
    weekInfo.startDateString
  );

  // Officer options for CustomSelect (ensuring out-of-unit officers are strictly excluded)
  const officerOptions: CustomSelectOption[] = useMemo(() => {
    return officers.map((o) => ({
      value: o.id,
      label: o.officerLabel || `${o.rank} / ${o.fullName || o.name}`,
      description: `رقم الأقدمية: ${o.seniorityNumber || "ـ"}`,
    }));
  }, [officers]);

  // Dynamic officer options for the Assign Modal: marks officers already assigned to another duty today as disabled,
  // and surfaces active approved leaves or missions with distinct badges.
  const modalAssignedOfficerOptions: CustomSelectOption[] = useMemo(() => {
    if (!modalTargetDay) return officerOptions;
    const targetDateStr = modalTargetDay.dateString;

    return officers.map((o) => {
      // 1. Strict same-day conflict (already assigned to another duty today)
      const sameDayOtherDuty = entries.find(
        (e) =>
          e.date === targetDateStr &&
          e.assignedOfficerId === o.id &&
          !(e.dutyType === modalDutyKey || e.dutyTitle === modalDutyTitle)
      );

      // 2. Approved leave covering this target day
      const leaveOnDay = weekLeaves.find((l) => {
        if (l.officerId !== o.id) return false;
        if (l.status !== "approved" && l.status !== "extension_pending") return false;
        const s = l.startDate.slice(0, 10);
        const e = l.endDate.slice(0, 10);
        return targetDateStr >= s && targetDateStr <= e;
      });

      // 3. Active mission covering this target day
      const missionOnDay = weekMissions.find((m) => {
        if (m.officerId !== o.id) return false;
        if (m.status !== "scheduled" && m.status !== "active") return false;
        const s = m.startDate.slice(0, 10);
        const e = m.endDate ? m.endDate.slice(0, 10) : "9999-12-31";
        return targetDateStr >= s && targetDateStr <= e;
      });

      let description = `رقم الأقدمية: ${o.seniorityNumber || "ـ"}`;
      let badge: string | undefined = undefined;

      if (sameDayOtherDuty) {
        description = `معين بالفعل اليوم في: ${sameDayOtherDuty.dutyTitle}`;
        badge = `معين (${sameDayOtherDuty.dutyTitle})`;
      } else if (leaveOnDay) {
        const typeLabel = leaveOnDay.type ? (LEAVE_TYPE_LABELS[leaveOnDay.type as LeaveType] || leaveOnDay.type) : "إجازة";
        description = `في إجازة مصدقة (${typeLabel}) حتى ${leaveOnDay.endDate.slice(0, 10)}`;
        badge = `إجازة (${typeLabel})`;
      } else if (missionOnDay) {
        description = `في مأمورية: ${missionOnDay.title}`;
        badge = `مأمورية`;
      }

      return {
        value: o.id,
        label: o.officerLabel || `${o.rank} / ${o.fullName || o.name}`,
        description,
        disabled: Boolean(sameDayOtherDuty),
        badge,
      };
    });
  }, [officers, officerOptions, modalTargetDay, modalDutyKey, modalDutyTitle, entries, weekLeaves, weekMissions]);

  // Strict check if current selection in modal has a non-overrideable same-day duty conflict
  const isStrictDutyBlocked = useMemo(() => {
    if (!modalAssignedOfficerId || !modalTargetDay) return false;
    return entries.some(
      (e) =>
        e.date === modalTargetDay.dateString &&
        e.assignedOfficerId === modalAssignedOfficerId &&
        !(e.dutyType === modalDutyKey || e.dutyTitle === modalDutyTitle)
    );
  }, [modalAssignedOfficerId, modalTargetDay, entries, modalDutyKey, modalDutyTitle]);

  // Check if current selection in modal has an approved leave conflict (overrideable via checkbox)
  const activeLeaveConflict = useMemo(() => {
    if (!modalAssignedOfficerId || !modalTargetDay) return null;
    const targetDateStr = modalTargetDay.dateString;
    const l = weekLeaves.find((leave) => {
      if (leave.officerId !== modalAssignedOfficerId) return false;
      if (leave.status !== "approved" && leave.status !== "extension_pending") return false;
      const s = leave.startDate.slice(0, 10);
      const e = leave.endDate.slice(0, 10);
      return targetDateStr >= s && targetDateStr <= e;
    });
    if (!l) return null;
    const typeLabel = l.type ? (LEAVE_TYPE_LABELS[l.type as LeaveType] || l.type) : "إجازة";
    return {
      leave: l,
      typeLabel,
      message: `الضابط حاصل على تصديق إجازة (${typeLabel}) سارية من ${l.startDate.slice(0, 10)} حتى ${l.endDate.slice(0, 10)}.`,
    };
  }, [modalAssignedOfficerId, modalTargetDay, weekLeaves]);

  // Check if current selection in modal has an active mission conflict
  const activeMissionConflict = useMemo(() => {
    if (!modalAssignedOfficerId || !modalTargetDay) return null;
    const targetDateStr = modalTargetDay.dateString;
    const m = weekMissions.find((mission) => {
      if (mission.officerId !== modalAssignedOfficerId) return false;
      if (mission.status !== "scheduled" && mission.status !== "active") return false;
      const s = mission.startDate.slice(0, 10);
      const e = mission.endDate ? mission.endDate.slice(0, 10) : "9999-12-31";
      return targetDateStr >= s && targetDateStr <= e;
    });
    if (!m) return null;
    return {
      mission: m,
      message: `الضابط مكلف بمأمورية سارية (${m.title}) من ${m.startDate.slice(0, 10)}${m.endDate ? ` حتى ${m.endDate.slice(0, 10)}` : ""}.`,
    };
  }, [modalAssignedOfficerId, modalTargetDay, weekMissions]);

  // Check if selected Yadak officer has a leave conflict
  const yadakLeaveConflict = useMemo(() => {
    if (!modalYadakOfficerId || !modalTargetDay) return null;
    const targetDateStr = modalTargetDay.dateString;
    const l = weekLeaves.find((leave) => {
      if (leave.officerId !== modalYadakOfficerId) return false;
      if (leave.status !== "approved" && leave.status !== "extension_pending") return false;
      const s = leave.startDate.slice(0, 10);
      const e = leave.endDate.slice(0, 10);
      return targetDateStr >= s && targetDateStr <= e;
    });
    if (!l) return null;
    const typeLabel = l.type ? (LEAVE_TYPE_LABELS[l.type as LeaveType] || l.type) : "إجازة";
    return `الضابط اليدك في إجازة مصدقة (${typeLabel}) خلال هذا اليوم`;
  }, [modalYadakOfficerId, modalTargetDay, weekLeaves]);

  // Total blocked state: Strict duty block is ALWAYS blocked; leave conflict requires forceAssignOnLeave
  const isAssignBlocked = useMemo(() => {
    if (!modalAssignedOfficerId || !modalTargetDay) return false;
    if (isStrictDutyBlocked) return true;
    if (activeLeaveConflict && !forceAssignOnLeave) return true;
    return false;
  }, [modalAssignedOfficerId, modalTargetDay, isStrictDutyBlocked, activeLeaveConflict, forceAssignOnLeave]);

  // Combined Duty Roles (Default 3 + Custom)
  const allDutyRoles: DutyRoleColumn[] = useMemo(() => {
    const list: DutyRoleColumn[] = DEFAULT_DUTY_ROLES.map((r) => ({
      key: r.key,
      title: r.title,
      isCustom: false,
    }));

    for (const cd of customDuties) {
      if (!list.some((r) => r.title === cd)) {
        list.push({
          key: `custom_${cd}`,
          title: cd,
          isCustom: true,
        });
      }
    }

    return list;
  }, [customDuties]);

  // Fetch roster for current week (used on manual refresh or after save)
  const fetchRoster = useCallback(
    async (startDateStr: string) => {
      try {
        const res = await fetch(`/api/arkan-harb/roster?startDate=${startDateStr}`);
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          showToast(errJson?.error || "فشل تحديث جدول النوبتجيات", "error");
          return;
        }
        const json = await res.json();
        if (json.success && json.data) {
          setLoadError(null);
          const currentStatus = json.data.status || "draft";
          setStatus(currentStatus);
          setApprovedByCommander(Boolean(json.data.approvedByCommander));
          setCommanderNotes(json.data.commanderNotes || "");
          setEntries(json.data.entries || []);
          setCustomDuties(json.data.customDuties || []);
          setEquityStats(json.data.equityStats || []);
          setWeekLeaves(json.data.leaves || []);
          setWeekMissions(json.data.missions || []);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("roster-status-changed", {
                detail: { status: currentStatus },
              })
            );
          }
        }
      } catch {
        showToast("فشل الاتصال بالخادم لتحديث الجدول", "error");
      }
    },
    [showToast]
  );

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/arkan-harb/roster?startDate=${weekInfo.startDateString}`
        );
        if (!active) return;
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          const errMsg = errJson?.error || `فشل تحميل جدول النوبتجيات (رمز الخطأ: ${res.status})`;
          setLoadError(errMsg);
          showToast(errMsg, "error");
          return;
        }
        const json = await res.json();
        if (!active) return;
        if (json.success && json.data) {
          setLoadError(null);
          const currentStatus = json.data.status || "draft";
          setStatus(currentStatus);
          setApprovedByCommander(Boolean(json.data.approvedByCommander));
          setCommanderNotes(json.data.commanderNotes || "");
          setEntries(json.data.entries || []);
          setCustomDuties(json.data.customDuties || []);
          setEquityStats(json.data.equityStats || []);
          setWeekLeaves(json.data.leaves || []);
          setWeekMissions(json.data.missions || []);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("roster-status-changed", {
                detail: { status: currentStatus },
              })
            );
          }
        } else {
          const errMsg = json.error || "فشل تحميل جدول النوبتجيات";
          setLoadError(errMsg);
          showToast(errMsg, "error");
        }
      } catch {
        if (active) {
          const errMsg = "حدث خطأ في الاتصال بالخادم أثناء تحميل جدول النوبتجيات";
          setLoadError(errMsg);
          showToast(errMsg, "error");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [weekInfo.startDateString, activeTabParam, showToast]);

  // Navigate to a specific date and update the URL query parameter
  const navigateToDate = useCallback(
    (target: Date) => {
      const targetWeek = getWeekRange(target);
      if (targetWeek.startDateString !== weekInfo.startDateString) {
        setLoading(true);
        setLoadError(null);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "roster");
      params.set("date", targetWeek.startDateString);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, weekInfo.startDateString]
  );

  // Week Navigation Handlers (Saturday to Friday)
  const handlePrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    navigateToDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    navigateToDate(d);
  };

  const handleCurrentWeek = useCallback(() => {
    navigateToDate(new Date());
  }, [navigateToDate]);

  // Open modal to assign or edit an officer in a cell (Draft mode)
  const handleOpenAssignModal = (
    day: WeekDayInfo,
    dutyKey: string,
    dutyTitle: string,
    existingEntry?: FormattedRosterEntry
  ) => {
    if (status === "approved" && day.dateString < todayStr) {
      showToast("لا يمكن تعديل أو تعيين نوبتجيات لأيام سابقة حفاظاً على السجلات", "error");
      return;
    }

    setModalTargetDay(day);
    setModalDutyKey(dutyKey);
    setModalDutyTitle(dutyTitle);
    setModalConflictWarning(null);

    if (existingEntry) {
      setModalIsEditing(true);
      setModalAssignedOfficerId(existingEntry.assignedOfficerId);
      setModalYadakOfficerId(
        existingEntry.yadakOfficerId || existingEntry.substituteOfficerId || ""
      );
      setModalNotes(existingEntry.notes || "");
      setForceAssignOnLeave(Boolean(existingEntry.isForcedAssignment));
    } else {
      setModalIsEditing(false);
      setModalAssignedOfficerId("");
      setModalYadakOfficerId("");
      setModalNotes("");
      setForceAssignOnLeave(false);
    }

    setIsAssignModalOpen(true);
  };

  // Open modal for Duty Swap (Approved mode - تقديم مبادلة)
  const handleOpenSwapModal = (
    day: WeekDayInfo,
    dutyType: string,
    dutyTitle: string,
    entry: FormattedRosterEntry,
    targetRole: "primary" | "yadak" = "primary"
  ) => {
    if (day.dateString < todayStr) {
      showToast("لا يمكن مبادلة نوبتجيات لأيام سابقة حفاظاً على السجلات", "error");
      return;
    }
    setSwapTargetData({ day, dutyType, dutyTitle, entry, targetRole });
    setIsSwapModalOpen(true);
  };

  // Open modal for Duty Swap History (عرض السجل التاريخي)
  const handleOpenSwapHistoryModal = (
    day: WeekDayInfo,
    dutyType: string,
    dutyTitle: string,
    entry: FormattedRosterEntry,
    targetRole: "primary" | "yadak" = "primary"
  ) => {
    setSwapHistoryTargetData({ day, dutyType, dutyTitle, entry, targetRole });
    setIsSwapHistoryModalOpen(true);
  };

  // Delete Assignment from within the modal
  const handleDeleteModalAssignment = () => {
    if (!modalTargetDay) return;
    handleDeleteEntry(modalTargetDay.dateString, modalDutyKey, modalDutyTitle);
    setIsAssignModalOpen(false);
    showToast(`تم إلغاء التعيين في خدمة (${modalDutyTitle}) بنجاح`, "info");
  };

  // Conflict Checking when selecting officer in modal
  const handleOfficerSelect = (offId: string) => {
    setModalAssignedOfficerId(offId);
    setForceAssignOnLeave(false);
    if (modalYadakOfficerId === offId) {
      setModalYadakOfficerId("");
    }
    setModalConflictWarning(null);

    if (!offId || !modalTargetDay) return;

    // Strict same-day duplicate check
    const sameDayDuty = entries.find(
      (e) =>
        e.date === modalTargetDay.dateString &&
        e.assignedOfficerId === offId &&
        !(e.dutyType === modalDutyKey || e.dutyTitle === modalDutyTitle)
    );

    if (sameDayDuty) {
      setModalConflictWarning(
        `تنبيه مانع: لا يمكن تسكين هذا الضابط لأنه معين بالفعل في خدمة (${sameDayDuty.dutyTitle}) في نفس هذا اليوم`
      );
      return;
    }

    // Comprehensive conflict check (duplicate duty, approved leaves, active missions)
    const conflict = checkDutyConflict({
      officerId: offId,
      date: modalTargetDay.dateString,
      dutyType: modalDutyKey,
      existingEntries: entries
        .filter(
          (e) =>
            !(
              e.date === modalTargetDay.dateString &&
              (e.dutyType === modalDutyKey || e.dutyTitle === modalDutyTitle)
            )
        )
        .map((e) => ({
          date: e.date,
          assignedOfficerId: e.assignedOfficerId,
          dutyType: e.dutyType,
        })),
      leaves: weekLeaves,
      missions: weekMissions,
    });

    if (conflict.hasConflict && conflict.reason) {
      setModalConflictWarning(`تنبيه: ${conflict.reason}`);
    }
  };

  // Save Modal Assignment
  const handleSaveModalAssignment = () => {
    if (!modalTargetDay) return;
    if (status === "approved" && modalTargetDay.dateString < todayStr) {
      showToast("لا يمكن تعديل أو تعيين نوبتجيات لأيام سابقة حفاظاً على السجلات", "error");
      return;
    }
    if (!modalAssignedOfficerId) {
      showToast("يرجى اختيار الضابط المكلف بالخدمة", "error");
      return;
    }

    // Strict same-day duplicate prevention check for primary officer
    const sameDayConflict = entries.find(
      (e) =>
        e.date === modalTargetDay.dateString &&
        e.assignedOfficerId === modalAssignedOfficerId &&
        !(e.dutyType === modalDutyKey || e.dutyTitle === modalDutyTitle)
    );

    if (sameDayConflict) {
      showToast(
        `لا يمكن تسكين الضابط لأكثر من خدمة في نفس اليوم (معين بالفعل في: ${sameDayConflict.dutyTitle})`,
        "error"
      );
      return;
    }

    if (modalYadakOfficerId && modalYadakOfficerId === modalAssignedOfficerId) {
      showToast("لا يمكن أن يكون الضابط اليدك هو نفسه الضابط المكلف بالخدمة", "error");
      return;
    }

    // Strict check for yadak officer conflict
    if (modalYadakOfficerId) {
      const yadakSameDayConflict = entries.find(
        (e) =>
          e.date === modalTargetDay.dateString &&
          (e.assignedOfficerId === modalYadakOfficerId || e.yadakOfficerId === modalYadakOfficerId) &&
          !(e.dutyType === modalDutyKey || e.dutyTitle === modalDutyTitle)
      );
      if (yadakSameDayConflict) {
        showToast(
          `لا يمكن اختيار هذا الضابط كيدك لأنه مسكن بالفعل اليوم في: ${yadakSameDayConflict.dutyTitle}`,
          "error"
        );
        return;
      }
    }

    // Leave conflict validation: Cannot assign officer on leave without forceAssignOnLeave confirmation
    if (activeLeaveConflict && !forceAssignOnLeave) {
      showToast(
        "لا يمكن تسكين الضابط لوجود إجازة مصدقة. لتجاوز ذلك، يرجى تفعيل خيار (التسكين القسري) بعد التأكد من تواجده بالوحدة",
        "error"
      );
      return;
    }

    const assignedOff = officers.find((o) => o.id === modalAssignedOfficerId);
    const yadakOff = officers.find((o) => o.id === modalYadakOfficerId);
    const prevCellEntry = entries.find(
      (e) =>
        e.date === modalTargetDay.dateString &&
        (e.dutyType === modalDutyKey || e.dutyTitle === modalDutyTitle)
    );

    const isForced = Boolean(activeLeaveConflict && forceAssignOnLeave);
    const finalNotes = isForced && !modalNotes.includes("[تسكين قسري]")
      ? `${modalNotes ? `${modalNotes} ` : ""}[تسكين قسري أثناء إجازة مصدقة]`.trim()
      : modalNotes.trim();

    const newEntry: FormattedRosterEntry = {
      date: modalTargetDay.dateString,
      dutyType: modalDutyKey,
      dutyTitle: modalDutyTitle,
      assignedOfficerId: modalAssignedOfficerId,
      assignedOfficerName: assignedOff?.fullName || assignedOff?.name || "ضابط",
      assignedOfficerRank: assignedOff?.rank,
      assignedOfficerLabel: assignedOff?.officerLabel,
      yadakOfficerId: modalYadakOfficerId || undefined,
      yadakOfficerName: yadakOff?.fullName || yadakOff?.name,
      yadakOfficerRank: yadakOff?.rank,
      yadakOfficerLabel: yadakOff?.officerLabel,
      substituteOfficerId: modalYadakOfficerId || undefined,
      substituteOfficerName: yadakOff?.fullName || yadakOff?.name,
      isSwapped: prevCellEntry?.isSwapped,
      originalOfficerId: prevCellEntry?.originalOfficerId,
      originalOfficerName: prevCellEntry?.originalOfficerName,
      originalOfficerRank: prevCellEntry?.originalOfficerRank,
      originalOfficerLabel: prevCellEntry?.originalOfficerLabel,
      swapReason: prevCellEntry?.swapReason,
      swappedAt: prevCellEntry?.swappedAt,
      swapHistory: prevCellEntry?.swapHistory,
      isForcedAssignment: isForced,
      notes: finalNotes,
      isHoliday: modalTargetDay.isWeekend,
    };

    setEntries((prev) => {
      // Remove any existing entry for this day and duty
      const filtered = prev.filter(
        (e) =>
          !(
            e.date === modalTargetDay.dateString &&
            (e.dutyType === modalDutyKey || e.dutyTitle === modalDutyTitle)
          )
      );
      return [...filtered, newEntry];
    });

    setIsAssignModalOpen(false);
    if (isForced) {
      showToast("تم تسكين الضابط في الخدمة (تسكين قسري بتأكيد التواجد بالوحدة)", "info");
    }
  };

  // Delete Assignment in a cell
  const handleDeleteEntry = (dateStr: string, dutyKey: string, dutyTitle: string) => {
    if (status === "approved" && dateStr < todayStr) {
      showToast("لا يمكن تعديل أو إلغاء نوبتجيات الأيام السابقة حفاظاً على السجلات", "error");
      return;
    }
    setEntries((prev) =>
      prev.filter(
        (e) =>
          !(e.date === dateStr && (e.dutyType === dutyKey || e.dutyTitle === dutyTitle))
      )
    );
  };

  // Add Custom Duty Role
  const handleAddCustomDuty = () => {
    const title = newDutyTitle.trim().replace(/[\u0000-\u001F\u007F-\u009F<>]/g, "");
    if (!title) {
      showToast("يرجى إدخال مسمى الخدمة الجديدة", "error");
      return;
    }

    if (title.length > 40) {
      showToast("مسمى الخدمة طويل جداً، يرجى اختصاره في 40 حرفاً كحد أقصى", "error");
      return;
    }

    if (allDutyRoles.some((r) => r.title.toLowerCase() === title.toLowerCase())) {
      showToast("هذه الخدمة موجودة بالفعل في الجدول", "error");
      return;
    }

    setCustomDuties((prev) => [...prev, title]);
    setNewDutyTitle("");
    setIsAddDutyModalOpen(false);
    showToast(`تمت إضافة خدمة (${title}) كعامود جديد في الجدول`, "info");
  };

  // End / Terminate Custom Duty Role
  const handleConfirmEndCustomDuty = () => {
    if (!endingCustomDutyTitle) return;
    const title = endingCustomDutyTitle;
    setCustomDuties((prev) => prev.filter((d) => d !== title));
    setEndingCustomDutyTitle(null);
    showToast(`تم إنهاء خدمة (${title}) بنجاح ولن تظهر في الجداول المستقبلية`, "info");
  };

  // Save Roster to Server (supports draft vs approved)
  const handleSaveRoster = useCallback(
    async (newStatus?: DutyRosterStatus) => {
      if (isSaving || loading) return;
      setIsSaving(true);
      const targetStatus = newStatus || status || "draft";
      const savingAction: "draft" | "approve" | "reopen" =
        targetStatus === "approved"
          ? "approve"
          : newStatus === "draft" && status === "approved"
          ? "reopen"
          : "draft";

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("roster-saving-state", {
            detail: { isSaving: true, action: savingAction },
          })
        );
      }

      // Strict Validation: Cannot approve if there are incomplete duties
      if (targetStatus === "approved") {
        const standardDays = weekInfo.days.slice(0, 7);
        let hasIncompleteDuties = false;

        for (const day of standardDays) {
          for (const role of allDutyRoles) {
            const isAssigned = entries.some(
              (e) =>
                e.date === day.dateString &&
                (e.dutyType === role.key || e.dutyTitle === role.title) &&
                Boolean(e.assignedOfficerId)
            );
            if (!isAssigned) {
              hasIncompleteDuties = true;
              break;
            }
          }
          if (hasIncompleteDuties) break;
        }

        if (hasIncompleteDuties) {
          showToast(
            "يرجى استكمال تسكين كافة خدمات الأسبوع أولاً لتتمكن من اعتماد الجدول، أو حفظه كمسودة مؤقتة.",
            "error"
          );
          setIsSaving(false);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("roster-saving-state", {
                detail: { isSaving: false, action: null },
              })
            );
          }
          return;
        }
      }

      try {
        const payload = {
          startDate: weekInfo.startDateString,
          endDate: weekInfo.endDateString,
          status: targetStatus,
          commanderNotes,
          customDuties,
          entries: entries.map((e) => ({
            date: e.date,
            dutyType: e.dutyType,
            dutyTitle: e.dutyTitle,
            assignedOfficerId: e.assignedOfficerId,
            yadakOfficerId: e.yadakOfficerId || e.substituteOfficerId || undefined,
            substituteOfficerId: e.yadakOfficerId || e.substituteOfficerId || undefined,
            isSwapped: e.isSwapped,
            originalOfficerId: e.originalOfficerId,
            swapReason: e.swapReason,
            swappedAt: e.swappedAt,
            swapHistory: e.swapHistory,
            notes: e.notes || undefined,
            isHoliday: e.isHoliday,
          })),
        };

        const res = await fetch("/api/arkan-harb/roster", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          showToast(errJson?.error || `فشل حفظ جدول النوبتجيات (رمز الخطأ: ${res.status})`, "error");
          return;
        }

        const json = await res.json();
        if (json.success) {
          if (targetStatus === "approved") {
            showToast("تم اعتماد جدول النوبتجيات رسمياً وقفل التعديل المباشر بنجاح", "success");
          } else {
            showToast("تم حفظ جدول النوبتجيات كمسودة بنجاح", "success");
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("roster-status-changed", {
                detail: { status: targetStatus },
              })
            );
          }
          fetchRoster(weekInfo.startDateString);
          router.refresh();
        } else {
          showToast(json.error || "فشل حفظ جدول النوبتجيات", "error");
        }
      } catch {
        showToast("حدث خطأ أثناء حفظ الجدول", "error");
      } finally {
        setIsSaving(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("roster-saving-state", {
              detail: { isSaving: false, action: null },
            })
          );
        }
      }
    },
    [
      isSaving,
      loading,
      status,
      weekInfo.days,
      weekInfo.startDateString,
      weekInfo.endDateString,
      allDutyRoles,
      commanderNotes,
      customDuties,
      entries,
      showToast,
      fetchRoster,
      router,
    ]
  );

  // Revert Approved Roster to Draft (Commander or Admin only)
  const handleRevertToDraft = useCallback(async () => {
    if (!isAdmin && !isCommander) {
      showToast("فقط السيد القائد أو مسؤول النظام يملك صلاحية فتح الجدول كمسودة", "error");
      return;
    }
    await handleSaveRoster("draft");
  }, [isAdmin, isCommander, handleSaveRoster, showToast]);

  // Print Weekly Roster
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Listen for actions dispatched from the main PageHeader
  useEffect(() => {
    const onSaveDraft = () => handleSaveRoster("draft");
    const onApprove = () => handleSaveRoster("approved");
    const onReopen = () => handleRevertToDraft();
    const onSave = () => handleSaveRoster(status === "approved" ? "approved" : "draft");
    const onPrint = () => handlePrint();
    const onOpenHistory = () => {
      setHistoryTargetDate(weekInfo.startDateString);
      setIsHistoryModalOpen(true);
    };
    const onReturnCurrent = () => handleCurrentWeek();

    window.addEventListener("roster-save-draft", onSaveDraft);
    window.addEventListener("roster-approve", onApprove);
    window.addEventListener("roster-reopen", onReopen);
    window.addEventListener("roster-save", onSave);
    window.addEventListener("roster-print", onPrint);
    window.addEventListener("roster-open-history", onOpenHistory);
    window.addEventListener("roster-return-current", onReturnCurrent);

    return () => {
      window.removeEventListener("roster-save-draft", onSaveDraft);
      window.removeEventListener("roster-approve", onApprove);
      window.removeEventListener("roster-reopen", onReopen);
      window.removeEventListener("roster-save", onSave);
      window.removeEventListener("roster-print", onPrint);
      window.removeEventListener("roster-open-history", onOpenHistory);
      window.removeEventListener("roster-return-current", onReturnCurrent);
    };
  }, [handleSaveRoster, handleRevertToDraft, handlePrint, handleCurrentWeek, status]);

  // Build Columns for MainTable (8 Days: Saturday to next Saturday preview)
  const columns: TableColumn<WeekDayInfo>[] = [
    {
      header: "اليوم والتاريخ",
      accessor: "dateString",
      cellAlign: "center",
      minWidth: true,
      render: (_v, day) => {
        const d = day.date;
        const dDay = String(d.getDate()).padStart(2, "0");
        const dMonth = String(d.getMonth() + 1).padStart(2, "0");
        const dYear = d.getFullYear();
        const isToday = day.dateString === todayStr;

        return (
          <div className="space-y-0.5 min-w-[110px]">
            <div className="inline-flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-(--color-primary-hover)">
                {day.dayName}
              </span>
              {isToday && (
                <span className="px-1.5 py-0.5 rounded-md bg-(--color-primary) text-white text-[10px] font-black">
                  اليوم
                </span>
              )}
            </div>
            <p className="font-mono text-[11px] font-extrabold text-(--color-primary-hover)">
              {dDay}/{dMonth}/{dYear}
            </p>
          </div>
        );
      },
    },
    // Duty Columns (Default 3 + Custom Duties)
    ...allDutyRoles.map((role) => ({
      header: role.isCustom && canEdit ? (
        <div className="inline-flex items-center gap-1.5">
          <span>{role.title}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEndingCustomDutyTitle(role.title);
            }}
            className="text-white/70 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
            title={`إنهاء خدمة ${role.title}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        role.title
      ),
      cellAlign: "center" as const,
      headerClassName: "min-w-[200px]",
      tdClassName: "min-w-[200px]",
      render: (_v: unknown, day: WeekDayInfo) => {
        const isPastDay = day.dateString < todayStr;
        const isApproved = status === "approved";
        const entry = entries.find(
          (e) =>
            e.date === day.dateString &&
            (e.dutyType === role.key || e.dutyTitle === role.title)
        );

        if (entry) {
          const primaryName = entry.assignedOfficerLabel || entry.assignedOfficerName;
          const origName = entry.originalOfficerLabel || entry.originalOfficerName;
          const yadakName = entry.yadakOfficerLabel || entry.yadakOfficerName;
          const primarySwapCount = (entry.swapHistory || []).filter(
            (sh) => sh.targetRole === "primary" || !sh.targetRole
          ).length;
          const isPrimarySwapped = Boolean(entry.isSwapped || primarySwapCount > 0);

          const yadakSwapCount = (entry.swapHistory || []).filter(
            (sh) => sh.targetRole === "yadak"
          ).length;
          const isYadakSwapped = Boolean(yadakSwapCount > 0);

          const isActionable = canEdit && (!isPastDay || !isApproved);

          return (
            <div className="w-full py-2 px-2 bg-transparent space-y-2 text-center">
              {/* Primary Officer Name & Swap Indicator Badge */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {isActionable ? (
                  <button
                    type="button"
                    onClick={() =>
                      isApproved
                        ? handleOpenSwapModal(day, role.key, role.title, entry, "primary")
                        : handleOpenAssignModal(day, role.key, role.title, entry)
                    }
                    className="text-xs font-bold text-(--app-muted-foreground) hover:text-(--color-primary-hover) hover:underline transition-colors cursor-pointer focus:outline-none leading-relaxed"
                    title={isApproved ? "انقر لإجراء مبادلة لهذه النوبتجية" : "انقر لتعديل التعيين"}
                  >
                    {primaryName}
                  </button>
                ) : (
                  <span className="text-xs font-bold text-(--app-muted-foreground) leading-relaxed">
                    {primaryName}
                  </span>
                )}

                {/* Primary Swap Indicator Badge - Opens History Modal (regardless of roster approval status) */}
                {isPrimarySwapped && (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenSwapHistoryModal(day, role.key, role.title, entry, "primary");
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 hover:bg-(--color-primary) hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                    title="انقر لعرض السجل التاريخي لمبادلات هذه النوبتجية"
                  >
                    <ArrowLeftRight className="w-2.5 h-2.5 shrink-0" />
                    <span>
                      مبادلة
                      {primarySwapCount > 1 ? ` (${primarySwapCount})` : ""}
                    </span>
                  </button>
                )}

                {/* Forced Assignment Badge */}
                {entry.isForcedAssignment && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20"
                    title="تم التسكين قسرياً مع وجود إجازة مصدقة بتأكيد التواجد بالوحدة"
                  >
                    تسكين قسري
                  </span>
                )}
              </div>

              {/* Yadak Officer (if assigned) - Clearly separated with distinct role badge and spacing */}
              {yadakName && (
                <div className="pt-1.5 border-t border-(--app-border)/60 flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)">
                    يدك
                  </span>
                  {isActionable && isApproved ? (
                    <button
                      type="button"
                      onClick={() => handleOpenSwapModal(day, role.key, role.title, entry, "yadak")}
                      className="text-[11px] font-bold text-(--app-muted-foreground) hover:text-(--color-primary-hover) hover:underline transition-colors cursor-pointer focus:outline-none leading-relaxed"
                      title="انقر لتقديم مبادلة للضابط اليدك"
                    >
                      {yadakName}
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-(--app-muted-foreground) leading-relaxed truncate">
                      {yadakName}
                    </span>
                  )}

                  {/* Yadak Swap Indicator Badge - Opens History Modal (regardless of roster approval status) */}
                  {isYadakSwapped && (
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenSwapHistoryModal(day, role.key, role.title, entry, "yadak");
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 hover:bg-(--color-primary) hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                      title="انقر لعرض السجل التاريخي لمبادلات الضابط اليدك"
                    >
                      <ArrowLeftRight className="w-2 h-2 shrink-0" />
                      <span>
                        مبادلة
                        {yadakSwapCount > 1 ? ` (${yadakSwapCount})` : ""}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        }

        // Empty Cell: Show "+" button (if canEdit and not a past day, or draft mode)
        if (canEdit && (!isPastDay || !isApproved)) {
          return (
            <button
              type="button"
              onClick={() => handleOpenAssignModal(day, role.key, role.title)}
              className="p-1.5 rounded-lg text-(--color-primary) hover:text-(--color-primary-hover) transition-colors cursor-pointer inline-flex items-center justify-center focus:outline-none"
              title={`تعيين ضابط في ${role.title}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          );
        }

        return "ـ";
      },
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Sub Page Header Controller Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-sm print:hidden">
        {/* Week Navigator & Status Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="p-2 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-(--color-primary) hover:text-(--app-info) transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl">
            <Calendar className="w-4 h-4 text-(--color-primary)" />
            <RosterWeekDisplay
              info={weekRangeInfo}
              showPresetLabel={true}
              className="text-xs sm:text-sm font-black text-(--color-primary)"
            />
          </div>

          <button
            type="button"
            onClick={handleNextWeek}
            className="p-2 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-(--color-primary) hover:text-(--app-info) transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Return to Current Week Button */}
          {isViewingDifferentWeek && (
            <button
              type="button"
              onClick={handleCurrentWeek}
              className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للأسبوع الحالي</span>
            </button>
          )}

          {/* Roster Status Badge */}
          {loading ? (
            <LoadingState message="جاري التحقق..." variant="minimal" />
          ) : status === "approved" ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-(--color-primary)/10 border border-(--color-primary)/20 text-(--color-primary) text-xs font-black">
              <ShieldCheck className="w-4 h-4" />
              <span>تم الاعتماد</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground) text-xs font-black">
              <Clock className="w-4 h-4" />
              <span>قيد الإعداد</span>
            </div>
          )}
        </div>

        {/* Action Controls & Equity Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Equity Toggle */}
          <button
            type="button"
            onClick={() => setShowEquity(!showEquity)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${showEquity
              ? "bg-(--color-primary) text-white border-(--color-primary)"
              : "bg-(--app-surface-container) border-(--app-border) text-(--color-primary) hover:text-(--app-info)"
              }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Add New Duty Role Button (Placed on the far left in RTL) */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsAddDutyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-xs font-bold text-(--color-primary) hover:text-(--app-info) transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة خدمة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout (Table + Optional Equity Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Table Area (spans 3 or 4 cols, full width in print) */}
        <div className={showEquity ? "lg:col-span-3 space-y-4 print:w-full print:col-span-4" : "lg:col-span-4 space-y-4 print:w-full print:col-span-4"}>
          {loading ? (
            <LoadingState message="جاري تحميل جدول نوبتجيات الأسبوع..." />
          ) : loadError ? (
            <div className="p-8 text-center bg-(--app-surface) border border-(--app-border) rounded-2xl space-y-4 shadow-sm">
              <div className="w-12 h-12 mx-auto rounded-full bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-(--color-primary)">
                  تعذر تحميل جدول النوبتجيات
                </h3>
                <p className="text-xs text-(--app-muted-foreground) max-w-md mx-auto">
                  {loadError}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setLoadError(null);
                  fetchRoster(weekInfo.startDateString);
                }}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          ) : (
            <MainTable
              columns={columns}
              data={tableData}
              showSerialNumber={true}
              wrapperClassName="print:border-none print:shadow-none"
            />
          )}
        </div>

        {/* Distribution Equity Sidebar */}
        {showEquity && (
          <div className="lg:col-span-1 space-y-3 bg-(--app-surface) border border-(--app-border) rounded-2xl p-4 shadow-sm print:hidden">
            <div className="flex items-center justify-between border-b border-(--app-border) pb-2">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-(--color-primary)" />
                <h4 className="text-xs font-black text-(--color-primary)">
                  مؤشر عدالة التوزيع
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowEquity(false)}
                className="text-(--app-muted-foreground) hover:text-(--color-primary)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-(--app-muted-foreground) leading-relaxed">
              مرتب تصاعدياً حسب إجمالي الخدمات لتسهيل تحقيق العدالة في توزيع النوبتجيات بين الضباط.
            </p>

            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1 no-scrollbar">
              {equityStats.length === 0 ? (
                <div className="text-center py-6 text-xs text-(--app-muted-foreground)">
                  لا توجد بيانات توزيع متاحة
                </div>
              ) : (
                equityStats.map((stat) => (
                  <div
                    key={stat.officerId}
                    className="flex items-center justify-between p-2 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-xs"
                  >
                    <div className="flex flex-col text-right">
                      <span className="font-bold text-(--app-foreground)">
                        {stat.rankLabel ? `${stat.rankLabel} / ` : ""}
                        {stat.officerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-(--color-primary)/10 text-(--color-primary)">
                        {stat.totalDuties} خدمة
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Assign / Edit Officer in a Duty Cell */}
      {isAssignModalOpen && modalTargetDay && (
        <ModalShell
          title={modalIsEditing ? "تعديل تعيين ضابط في الخدمة" : "تعيين ضابط في الخدمة"}
          icon={<Shield className="w-4 h-4" />}
          onClose={() => setIsAssignModalOpen(false)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 no-scrollbar"
          footer={
            <ModalActions
              destructiveText={modalIsEditing ? "حذف التعيين" : undefined}
              onDestructive={modalIsEditing ? handleDeleteModalAssignment : undefined}
              submitText={modalIsEditing ? "تحديث التعيين" : "حفظ التعيين"}
              submitDisabled={isAssignBlocked}
              onConfirm={handleSaveModalAssignment}
              onCancel={() => setIsAssignModalOpen(false)}
            />
          }
        >
          {/* Header Card */}
          <ModalHeaderCard
            icon={<Shield className="w-6 h-6" />}
            title={modalDutyTitle}
            subtitle={`${modalTargetDay.dayName} - ${String(modalTargetDay.date.getDate()).padStart(2, "0")}/${String(modalTargetDay.date.getMonth() + 1).padStart(2, "0")}/${modalTargetDay.date.getFullYear()}`}
          />

          {/* Strict Duplicate Duty Conflict Alert (NO amber/orange, Sapphire blue style per mandate) */}
          {isStrictDutyBlocked && (
            <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl flex items-start gap-2.5 text-right">
              <AlertCircle className="w-4 h-4 text-(--color-primary) shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-(--color-primary)">
                  تنبيه مانع للتسكين:
                </p>
                <p className="text-[11px] font-bold text-(--app-muted-foreground) mt-0.5">
                  لا يمكن تسكين هذا الضابط لأنه معين بالفعل في خدمة أخرى في نفس هذا اليوم.
                </p>
              </div>
            </div>
          )}

          {/* Approved Leave Conflict Alert with Force Assign Checkbox */}
          {activeLeaveConflict && (
            <div className="p-3.5 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl space-y-2.5 text-right">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-(--color-primary) shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-(--color-primary)">
                    تعارض مع إجازة مصدقة للضابط:
                  </p>
                  <p className="text-[11px] font-bold text-(--app-muted-foreground)">
                    {activeLeaveConflict.message}
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-(--color-primary)/25 bg-(--app-surface) cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={forceAssignOnLeave}
                  onChange={(e) => setForceAssignOnLeave(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-(--app-border) text-(--color-primary) focus:ring-blue-500/20"
                />
                <div className="flex-1 text-right">
                  <span className="text-xs font-black text-(--color-primary) block">
                    تأكيد التسكين القسري في الخدمة (By Force)
                  </span>
                  <span className="text-[11px] font-bold text-(--app-muted-foreground) block mt-0.5 leading-relaxed">
                    أؤكد أن الضابط متواجد فعلياً داخل الوحدة في هذا اليوم ومكلف باستلام الخدمة رغم وجود إجازة مصدقة.
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Active Mission Warning */}
          {activeMissionConflict && (
            <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl flex items-start gap-2.5 text-right">
              <Info className="w-4 h-4 text-(--color-primary) shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-(--color-primary)">
                  تنبيه مأمورية سارية:
                </p>
                <p className="text-[11px] font-bold text-(--app-muted-foreground) mt-0.5">
                  {activeMissionConflict.message}
                </p>
              </div>
            </div>
          )}

          {/* Other Conflict Warning */}
          {!activeLeaveConflict && !isStrictDutyBlocked && !activeMissionConflict && modalConflictWarning && (
            <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl flex items-start gap-2.5 text-right">
              <AlertCircle className="w-4 h-4 text-(--color-primary) shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-(--color-primary)">
                {modalConflictWarning}
              </p>
            </div>
          )}

          <div className="space-y-3.5 text-right">
            {modalAssignedOfficerOptions.length === 0 && (
              <div className="p-3 bg-(--app-surface-container) border border-(--app-border) rounded-xl text-xs text-(--app-muted-foreground) text-right">
                لا يوجد ضباط نشطون مسجلون بقوة الوحدة حالياً للتسكين في الخدمة.
              </div>
            )}

            {/* Officer Select */}
            <CustomSelect
              id="assigned-officer-id"
              label="الضابط المكلف بالخدمة"
              value={modalAssignedOfficerId}
              onChange={handleOfficerSelect}
              options={modalAssignedOfficerOptions}
              placeholder="اختر الضابط المكلف..."
              required
            />

            {/* Yadak Officer Select (ملازمة وتدريب) */}
            <div className="space-y-1">
              <CustomSelect
                id="yadak-officer-id"
                label="الضابط اليدك (ملازمة وتدريب)"
                value={modalYadakOfficerId}
                onChange={setModalYadakOfficerId}
                options={modalAssignedOfficerOptions.filter(
                  (o) => o.value !== modalAssignedOfficerId
                )}
                placeholder="اختر الضابط اليدك (اختياري)..."
              />
              {yadakLeaveConflict ? (
                <p className="text-[11px] font-bold text-(--color-primary) mr-1">
                  تنبيه: {yadakLeaveConflict}
                </p>
              ) : (
                <p className="text-[11px] text-(--app-muted-foreground) mr-1">
                  ضابط مكلف بنفس مهام الضابط الأساسي للملازمة والتدريب والتعلم الميداني.
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="modal-notes"
                className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
              >
                ملاحظات أو توجيهات خاصة بالخدمة
              </label>
              <input
                id="modal-notes"
                type="text"
                maxLength={200}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="أي ملاحظات أو تعليمات خاصة..."
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-muted-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>
          </div>
        </ModalShell>
      )}

      {/* Modal: Add Custom Duty Role */}
      {isAddDutyModalOpen && (
        <ModalShell
          title="إضافة خدمة جديدة للجدول"
          icon={<Plus className="w-4 h-4" />}
          onClose={() => {
            setIsAddDutyModalOpen(false);
            setNewDutyTitle("");
          }}
          overlayClassName="bg-black/40"
          panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 no-scrollbar"
          footer={
            <ModalActions
              submitText="إضافة الخدمة"
              onCancel={() => {
                setIsAddDutyModalOpen(false);
                setNewDutyTitle("");
              }}
              onConfirm={handleAddCustomDuty}
            />
          }
        >
          <div className="space-y-3 text-right">
            <p className="text-xs text-(--app-muted-foreground) leading-relaxed">
              سيتم إنشاء عامود جديد مخصص لهذه الخدمة في جدول نوبتجيات الأسبوع، مع إمكانية
              تعيين الضباط فيها في أي يوم عبر زر (+).
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="new-duty-title"
                className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
              >
                مسمى الخدمة الجديدة
              </label>
              <input
                id="new-duty-title"
                type="text"
                value={newDutyTitle}
                maxLength={40}
                onChange={(e) => setNewDutyTitle(e.target.value)}
                placeholder="مثال: ضابط خفر، نوبتجي مستودعات، قائد الحرس..."
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-muted-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
                autoFocus
              />
            </div>
          </div>
        </ModalShell>
      )}

      {/* Modal: End / Terminate Custom Duty Role */}
      {endingCustomDutyTitle && (
        <ModalShell
          title="إنهاء الخدمة المخصصة"
          icon={<AlertTriangle className="w-4 h-4" />}
          titleVariant="danger"
          onClose={() => setEndingCustomDutyTitle(null)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 text-right"
          footer={
            <ModalActions
              submitText="تأكيد إنهاء الخدمة"
              submitVariant="destructive"
              onCancel={() => setEndingCustomDutyTitle(null)}
              onConfirm={handleConfirmEndCustomDuty}
            />
          }
        >
          <p className="text-xs font-bold text-(--app-foreground) leading-relaxed">
            هل أنت متأكد من إنهاء خدمة{" "}
            <span className="text-(--color-primary) font-black">
              ({endingCustomDutyTitle})
            </span>
            ؟
          </p>
          <p className="text-xs text-(--app-muted-foreground) leading-relaxed">
            سيتم إزالة العامود من هذا الجدول والجداول القادمة، مع الحفاظ على أي سجلات سابقة
            تم تسكينها بالفعل.
          </p>
        </ModalShell>
      )}

      {/* Modal: History / Week Selector */}
      {isHistoryModalOpen && (
        <ModalShell
          title="سجل النوبتجيات الأسبوعية"
          icon={<History className="w-4 h-4" />}
          onClose={() => setIsHistoryModalOpen(false)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 text-right"
          footer={
            <ModalActions
              submitText="عرض جدول الأسبوع"
              onCancel={() => setIsHistoryModalOpen(false)}
              onConfirm={() => {
                if (historyTargetDate && !isNaN(Date.parse(historyTargetDate))) {
                  navigateToDate(new Date(historyTargetDate));
                  setIsHistoryModalOpen(false);
                } else {
                  showToast("يرجى تحديد تاريخ صحيح لعرض جدول الأسبوع", "error");
                }
              }}
            />
          }
        >
          <div className="space-y-3.5">
            <p className="text-xs text-(--app-muted-foreground) leading-relaxed">
              اختر تاريخاً أو أسبوعاً محدداً لعرض وتعديل جدول النوبتجيات المعتمد له.
            </p>

            {/* Quick shortcuts */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
                خيارات سريعة
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCurrentWeek();
                    setIsHistoryModalOpen(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-xs font-bold text-(--color-primary) hover:bg-(--color-primary)/10 transition-colors text-right cursor-pointer"
                >
                  الأسبوع الحالي
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    navigateToDate(d);
                    setIsHistoryModalOpen(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-xs font-bold text-(--color-primary) hover:bg-(--color-primary)/10 transition-colors text-right cursor-pointer"
                >
                  الأسبوع السابق
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 14);
                    navigateToDate(d);
                    setIsHistoryModalOpen(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-xs font-bold text-(--color-primary) hover:bg-(--color-primary)/10 transition-colors text-right cursor-pointer"
                >
                  منذ أسبوعين
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    navigateToDate(d);
                    setIsHistoryModalOpen(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-xs font-bold text-(--color-primary) hover:bg-(--color-primary)/10 transition-colors text-right cursor-pointer"
                >
                  الأسبوع القادم
                </button>
              </div>
            </div>

            {/* Date Input */}
            <DateField
              id="history-date"
              label="أو حدد تاريخاً محدداً"
              value={historyTargetDate}
              onChange={setHistoryTargetDate}
            />
          </div>
        </ModalShell>
      )}

      {/* Modal: Official Duty Swap (Approved Mode - تقديم مبادلة) */}
      {isSwapModalOpen && swapTargetData && (
        <DutySwapModal
          isOpen={isSwapModalOpen}
          onClose={() => {
            setIsSwapModalOpen(false);
            setSwapTargetData(null);
          }}
          onSuccess={() => {
            fetchRoster(weekInfo.startDateString);
            router.refresh();
          }}
          onViewHistory={() => {
            if (swapTargetData) {
              setSwapHistoryTargetData(swapTargetData);
              setIsSwapHistoryModalOpen(true);
            }
          }}
          date={swapTargetData.day.dateString}
          dayName={swapTargetData.day.dayName}
          dutyType={swapTargetData.dutyType}
          dutyTitle={swapTargetData.dutyTitle}
          targetRole={swapTargetData.targetRole || "primary"}
          currentOfficerId={swapTargetData.entry.assignedOfficerId}
          currentOfficerName={swapTargetData.entry.assignedOfficerName || "ضابط"}
          currentOfficerLabel={swapTargetData.entry.assignedOfficerLabel}
          yadakOfficerId={swapTargetData.entry.yadakOfficerId}
          yadakOfficerName={swapTargetData.entry.yadakOfficerName}
          yadakOfficerLabel={swapTargetData.entry.yadakOfficerLabel}
          isAlreadySwapped={swapTargetData.entry.isSwapped}
          originalOfficerLabel={swapTargetData.entry.originalOfficerLabel}
          swapHistory={swapTargetData.entry.swapHistory || []}
          officers={officers}
          existingEntries={entries.map((e) => ({
            date: e.date,
            assignedOfficerId: e.assignedOfficerId,
            yadakOfficerId: e.yadakOfficerId,
            dutyType: e.dutyType,
            dutyTitle: e.dutyTitle,
          }))}
          weekLeaves={weekLeaves}
          weekMissions={weekMissions}
        />
      )}

      {/* Modal: Duty Swap History (Approved Mode - عرض السجل التاريخي) */}
      {isSwapHistoryModalOpen && swapHistoryTargetData && (
        <DutySwapHistoryModal
          isOpen={isSwapHistoryModalOpen}
          onClose={() => {
            setIsSwapHistoryModalOpen(false);
            setSwapHistoryTargetData(null);
          }}
          onOpenSwap={() => {
            if (swapHistoryTargetData) {
              setSwapTargetData(swapHistoryTargetData);
              setIsSwapModalOpen(true);
            }
          }}
          date={swapHistoryTargetData.day.dateString}
          dayName={swapHistoryTargetData.day.dayName}
          dutyType={swapHistoryTargetData.dutyType}
          dutyTitle={swapHistoryTargetData.dutyTitle}
          targetRole={swapHistoryTargetData.targetRole || "primary"}
          currentOfficerId={swapHistoryTargetData.entry.assignedOfficerId}
          currentOfficerName={swapHistoryTargetData.entry.assignedOfficerName || "ضابط"}
          currentOfficerLabel={swapHistoryTargetData.entry.assignedOfficerLabel}
          yadakOfficerId={swapHistoryTargetData.entry.yadakOfficerId}
          yadakOfficerName={swapHistoryTargetData.entry.yadakOfficerName}
          yadakOfficerLabel={swapHistoryTargetData.entry.yadakOfficerLabel}
          originalOfficerLabel={swapHistoryTargetData.entry.originalOfficerLabel}
          swapHistory={swapHistoryTargetData.entry.swapHistory || []}
          canEdit={canEdit && status === "approved" && swapHistoryTargetData.day.dateString >= todayStr}
        />
      )}

    </div>
  );
}
