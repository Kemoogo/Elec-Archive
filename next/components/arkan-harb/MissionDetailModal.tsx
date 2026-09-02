"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { 
  FileText, 
  User, 
  MapPin, 
  Calendar, 
  Trash2, 
  Clock, 
  AlertCircle,
  FileCheck
} from "lucide-react";
import { getMissionStatusLabel } from "@/lib/utils/status-badge";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { type Mission } from "./MissionsTable";

interface MissionDetailModalProps {
  mission: Mission | null;
  isOpen: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onEdit?: (mission: Mission) => void;
}

function formatDateDisplay(date: Date | string | null | undefined): string {
  if (!date) return "—";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.exec(date)) {
    const [year, month, day] = date.split('T')[0].split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("ar-EG");
  }
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar-EG");
}

export function MissionDetailModal({
  mission,
  isOpen,
  isAdmin = false,
  onClose,
  onSuccess,
  onEdit,
}: MissionDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { showToast } = useToast();

  if (!isOpen || !mission) return null;

  const displayOfficer =
    mission.officerLabel ||
    (mission.officerRankLabel
      ? `${mission.officerRankLabel} / ${mission.officerName}`
      : mission.officerName || "ضابط غير معروف");

  const isMultiDay = Boolean(
    mission.endDate &&
      formatDateDisplay(mission.startDate) !== formatDateDisplay(mission.endDate) &&
      new Date(mission.endDate) > new Date(mission.startDate)
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/arkan-harb/missions/${mission.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل حذف المأمورية"));
      }

      showToast("تم حذف المأمورية بنجاح", "success");
      setShowConfirmDelete(false);
      onSuccess();
      onClose();
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between w-full gap-3">
      <div>
        {isAdmin && !showConfirmDelete && (
          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف المأمورية (إدارة)</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onEdit && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(mission);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-(--app-foreground) bg-(--app-surface-container) hover:bg-(--app-border)/60 border border-(--app-border) rounded-xl transition-all cursor-pointer"
          >
            <span>تعديل</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary text-xs"
        >
          <span>إلغاء</span>
        </button>
      </div>
    </div>
  );

  return (
    <ModalShell
      title="تفاصيل المأمورية"
      icon={<FileText className="w-4 h-4" />}
      onClose={onClose}
      footer={footer}
      panelClassName="max-w-[540px]"
    >
      <div className="space-y-4 text-right">
        {/* Header Title & Badges */}
        <div className="p-4 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-extrabold text-(--color-primary)">
              {mission.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm text-xs font-bold text-(--app-muted-foreground)">
                {isMultiDay ? "مأمورية ممتدة" : "مأمورية"}
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm text-xs font-bold text-(--app-muted-foreground)">
                {getMissionStatusLabel(mission.status)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-(--app-muted-foreground)">
            <User className="w-4 h-4 text-(--app-muted-foreground) shrink-0" />
            <span>الضابط: {displayOfficer}</span>
          </div>
        </div>

        {/* Delete Confirmation Box */}
        {showConfirmDelete && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-extrabold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>تأكيد حذف المأمورية من القاعدة نهائياً؟</span>
            </div>
            {deleteError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-bold">{deleteError}</p>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="btn-secondary text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-destructive text-xs"
              >
                {isDeleting ? "جاري الحذف..." : "تأكيد الحذف النهائي"}
              </button>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-(--app-muted-foreground) block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-(--app-muted-foreground)" />
              الجهة / الوجهة:
            </span>
            <span className="text-xs font-bold text-(--color-primary)">
              {mission.destination || "غير محددة"}
            </span>
          </div>

          <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-(--app-muted-foreground) block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-(--app-muted-foreground)" />
              تاريخ المأمورية / الفترة:
            </span>
            <div className="text-xs font-bold text-(--color-primary) flex items-center gap-1 flex-wrap">
              <span>{formatDateDisplay(mission.startDate)}</span>
              {mission.endDate && (
                <>
                  <span className="text-(--app-muted-foreground)">حتى</span>
                  <span>{formatDateDisplay(mission.endDate)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Reason if present */}
        {mission.statusReason && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              سبب {mission.status === "postponed" ? "التأجيل" : mission.status === "cancelled" ? "الإلغاء" : "تحديث الحالة"}:
            </span>
            <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 leading-relaxed">
              {mission.statusReason}
            </p>
          </div>
        )}

        {/* Result Summary / Final Report if present */}
        {mission.resultSummary && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5" />
              ملخص التقرير النهائي والنتائج:
            </span>
            <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {mission.resultSummary}
            </p>
          </div>
        )}

        {/* Linked Fax if present */}
        {mission.linkedFaxId && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">
              رقم الفاكس / المستند المرتبط:
            </span>
            <span className="text-xs font-mono font-extrabold text-blue-600 dark:text-blue-400">
              {mission.linkedFaxId}
            </span>
          </div>
        )}

        {/* Description / Notes */}
        {mission.description && (
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 block">ملاحظات إضافية:</span>
            <p className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {mission.description}
            </p>
          </div>
        )}

        {/* Created At Audit timestamp */}
        <div className="pt-2 text-[11px] text-slate-400 font-medium flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span>تاريخ التوثيق: {formatDateDisplay(mission.createdAt)}</span>
          {mission.officerMilitaryId && (
            <span>الرقم العسكري: #{mission.officerMilitaryId}</span>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
