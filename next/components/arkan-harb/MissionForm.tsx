"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { Calendar, MapPin, ClipboardList } from "lucide-react";

import { DateField } from "@/components/ui/date-field";

interface BaseMission {
  id: string;
  officerId: string;
  title: string;
  description?: string;
  destination?: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  status: "scheduled" | "active" | "completed" | "cancelled";
}

interface MissionFormProps {
  mission: BaseMission | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function MissionForm({ mission, isOpen, onClose, onSave }: MissionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = !!mission;

  const [form, setForm] = useState({
    officerId: "",
    title: "",
    description: "",
    destination: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    status: "scheduled" as BaseMission["status"],
  });

  useEffect(() => {
    if (mission && isOpen) {
      setForm({
        officerId: mission.officerId,
        title: mission.title,
        description: mission.description || "",
        destination: mission.destination || "",
        startDate: new Date(mission.startDate).toISOString().split('T')[0],
        endDate: mission.endDate ? new Date(mission.endDate).toISOString().split('T')[0] : "",
        status: mission.status,
      });
    } else if (!mission && isOpen) {
      setForm({
        officerId: "",
        title: "",
        description: "",
        destination: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        status: "scheduled",
      });
    }
    setError("");
  }, [mission, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = isEditing 
        ? `/api/arkan-harb/missions/${mission.id}` 
        : "/api/arkan-harb/missions";
      
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "فشل حفظ المأمورية");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const footer = (
    <ModalActions 
      submitText={isEditing ? "تحديث المأمورية" : "تسجيل المأمورية"}
      submitLoading={loading}
      onCancel={onClose}
    />
  );

  return (
    <ModalShell
      title={
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isEditing ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
            <ClipboardList className="h-4 w-4" />
          </div>
          <span className="text-base font-black text-(--app-foreground)">
            {isEditing ? "تعديل مأمورية" : "تسجيل مأمورية جديدة"}
          </span>
        </div>
      }
      onClose={onClose}
      footer={footer}
      panelClassName="max-w-[500px]"
    >
      <form id="mission-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Officer ID */}
          <div className="space-y-1.5">
            <label htmlFor="officerId" className="text-[10px] font-black uppercase text-slate-400 mr-1">معرف الضابط (ID)</label>
            <input
              id="officerId"
              type="text"
              required
              placeholder="أدخل معرف الضابط..."
              value={form.officerId}
              onChange={(e) => setForm({ ...form, officerId: e.target.value })}
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right"
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-[10px] font-black uppercase text-slate-400 mr-1">عنوان المأمورية</label>
            <input
              id="title"
              type="text"
              required
              placeholder="مثال: مأمورية خارجية، تدريب..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            {/* Start Date */}
            <DateField
              id="startDate"
              label="تاريخ البداية"
              value={form.startDate}
              onChange={(v) => setForm({ ...form, startDate: v })}
              required
            />

            {/* End Date */}
            <DateField
              id="endDate"
              label="تاريخ الانتهاء"
              value={form.endDate}
              onChange={(v) => setForm({ ...form, endDate: v })}
            />
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <label htmlFor="destination" className="text-[10px] font-black uppercase text-slate-400 mr-1">الجهة / الوجهة</label>
            <div className="relative">
              <input
                id="destination"
                type="text"
                placeholder="أدخل مآل المأمورية..."
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="w-full h-11 pr-10 pl-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right"
              />
              <MapPin className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label htmlFor="status" className="text-[10px] font-black uppercase text-slate-400 mr-1">حالة المأمورية</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as BaseMission["status"] })}
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="scheduled">مجدولة</option>
              <option value="active">نشطة</option>
              <option value="completed">منتهية</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-[10px] font-black uppercase text-slate-400 mr-1">ملاحظات</label>
            <textarea
              id="description"
              placeholder="أي تفاصيل أخرى..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full min-h-[80px] p-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right resize-none"
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
