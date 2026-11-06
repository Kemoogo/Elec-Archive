"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { 
  FileText, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  AlertCircle,
  FileCheck
} from "lucide-react";
import { getMissionStatusLabel } from "@/lib/utils/status-badge";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { formatDateDisplay as formatCentralDate } from "@/lib/utils/date-display";
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
  return formatCentralDate(date) || "—";
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

  const [prevMissionKey, setPrevMissionKey] = useState<string | null>(null);
  const currentMissionKey = isOpen && mission ? mission.id : null;
  if (currentMissionKey !== prevMissionKey) {
    setPrevMissionKey(currentMissionKey);
    setShowConfirmDelete(false);
    setDeleteError("");
  }

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
    <ModalActions
      mode="view"
      destructiveText={isAdmin && !showConfirmDelete ? "حذف المأمورية" : undefined}
      onDestructive={isAdmin && !showConfirmDelete ? () => setShowConfirmDelete(true) : undefined}
      submitText={onEdit && !showConfirmDelete ? "تعديل" : undefined}
      onConfirm={
        onEdit && !showConfirmDelete
          ? () => {
              onClose();
              onEdit(mission);
            }
          : undefined
      }
      onCancel={onClose}
    />
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

        {/* Military Travel Order Details */}
        {(mission.travelOrderNumber || mission.transportationMean || mission.authorizedWeapons) && (
          <div className="p-3 bg-(--app-surface-container) border border-(--app-border) rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-(--color-primary)">
              <span>بيانات أمر التحرك وخط السير</span>
              {mission.travelOrderNumber && (
                <span className="font-mono text-[11px] bg-(--color-primary)/10 text-(--color-primary) px-2 py-0.5 rounded-md border border-(--color-primary)/20">
                  {mission.travelOrderNumber}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-(--app-muted-foreground)">
              <div>وسيلة الانتقال: <span className="text-(--app-foreground)">{mission.transportationMean || "ـ"}</span></div>
              <div>التسليح المصرح: <span className="text-(--app-foreground)">{mission.authorizedWeapons || "ـ"}</span></div>
            </div>
          </div>
        )}

        {/* Linked Fax if present */}
        {(mission.linkedFaxId || mission.linkedFax) && (
          <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-(--app-muted-foreground) block">
                رقم الفاكس / المستند المرتبط:
              </span>
              <span className="text-xs font-mono font-extrabold text-(--color-primary)">
                {mission.linkedFaxId || "فاكس معتمد"}
              </span>
            </div>
            {mission.linkedFax && (
              <a
                href={`/fax/${typeof mission.linkedFax === "object" ? mission.linkedFax._id : mission.linkedFax}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color-primary) text-white text-xs font-black hover:bg-(--color-primary-hover) transition-all cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>عرض الفاكس المرفق</span>
              </a>
            )}
          </div>
        )}

        {/* Clearance Documents (T018) */}
        {mission.clearanceDocuments && mission.clearanceDocuments.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-(--app-muted-foreground) block">مستندات إخلاء الطرف وإنجاز المأمورية:</span>
            <div className="space-y-1.5">
              {mission.clearanceDocuments.map((doc, idx) => (
                <div key={idx} className="p-2.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-(--app-success)" />
                    <span className="text-(--app-foreground)">{doc.fileName || doc.name || `مستند إخلاء الطرف #${idx + 1}`}</span>
                  </div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-(--color-primary) hover:underline text-xs font-black"
                  >
                    معاينة المستند
                  </a>
                </div>
              ))}
            </div>
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
