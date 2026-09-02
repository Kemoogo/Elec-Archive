"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Calendar, Package } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn, extractApiError } from "@/lib/utils";

interface Batch {
  _id: string;
  quantity: number;
  expiryDate: string;
  receivedAt: string;
}

interface Medicine {
  _id: string;
  name: string;
  unit: string;
  concentration: string;
  totalQuantity: number;
  minThreshold: number;
  batches: Batch[];
}

interface MedicineDetailModalProps {
  medicineId: string;
  onClose: () => void;
}

export function MedicineDetailModal({ medicineId, onClose }: MedicineDetailModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/medical/medicines/${medicineId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMedicine(data.data);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("حدث خطأ أثناء تحميل البيانات"))
      .finally(() => setLoading(false));
  }, [medicineId]);

  const handleDestroyExpired = async () => {
    if (!confirm("هل أنت متأكد من إعدام كافة الكميات منتهية الصلاحية لهذا الدواء؟")) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/medical/medicines/${medicineId}/destroy-expired`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        showToast("تم إعدام الكميات منتهية الصلاحية بنجاح", "success");
        router.refresh();
        onClose();
      } else {
        showToast(extractApiError(data, "حدث خطأ أثناء الإعدام"), "error");
      }
    } catch {
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const now = new Date();
  const hasExpired = medicine?.batches?.some(
    (b) => new Date(b.expiryDate) < now && b.quantity > 0
  );

  return (
    <ModalShell
      title="تفاصيل الدواء"
      icon={<Package className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-2xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-0 no-scrollbar"
      footer={
        <ModalActions className="p-4 border-t border-(--app-border) bg-(--app-surface-container)/50">
          {hasExpired && (
            <button
              onClick={handleDestroyExpired}
              disabled={actionLoading}
              className="btn-destructive flex items-center gap-2 px-6"
            >
              <Trash2 className="w-4 h-4" />
              إعدام المنتهي
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-secondary px-6"
          >
            إلغاء
          </button>
        </ModalActions>
      }
    >
      <div className="p-6">
        {loading ? (
          <div className="py-20 text-center animate-pulse text-(--app-muted-foreground) font-bold">
            جاري تحميل البيانات...
          </div>
        ) : error ? (
          <div className="p-4 bg-(--app-error)/10 text-(--app-error) rounded-xl border border-(--app-error)/20 text-center font-bold">
            {error}
          </div>
        ) : medicine && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm">
                <div className="text-xs font-bold text-(--app-muted-foreground) mb-1">اسم الدواء</div>
                <div className="text-lg font-black text-(--color-primary)">
                  {medicine.name} {medicine.concentration ? `(${medicine.concentration})` : ""}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm">
                <div className="text-xs font-bold text-(--app-muted-foreground) mb-1">إجمالي الكمية</div>
                <div className="text-lg font-black text-(--color-primary)">
                  {medicine.totalQuantity} <span className="text-sm font-bold text-(--app-muted-foreground)">{medicine.unit}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-(--app-foreground) px-1">تشغيلات المخزون (Batches)</h3>
              <div className="border border-(--app-border) rounded-2xl overflow-hidden bg-(--app-surface)">
                <table className="w-full table-auto min-w-full text-right">
                  <thead className="bg-[var(--color-primary)] text-white text-xs">
                    <tr>
                      <th className="px-5 py-3 text-right">تاريخ الاستلام</th>
                      <th className="px-5 py-3 text-right">تاريخ الانتهاء</th>
                      <th className="px-5 py-3 text-center">الكمية</th>
                      <th className="px-5 py-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {medicine.batches.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-sm font-bold text-(--app-muted-foreground)">
                          لا يوجد مخزون حالي لهذا الدواء
                        </td>
                      </tr>
                    ) : (
                      medicine.batches
                        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                        .map((batch) => {
                          const isExpired = new Date(batch.expiryDate) < now;

                          return (
                            <tr
                              key={batch._id}
                              className={cn(
                                "hover:bg-(--app-surface-container)/80 transition-colors",
                                isExpired && batch.quantity > 0 && "bg-(--app-error)/10"
                              )}
                            >
                              <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) whitespace-nowrap">
                                {new Date(batch.receivedAt).toLocaleDateString("ar-EG")}
                              </td>
                              <td className="px-5 py-3 text-xs font-bold text-(--app-muted-foreground) whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-(--app-muted-foreground)" />
                                  {new Date(batch.expiryDate).toLocaleDateString("ar-EG")}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-center text-xs font-mono font-bold text-(--app-muted-foreground) whitespace-nowrap">
                                {batch.quantity}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap">
                                <div className="flex justify-center">
                                  {isExpired && batch.quantity > 0 ? (
                                    <span className="flex items-center gap-1 text-[10px] font-black bg-(--app-error)/20 text-(--app-error) px-2 py-0.5 rounded-full uppercase">
                                      <AlertTriangle className="w-3 h-3" />
                                      منتهي
                                    </span>
                                  ) : isExpired && batch.quantity === 0 ? (
                                    <span className="text-[10px] font-bold text-(--app-muted-foreground)">منتهي (مفرغ)</span>
                                  ) : batch.quantity === 0 ? (
                                    <span className="text-[10px] font-bold text-(--app-muted-foreground)">منتهي (مفرغ)</span>
                                  ) : (
                                    <span className="text-[10px] font-black bg-(--app-success)/10 text-(--app-success) px-2 py-0.5 rounded-full uppercase">
                                      صالح
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
