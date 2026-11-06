"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { LoadingState } from "@/components/ui/loading-state";
import { Calendar, Activity, Stethoscope, Pill, User, ClipboardList } from "lucide-react";
import { extractApiError } from "@/lib/utils";
import { formatDateDisplay } from "@/lib/utils/date-display";

interface DispensedItem {
  medicineId: string;
  medicineName: string;
  concentration?: string;
  unit?: string;
  quantity: number;
}

interface VisitDetail {
  _id: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  diagnosis: string;
  treatment: string;
  restType: string;
  restDays: number;
  fitnessCategory: string;
  dispensedMedicines: DispensedItem[];
  createdAt: string;
}

interface ViewVisitModalProps {
  visitId: string;
  onClose: () => void;
}

const restLabels: Record<string, string> = {
  none: "لا يوجد",
  ward: "راحة عنبر",
  home: "راحة منزلية",
  exemption: "إعفاء مجهود",
};

const fitnessLabels: Record<string, string> = {
  fit: "لائق طبياً",
  class_a: "لياقة فئة أ",
  class_b: "لياقة فئة ب",
  class_c: "لياقة فئة ج",
  temporary_unfit: "غير لائق مؤقتاً",
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-(--app-border)/50 last:border-b-0">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-(--app-info)/10 text-(--app-info) flex items-center justify-center mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-(--app-muted-foreground) mb-0.5">{label}</p>
        <p className="text-sm font-bold text-(--color-primary) break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

export function ViewVisitModal({ visitId, onClose }: ViewVisitModalProps) {
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [prevVisitId, setPrevVisitId] = useState(visitId);
  if (visitId !== prevVisitId) {
    setPrevVisitId(visitId);
    setLoading(true);
    setError("");
    setVisit(null);
  }

  useEffect(() => {
    if (!visitId) return;

    fetch(`/api/medical/${encodeURIComponent(visitId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setVisit(data.data);
        } else {
          const errorMsg = extractApiError(data, "فشل في تحميل تفاصيل الزيارة");
          setError(errorMsg);
        }
      })
      .catch(() => setError("حدث خطأ في جلب بيانات الزيارة"))
      .finally(() => setLoading(false));
  }, [visitId]);

  const formatDate = (dateStr: string) => {
    try {
      const res = formatDateDisplay(dateStr);
      return res || dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <ModalShell
      title="تفاصيل الزيارة الطبية"
      icon={<Activity className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-0 no-scrollbar"
      footer={
        visit ? (
          <ModalActions
            onCancel={onClose}
            cancelText="إغلاق"
            readOnly={true}
          />
        ) : undefined
      }
    >
      {loading ? (
        <LoadingState message="جاري تحميل بيانات الزيارة..." variant="inline" />
      ) : error ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-(--app-error)/10 text-(--app-error) flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-(--app-error)">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 text-xs font-bold text-(--app-info) hover:underline cursor-pointer border-none bg-transparent"
          >
            إغلاق
          </button>
        </div>
      ) : visit ? (
        <div className="divide-y divide-(--app-border)/50">
          {/* Patient Info */}
          <div className="px-6 py-5">
            <InfoRow
              icon={<User className="w-4 h-4" />}
              label="اسم المريض"
              value={visit.patientName}
            />
            <InfoRow
              icon={<ClipboardList className="w-4 h-4" />}
              label="رقم المريض"
              value={visit.patientId}
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="تاريخ الزيارة"
              value={formatDate(visit.visitDate)}
            />
          </div>

          {/* Medical Info */}
          <div className="px-6 py-5">
            <h3 className="text-[11px] font-black uppercase text-(--app-muted-foreground) mb-3 tracking-wider">
              المعلومات الطبية
            </h3>
            <InfoRow
              icon={<Stethoscope className="w-4 h-4" />}
              label="التشخيص"
              value={visit.diagnosis}
            />
            {visit.treatment && (
              <InfoRow
                icon={<Activity className="w-4 h-4" />}
                label="ملاحظات طبية / توصيات"
                value={visit.treatment}
              />
            )}
          </div>

          {/* Fitness & Rest */}
          <div className="px-6 py-5">
            <h3 className="text-[11px] font-black uppercase text-(--app-muted-foreground) mb-3 tracking-wider">
              اللياقة والراحة الطبية
            </h3>
            <InfoRow
              icon={<Activity className="w-4 h-4" />}
              label="اللياقة الطبية"
              value={fitnessLabels[visit.fitnessCategory] || visit.fitnessCategory}
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="الراحة الطبية"
              value={
                visit.restType !== "none" && visit.restDays > 0
                  ? `${restLabels[visit.restType] || visit.restType} (${visit.restDays === 1
                    ? "يوم واحد"
                    : visit.restDays === 2
                      ? "يومين"
                      : `${visit.restDays} يوم`
                  })`
                  : "لا يوجد"
              }
            />
          </div>

          {/* Dispensed Medicines */}
          {visit.dispensedMedicines && visit.dispensedMedicines.length > 0 && (
            <div className="px-6 py-5">
              <h3 className="text-[11px] font-black uppercase text-(--app-muted-foreground) mb-3 tracking-wider">
                الأدوية المصروفة
              </h3>
              <div className="space-y-2">
                {visit.dispensedMedicines.map((med) => (
                  <div
                    key={med.medicineId}
                    className="flex items-center gap-3 p-3 rounded-xl bg-(--app-info)/6 border border-(--app-info)/15"
                  >
                    <div className="w-8 h-8 rounded-lg bg-(--app-info)/15 text-(--app-info) flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-(--color-primary)">
                        {med.quantity}{med.unit ? ` ${med.unit}` : ""} {med.medicineName}{med.concentration ? ` ${med.concentration}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : null}
    </ModalShell>
  );
}
