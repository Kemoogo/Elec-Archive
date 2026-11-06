"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { PrimaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { Plus, Trash2, AlertTriangle, Stethoscope } from "lucide-react";
import { FormField, FormLabel, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

const FITNESS_CATEGORY_OPTIONS: CustomSelectOption[] = [
  { value: "fit", label: "لائق طبياً" },
  { value: "class_a", label: "لياقة فئة أ" },
  { value: "class_b", label: "لياقة فئة ب" },
  { value: "class_c", label: "لياقة فئة ج" },
  { value: "temporary_unfit", label: "غير لائق مؤقتاً" },
];

const REST_TYPE_OPTIONS: CustomSelectOption[] = [
  { value: "none", label: "لا يوجد" },
  { value: "ward", label: "راحة بالعنبر" },
  { value: "home", label: "راحة منزلية" },
  { value: "exemption", label: "إعفاء مجهود" },
];

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

export function NewVisitButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <PrimaryHeaderBtn
        label="زيارة جديدة"
        icon={<Plus className="w-4 h-4" />}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && <NewVisitModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

export function NewVisitModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [category, setCategory] = useState<"officer" | "nco" | "recruit">("recruit");
  const [officerSearch, setOfficerSearch] = useState("");
  const [officerResults, setOfficerResults] = useState<{ militaryId: string; fullName: string; formattedName: string }[]>([]);
  const [searchingOfficers, setSearchingOfficers] = useState(false);
  const officerAbortRef = useRef<AbortController | null>(null);

  const fetchOfficers = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setOfficerResults([]);
      setSearchingOfficers(false);
      return;
    }

    if (officerAbortRef.current) {
      officerAbortRef.current.abort();
    }
    const controller = new AbortController();
    officerAbortRef.current = controller;

    setSearchingOfficers(true);
    try {
      const res = await fetch(`/api/medical/officers/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (data.success) {
        setOfficerResults(data.data.officers || []);
      }
    } catch {
      // Aborted or network error
    } finally {
      if (!controller.signal.aborted) {
        setSearchingOfficers(false);
      }
    }
  }, []);

  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [dispensed, setDispensed] = useState<DispensedItem[]>([]);

  const [fitnessCategory, setFitnessCategory] = useState("fit");
  const [restType, setRestType] = useState("none");
  const [restDays, setRestDays] = useState(0);
  const [patientRecord, setPatientRecord] = useState<{
    allergies: string[];
    chronicConditions: string[];
    bloodType?: string;
  } | null>(null);

  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [dispenseQty, setDispenseQty] = useState(1);
  const [medicineSearch, setMedicineSearch] = useState("");

  const fetchMedicines = () => {
    fetch("/api/medical/medicines")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setMedicines(data.data.medicines);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  useEffect(() => {
    if (category !== "officer" || officerSearch.trim().length < 2) {
      setOfficerResults([]);
      setSearchingOfficers(false);
      return;
    }

    const delayDebounce = setTimeout(() => {
      fetchOfficers(officerSearch);
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [officerSearch, category, fetchOfficers]);

  useEffect(() => {
    if (!patientId.trim()) {
      const timer = setTimeout(() => {
        setPatientRecord(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      fetch(`/api/medical/patients/${encodeURIComponent(patientId.trim())}/record`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data.record) {
            setPatientRecord(data.data.record);
          } else {
            setPatientRecord(null);
          }
        })
        .catch(() => setPatientRecord(null));
    }, 500);

    return () => clearTimeout(timer);
  }, [patientId]);

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
      { medicineId: selectedMedicine, medicineName: `${med.name} ${med.concentration ? `(${med.concentration})` : ""}`.trim(), quantity: dispenseQty },
    ]);
    setSelectedMedicine("");
    setMedicineSearch("");
    setDispenseQty(1);
    setError("");
  };

  const removeDispense = (medicineId: string) => {
    setDispensed(dispensed.filter((d) => d.medicineId !== medicineId));
  };

  const handleSubmit = async (e: React.FormEvent, exitAfterSave: boolean) => {
    e.preventDefault();

    if (selectedMedicine) {
      showToast("برجاء إضافة الدواء المختار أولاً بالضغط على زر (إضافة)، أو مسح الاختيار للتراجع عن الصرف.", "error");
      setError("برجاء إضافة الدواء المختار أولاً بالضغط على زر (إضافة)، أو مسح الاختيار للتراجع.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/medical", {
        method: "POST",
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
        setLoading(false);
        return;
      }

      showToast("تم تسجيل الزيارة الطبية بنجاح", "success");
      router.refresh();

      if (exitAfterSave) {
        onClose();
      } else {
        setPatientId("");
        setPatientName("");
        setDiagnosis("");
        setTreatment("");
        setDispensed([]);
        setSelectedMedicine("");
        setDispenseQty(1);
        setMedicineSearch("");
        setCategory("recruit");
        setOfficerSearch("");
        setOfficerResults([]);
        setRestType("none");
        setRestDays(0);
        setFitnessCategory("fit");
        setPatientRecord(null);
        setLoading(false);
        fetchMedicines();
      }
    } catch {
      setError("حدث خطأ في الخادم");
      setLoading(false);
    }
  };

  const footer = (
    <ModalActions
      startSlot={
        <button
          type="button"
          onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)}
          className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
          disabled={loading}
        >
          حفظ ومتابعة
        </button>
      }
      form="visit-form"
      submitText="حفظ وخروج"
      submitLoading={loading}
      onCancel={onClose}
    />
  );

  return (
    <ModalShell
      title="تسجيل زيارة طبية جديدة"
      icon={<Stethoscope className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-2xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 no-scrollbar"
      footer={footer}
    >
      <form id="visit-form" onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
        {error && (
          <div className="p-3 bg-(--app-error)/10 border border-(--app-error)/20 rounded-xl text-(--app-error) text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-4 text-right">
          {/* فئة المريض */}
          <div className="space-y-1.5">
            <FormLabel>فئة المريض</FormLabel>
            <div className="grid grid-cols-3 gap-2 p-1 bg-(--app-surface-container) rounded-xl border border-(--app-border)">
              <button
                type="button"
                onClick={() => {
                  setCategory("recruit");
                  setPatientId("");
                  setPatientName("");
                  setOfficerSearch("");
                  setOfficerResults([]);
                }}
                className={`py-2 px-3 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  category === "recruit"
                    ? "bg-(--app-surface) text-(--color-primary) shadow-sm"
                    : "text-(--app-muted-foreground) hover:bg-(--app-surface)/50"
                }`}
              >
                مستجد
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategory("nco");
                  setPatientId("");
                  setPatientName("");
                  setOfficerSearch("");
                  setOfficerResults([]);
                }}
                className={`py-2 px-3 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  category === "nco"
                    ? "bg-(--app-surface) text-(--color-primary) shadow-sm"
                    : "text-(--app-muted-foreground) hover:bg-(--app-surface)/50"
                }`}
              >
                أفراد
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategory("officer");
                  setPatientId("");
                  setPatientName("");
                  setOfficerSearch("");
                  setOfficerResults([]);
                }}
                className={`py-2 px-3 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  category === "officer"
                    ? "bg-(--app-surface) text-(--color-primary) shadow-sm"
                    : "text-(--app-muted-foreground) hover:bg-(--app-surface)/50"
                }`}
              >
                ضابط
              </button>
            </div>
          </div>

          {/* البحث عن ضابط */}
          {category === "officer" && (
            <div className="space-y-1.5 relative">
              <FormLabel htmlFor="officer-search" required>ابحث عن الضابط (الاسم أو الرقم العسكري)</FormLabel>
              <div className="relative">
                <input
                  id="officer-search"
                  type="text"
                  value={officerSearch}
                  onChange={(e) => setOfficerSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fetchOfficers(officerSearch);
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-(--app-surface) border border-(--app-info)/30 focus:border-(--app-info) focus:ring-4 focus:ring-(--app-info)/10 rounded-xl text-sm font-bold text-(--app-foreground) transition-all text-right focus:outline-none"
                  placeholder="اكتب اسم الضابط أو رقمه العسكري للبحث (حرفين على الأقل)..."
                  autoComplete="off"
                />
                {searchingOfficers && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1e3c72] border-t-transparent"></div>
                  </div>
                )}
              </div>

              {/* نتائج البحث */}
              {officerResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-(--app-surface) border border-(--app-border) rounded-xl shadow-depth-lg max-h-48 overflow-y-auto divide-y divide-(--app-border)/50">
                  {officerResults.map((off) => (
                    <button
                      key={off.militaryId}
                      type="button"
                      onClick={() => {
                        setPatientId(off.militaryId);
                        setPatientName(off.formattedName);
                        setOfficerSearch(off.formattedName);
                        setOfficerResults([]);
                      }}
                      className="w-full px-4 py-2.5 text-right hover:bg-(--app-info)/5 transition-colors block text-sm font-bold text-(--app-foreground) cursor-pointer border-none bg-none"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-(--color-primary)">{off.formattedName}</span>
                        <span className="text-xs text-(--app-muted-foreground) font-mono">رقم عسكري: {off.militaryId}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FormLabel htmlFor="visit-patientId" required>
                {category === "officer" ? "الرقم العسكري للضابط" : "رقم / الرقم العسكري"}
              </FormLabel>
              <input
                id="visit-patientId"
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
                readOnly={category === "officer"}
                className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none transition-all text-right ${
                  category === "officer"
                    ? "bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) cursor-not-allowed"
                    : "bg-(--app-surface) border-(--app-border) text-(--app-muted-foreground) focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                }`}
                placeholder={category === "officer" ? "اختر الضابط من البحث أعلاه" : "مثال: 1234-56"}
              />
            </div>

            <div className="space-y-1.5">
              <FormLabel htmlFor="visit-patientName" required>اسم المريض</FormLabel>
              <input
                id="visit-patientName"
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                readOnly={category === "officer"}
                className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none transition-all text-right ${
                  category === "officer"
                    ? "bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) cursor-not-allowed"
                    : "bg-(--app-surface) border-(--app-border) text-(--app-muted-foreground) focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                }`}
                placeholder={category === "officer" ? "سيتم ملء الاسم تلقائياً" : "اسم المريض الكامل"}
              />
            </div>
          </div>

          {patientRecord && (patientRecord.allergies.length > 0 || patientRecord.chronicConditions.length > 0) && (
            <div className="p-4 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-2xl space-y-2 text-right animate-in fade-in duration-300">
              <div className="flex items-center gap-2 font-black text-sm text-(--color-primary)">
                <AlertTriangle className="w-5 h-5 text-(--color-primary)" />
                <span>تنبيه طبي هام للمريض!</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-bold mt-1">
                {patientRecord.allergies.length > 0 && (
                  <div>
                    <span className="text-(--app-foreground) block mb-1">⚠️ الحساسيات:</span>
                    <ul className="list-disc list-inside space-y-0.5 mr-2">
                      {patientRecord.allergies.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
                {patientRecord.chronicConditions.length > 0 && (
                  <div>
                    <span className="text-(--app-foreground) block mb-1">📋 الأمراض المزمنة:</span>
                    <ul className="list-disc list-inside space-y-0.5 mr-2">
                      {patientRecord.chronicConditions.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <FormLabel htmlFor="visit-diagnosis" required>التشخيص</FormLabel>
            <FormTextarea
              id="visit-diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
              placeholder="أدخل تشخيص الحالة..."
            />
          </div>

          <div className="space-y-1.5">
            <FormLabel htmlFor="visit-treatment">ملاحظات طبية / توصيات</FormLabel>
            <FormTextarea
              id="visit-treatment"
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="أدخل أي ملاحظات إضافية أو توصيات طبية (اختياري)..."
            />
          </div>

          {/* اللياقة الطبية والراحة الطبية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-(--app-border) pt-4">
            <CustomSelect
              id="visit-fitness"
              label="اللياقة الطبية"
              value={fitnessCategory}
              onChange={setFitnessCategory}
              options={FITNESS_CATEGORY_OPTIONS}
            />

            <div className="grid grid-cols-2 gap-2">
              <CustomSelect
                id="visit-restType"
                label="نوع الراحة الطبية"
                value={restType}
                onChange={(val) => {
                  setRestType(val);
                  if (val === "none") setRestDays(0);
                }}
                options={REST_TYPE_OPTIONS}
              />

              <div className="space-y-1.5">
                <FormLabel htmlFor="visit-restDays">المدة (بالأيام)</FormLabel>
                <input
                  id="visit-restDays"
                  type="number"
                  min={0}
                  value={restDays || ""}
                  onChange={(e) => setRestDays(parseInt(e.target.value, 10) || 0)}
                  disabled={restType === "none"}
                  className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none transition-all text-center ${
                    restType === "none"
                      ? "bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground) cursor-not-allowed"
                      : "bg-(--app-surface) border-(--app-border) text-(--app-muted-foreground) focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

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
                        className="w-full px-4 py-2.5 text-right hover:bg-(--app-info)/10 transition-colors block text-sm font-bold text-(--app-foreground) cursor-pointer border-none bg-none"
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

              <div className="w-24">
                <FormField label="الكمية">
                  <FormInput
                    id="visit-qty"
                    type="number"
                    min={1}
                    value={dispenseQty}
                    onChange={(e) => setDispenseQty(parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                </FormField>
              </div>

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
                            className="p-1.5 rounded-lg btn-action-primary cursor-pointer"
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
    </ModalShell>
  );
}
