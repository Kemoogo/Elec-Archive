"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { FormField, FormInput, FormTextarea, FormSelect } from "@/components/ui/form-fields";
import { extractApiError } from "@/lib/utils";

interface MedicineOption {
  _id: string;
  name: string;
  unit: string;
  concentration: string;
  quantity: number;
  expiryDate: string | null;
  isExpired: boolean;
}

interface DispensedItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
}

interface EditVisitModalProps {
  visitId: string;
  onClose: () => void;
}

export function EditVisitModal({ visitId, onClose }: EditVisitModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [dispensed, setDispensed] = useState<DispensedItem[]>([]);

  const [fitnessCategory, setFitnessCategory] = useState("fit");
  const [restType, setRestType] = useState("none");
  const [restDays, setRestDays] = useState(0);

  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [dispenseQty, setDispenseQty] = useState(1);
  const [medicineSearch, setMedicineSearch] = useState("");

  // Load medicines list
  useEffect(() => {
    fetch("/api/medical/medicines")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setMedicines(data.data.medicines);
      })
      .catch(() => { });
  }, []);

  // Load existing visit details
  useEffect(() => {
    if (!visitId) return;
    fetch(`/api/medical/${encodeURIComponent(visitId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const v = data.data;
          setPatientId(v.patientId);
          setPatientName(v.patientName);
          setDiagnosis(v.diagnosis);
          setTreatment(v.treatment || "");
          setRestType(v.restType || "none");
          setRestDays(v.restDays || 0);
          setFitnessCategory(v.fitnessCategory || "fit");
          setDispensed(
            (v.dispensedMedicines || []).map((m: { medicineId: string; medicineName: string; quantity: number }) => ({
              medicineId: m.medicineId,
              medicineName: m.medicineName || "دواء غير معروف",
              quantity: m.quantity,
            }))
          );
        } else {
          const errorMsg = extractApiError(data, "فشل في تحميل تفاصيل الزيارة");
          setError(errorMsg);
        }
      })
      .catch(() => setError("حدث خطأ في جلب بيانات الزيارة"))
      .finally(() => setLoading(false));
  }, [visitId]);

  const medicineResults = useMemo(() => {
    if (!medicineSearch.trim() || selectedMedicine) {
      return [];
    }

    const term = medicineSearch.toLowerCase().trim();
    return medicines.filter((m) => {
      if (m.quantity <= 0 || m.isExpired) return false;
      return (
        m.name.toLowerCase().includes(term) ||
        (m.concentration && m.concentration.toLowerCase().includes(term))
      );
    });
  }, [medicineSearch, medicines, selectedMedicine]);

  const addDispense = () => {
    if (!selectedMedicine || dispenseQty < 1) return;
    const med = medicines.find((m) => m._id === selectedMedicine);
    if (!med) return;

    if (dispensed.some((d) => d.medicineId === selectedMedicine)) {
      setError("هذا الدواء مضاف مسبقاً");
      return;
    }

    setDispensed([
      ...dispensed,
      {
        medicineId: selectedMedicine,
        medicineName: `${med.name} ${med.concentration ? `(${med.concentration})` : ""}`.trim(),
        quantity: dispenseQty,
      },
    ]);
    setSelectedMedicine("");
    setMedicineSearch("");
    setDispenseQty(1);
    setError("");
  };

  const removeDispense = (medicineId: string) => {
    setDispensed(dispensed.filter((d) => d.medicineId !== medicineId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMedicine) {
      showToast("برجاء إضافة الدواء المختار أولاً بالضغط على زر (إضافة)، أو مسح الاختيار للتراجع عن الصرف.", "error");
      setError("برجاء إضافة الدواء المختار أولاً بالضغط على زر (إضافة)، أو مسح الاختيار للتراجع.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/medical/${encodeURIComponent(visitId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          patientName,
          diagnosis,
          treatment,
          dispensedMedicines: dispensed.map((d) => ({
            medicineId: d.medicineId,
            quantity: d.quantity,
          })),
          restType,
          restDays,
          fitnessCategory,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(extractApiError(data, "حدث خطأ"));
        setSaving(false);
        return;
      }

      showToast("تم تعديل الزيارة بنجاح", "success");
      router.refresh();
      onClose();
    } catch {
      setError("حدث خطأ في الخادم");
      setSaving(false);
    }
  };

  const footer = (
    <ModalActions className="sm:items-stretch w-full">
      <button
        type="submit"
        form="edit-visit-form"
        className="btn-modal-primary"
        disabled={saving}
      >
        {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="btn-modal-secondary"
        disabled={saving}
      >
        إلغاء
      </button>
    </ModalActions>
  );

  return (
    <ModalShell
      title={
        <span className="text-base font-semibold text-(--color-primary)">
          تعديل زيارة طبية: {patientName || "تحميل..."} {patientId ? `(رقم: ${patientId})` : ""}
        </span>
      }
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-2xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 no-scrollbar"
      footer={footer}
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-(--app-muted-foreground) font-bold">
          جاري تحميل بيانات الزيارة...
        </div>
      ) : (
        <form id="edit-visit-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-(--app-error)/10 border border-(--app-error)/20 rounded-xl text-(--app-error) text-xs font-bold text-right">
              {error}
            </div>
          )}

          <div className="space-y-4 text-right">
            {/* التشخيص */}
            <FormField label="التشخيص" required>
              <FormTextarea
                id="visit-diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                required
                className="min-h-[80px]"
                placeholder="أدخل تشخيص الحالة..."
              />
            </FormField>

            {/* ملاحظات طبية */}
            <FormField label="ملاحظات طبية / توصيات">
              <FormTextarea
                id="visit-treatment"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                className="min-h-[80px]"
                placeholder="أدخل أي ملاحظات إضافية أو توصيات طبية (اختياري)..."
              />
            </FormField>

            {/* اللياقة الطبية والراحة الطبية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-(--app-border) pt-4">
              <FormField label="اللياقة الطبية">
                <FormSelect
                  id="visit-fitness"
                  value={fitnessCategory}
                  onChange={(e) => setFitnessCategory(e.target.value)}
                >
                  <option value="fit">لائق طبياً</option>
                  <option value="class_a">لياقة فئة أ</option>
                  <option value="class_b">لياقة فئة ب</option>
                  <option value="class_c">لياقة فئة ج</option>
                  <option value="temporary_unfit">غير لائق مؤقتاً</option>
                </FormSelect>
              </FormField>

              <div className="grid grid-cols-2 gap-2">
                <FormField label="نوع الراحة الطبية">
                  <FormSelect
                    id="visit-restType"
                    value={restType}
                    onChange={(e) => {
                      setRestType(e.target.value);
                      if (e.target.value === "none") setRestDays(0);
                    }}
                  >
                    <option value="none">لا يوجد</option>
                    <option value="ward">راحة بالعنبر</option>
                    <option value="home">راحة منزلية</option>
                    <option value="exemption">إعفاء مجهود</option>
                  </FormSelect>
                </FormField>

                <FormField label="المدة (بالأيام)">
                  <FormInput
                    id="visit-restDays"
                    type="number"
                    min={0}
                    value={restDays || ""}
                    onChange={(e) => setRestDays(parseInt(e.target.value, 10) || 0)}
                    disabled={restType === "none"}
                    className={`text-center ${
                      restType === "none"
                        ? "!bg-(--app-surface-container) !border-(--app-border) !text-(--app-muted-foreground) !cursor-not-allowed"
                        : ""
                    }`}
                    placeholder="0"
                  />
                </FormField>
              </div>
            </div>

            {/* صرف أدوية */}
            <div className="border border-(--app-border) rounded-2xl p-4 space-y-3 bg-(--app-surface-container)/30">
              <h3 className="text-[11px] font-black uppercase text-(--app-muted-foreground)">صرف أدوية</h3>

              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <FormField label="الدواء" required>
                    <FormInput
                      id="visit-medicine"
                      type="text"
                      value={medicineSearch}
                      onChange={(e) => {
                        setMedicineSearch(e.target.value);
                        setSelectedMedicine("");
                      }}
                      placeholder="ابحث عن دواء باسمه أو تركيزه..."
                      autoComplete="off"
                    />
                  </FormField>

                  {/* نتائج البحث عن دواء */}
                  {medicineResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-(--app-surface) border border-(--app-border) rounded-xl shadow-depth-lg max-h-48 overflow-y-auto divide-y divide-(--app-border)/50">
                      {medicineResults.map((med) => (
                        <button
                          key={med._id}
                          type="button"
                          onClick={() => {
                            setSelectedMedicine(med._id);
                            setMedicineSearch(`${med.name} ${med.concentration ? `(${med.concentration})` : ""} - ${med.unit} (متوفر: ${med.quantity})`);
                          }}
                          className="w-full px-4 py-2.5 text-right hover:bg-(--app-info)/5 transition-colors block text-sm font-bold text-(--app-foreground) cursor-pointer border-none bg-none"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-(--color-primary)">
                              {med.name} {med.concentration ? `(${med.concentration})` : ""}
                            </span>
                            <span className="text-xs text-(--app-muted-foreground) font-mono">
                              {med.unit} (متوفر: {med.quantity})
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <FormField label="الكمية" className="w-24">
                  <FormInput
                    id="visit-qty"
                    type="number"
                    min={1}
                    value={dispenseQty}
                    onChange={(e) => setDispenseQty(parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                </FormField>

                {(selectedMedicine || medicineSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMedicine("");
                      setMedicineSearch("");
                      setDispenseQty(1);
                      if (error.includes("إضافة الدواء المختار")) {
                        setError("");
                      }
                    }}
                    className="h-[38px] px-4 rounded-xl bg-(--app-error)/10 text-(--app-error) border border-(--app-error)/20 hover:bg-(--app-error)/20 transition-all text-sm font-bold cursor-pointer"
                  >
                    مسح
                  </button>
                )}

                <button
                  type="button"
                  onClick={addDispense}
                  className="h-[38px] px-4 rounded-xl bg-(--app-info)/10 text-(--app-info) border border-(--app-info)/20 hover:bg-(--app-info)/20 transition-all text-sm font-bold cursor-pointer"
                >
                  إضافة
                </button>
              </div>

              {dispensed.length > 0 && (
                <div className="mt-4 rounded-xl border border-(--app-border) overflow-hidden bg-(--app-surface)">
                  <table className="w-full table-auto min-w-full text-right">
                    <thead className="bg-[var(--color-primary)] text-white text-xs">
                      <tr>
                        <th className="px-5 py-3 text-right">الدواء</th>
                        <th className="px-5 py-3 text-center">الكمية</th>
                        <th className="px-5 py-3 text-center w-16">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--app-border)/40">
                      {dispensed.map((d) => (
                        <tr key={d.medicineId} className="hover:bg-(--app-surface-container) transition-colors">
                          <td className="px-5 py-3 text-xs font-bold text-(--color-primary) whitespace-nowrap">{d.medicineName}</td>
                          <td className="px-5 py-3 text-xs font-mono font-bold text-(--app-muted-foreground) text-center whitespace-nowrap">{d.quantity}</td>
                          <td className="px-5 py-3 text-center whitespace-nowrap">
                            <button
                               type="button"
                               onClick={() => removeDispense(d.medicineId)}
                               className="btn-action-danger"
                               title="حذف"
                            >
                               <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
