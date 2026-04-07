"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";

interface MedicineOption {
  _id: string;
  name: string;
  quantity: number;
  expiryDate: string;
}

interface DispensedItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
}

export default function NewVisitPage() {
  const router = useRouter();
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [dispensed, setDispensed] = useState<DispensedItem[]>([]);

  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [dispenseQty, setDispenseQty] = useState(1);

  useEffect(() => {
    fetch("/api/medical/medicines")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setMedicines(data.data.medicines);
      })
      .catch(() => {});
  }, []);

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
      { medicineId: selectedMedicine, medicineName: med.name, quantity: dispenseQty },
    ]);
    setSelectedMedicine("");
    setDispenseQty(1);
    setError("");
  };

  const removeDispense = (medicineId: string) => {
    setDispensed(dispensed.filter((d) => d.medicineId !== medicineId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push("/medical/visits");
      router.refresh();
    } catch {
      setError("حدث خطأ في الخادم");
      setLoading(false);
    }
  };

  return (
    <PageContainer className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="تسجيل زيارة طبية جديدة"
        backHref="/medical/visits"
        backLabel="العودة"
      />

        {error && (
        <div className="bg-(--app-error)/20 border border-(--app-error)/30 text-(--app-error) p-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">رقم الفرد</label>
          <input
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
            className="w-full border rounded-lg p-2 bg-(--app-surface) border-(--app-border) text-foreground"
            placeholder="مثال: 1234-56"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">اسم المريض</label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            required
            className="w-full border rounded-lg p-2 bg-(--app-surface) border-(--app-border) text-foreground"
            placeholder="اسم المريض الكامل"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">التشخيص</label>
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            required
            className="w-full border rounded-lg p-2 bg-(--app-surface) border-(--app-border) text-foreground"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">العلاج</label>
          <textarea
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            required
            className="w-full border rounded-lg p-2 bg-(--app-surface) border-(--app-border) text-foreground"
            rows={3}
          />
        </div>

        <div className="border rounded-lg p-4 space-y-3 border-(--app-border) bg-(--app-surface)">
          <h3 className="font-medium">صرف أدوية</h3>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm mb-1">الدواء</label>
              <select
                value={selectedMedicine}
                onChange={(e) => setSelectedMedicine(e.target.value)}
                className="w-full border rounded-lg p-2 bg-(--app-surface) border-(--app-border) text-foreground"
               >
                 <option value="">اختر دواء</option>
                {medicines
                  .filter((m) => m.quantity > 0 && new Date(m.expiryDate) > new Date())
                  .map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} (متوفر: {m.quantity})
                    </option>
                  ))}
              </select>
            </div>

            <div className="w-24">
              <label className="block text-sm mb-1">الكمية</label>
              <input
                type="number"
                min={1}
                value={dispenseQty}
                onChange={(e) => setDispenseQty(parseInt(e.target.value) || 1)}
                 className="w-full border rounded-lg p-2 bg-(--app-surface) border-(--app-border) text-foreground"
               />
             </div>

             <button
               type="button"
               onClick={addDispense}
               className="bg-(--app-success) text-(--app-white) px-4 py-2 rounded-lg hover:bg-(--app-success)/90"
            >
              إضافة
            </button>
          </div>

          {dispensed.length > 0 && (
            <div className="overflow-x-auto rounded-lg bg-(--app-surface-container) mt-4">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-(--app-border) text-sm text-(--app-muted-foreground)">
                    <th className="p-4">الدواء</th>
                    <th className="p-4">الكمية</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {dispensed.map((d) => (
                    <tr key={d.medicineId} className="border-b border-(--app-border) transition hover:bg-white/10">
                      <td className="p-4 font-medium text-(--color-primary)">{d.medicineName}</td>
                      <td className="p-4 text-(--app-muted-foreground)">{d.quantity}</td>
                      <td className="p-4 text-left">
                        <button
                          type="button"
                          onClick={() => removeDispense(d.medicineId)}
                          className="text-(--app-error) hover:underline text-sm font-medium"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-(--app-info) text-(--app-white) py-3 rounded-lg hover:bg-(--app-info)/90 disabled:opacity-50"
        >
          {loading ? "جاري الحفظ..." : "حفظ الزيارة"}
        </button>
      </form>
    </PageContainer>
  );
}
