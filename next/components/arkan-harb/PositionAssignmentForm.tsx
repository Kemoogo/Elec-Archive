"use client";

import { useState, useEffect } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { Building, ListPlus } from "lucide-react";

interface OfficerOption {
  id: string;
  name: string;
  rank: string;
  militaryId: string;
}

import { type Position } from "./PositionAssignmentTable";

interface PositionAssignmentFormProps {
  position: Position | null;
  officers: OfficerOption[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function PositionAssignmentForm({ position, officers, isOpen, onClose, onSave }: PositionAssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = !!position;

  const [form, setForm] = useState({
    officerId: "",
    positionTitle: "",
    positionType: "primary" as "primary" | "substitute",
    substituteForOfficerId: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    orderNumber: "",
    notes: "",
    status: "active" as "active" | "ended",
  });

  useEffect(() => {
    if (position && isOpen) {
      setForm({
        officerId: (position.officerId as string) || "",
        positionTitle: (position.positionTitle as string) || "",
        positionType: (position.positionType as "primary" | "substitute") || "primary",
        substituteForOfficerId: (position.substituteForOfficerId as string) || "",
        startDate: position.startDate ? new Date(position.startDate as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: position.endDate ? new Date(position.endDate as string).toISOString().split('T')[0] : "",
        orderNumber: (position.orderNumber as string) || "",
        notes: (position.notes as string) || "",
        status: (position.status as "active" | "ended") || "active",
      });
    } else if (!position && isOpen) {
      setForm({
        officerId: "",
        positionTitle: "",
        positionType: "primary",
        substituteForOfficerId: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        orderNumber: "",
        notes: "",
        status: "active",
      });
    }
    setError("");
  }, [position, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = isEditing 
        ? `/api/arkan-harb/positions/${position.id}` 
        : "/api/arkan-harb/positions";
      
      const method = isEditing ? "PATCH" : "POST";

      const payload = { ...form };
      if (payload.positionType === "primary") {
        payload.substituteForOfficerId = "";
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "فشل حفظ التعيين الوظيفي");
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
      submitText={isEditing ? "تحديث التعيين" : "حفظ التعيين"}
      submitLoading={loading}
      onCancel={onClose}
    />
  );

  return (
    <ModalShell
      title={
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isEditing ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
            <ListPlus className="h-4 w-4" />
          </div>
          <span className="text-base font-black text-(--app-foreground)">
            {isEditing ? "تعديل تعيين وظيفي" : "إضافة تعيين وظيفي جديد"}
          </span>
        </div>
      }
      onClose={onClose}
      footer={footer}
      panelClassName="max-w-[500px]"
    >
      <form id="position-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Officer ID */}
          <div className="space-y-1.5">
            <label htmlFor="officerId" className="text-[10px] font-black uppercase text-slate-400 mr-1">الضابط المعين</label>
            <select
              id="officerId"
              required
              value={form.officerId}
              onChange={(e) => setForm({ ...form, officerId: e.target.value })}
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
            >
              <option value="" disabled>اختر الضابط...</option>
              {officers.map(off => (
                <option key={off.id} value={off.id}>{off.rank} / {off.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Position Title */}
            <div className="space-y-1.5">
              <label htmlFor="positionTitle" className="text-[10px] font-black uppercase text-slate-400 mr-1">المسمى الوظيفي</label>
              <div className="relative">
                <input
                  id="positionTitle"
                  type="text"
                  required
                  placeholder="رئيس فرع، قائد..."
                  value={form.positionTitle}
                  onChange={(e) => setForm({ ...form, positionTitle: e.target.value })}
                  className="w-full h-11 pr-10 pl-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right"
                />
                <Building className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Position Type */}
            <div className="space-y-1.5">
              <label htmlFor="positionType" className="text-[10px] font-black uppercase text-slate-400 mr-1">نوع التعيين</label>
              <select
                id="positionType"
                required
                value={form.positionType}
                onChange={(e) => setForm({ ...form, positionType: e.target.value as "primary" | "substitute" })}
                className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
              >
                <option value="primary">أساسي</option>
                <option value="substitute">بديل</option>
              </select>
            </div>
          </div>

          {/* Substitute For Officer */}
          {form.positionType === "substitute" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
              <label htmlFor="substituteForOfficerId" className="text-[10px] font-black uppercase text-amber-500 mr-1">الضابط البديل عنه (الأصلي)</label>
              <select
                id="substituteForOfficerId"
                required
                value={form.substituteForOfficerId}
                onChange={(e) => setForm({ ...form, substituteForOfficerId: e.target.value })}
                className="w-full h-11 px-4 bg-amber-50/50 border border-amber-200 rounded-xl text-sm font-bold text-amber-900 focus:outline-none  focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none"
              >
                <option value="" disabled>اختر الضابط الأصلي...</option>
                {officers.filter(o => o.id !== form.officerId).map(off => (
                  <option key={off.id} value={off.id}>{off.rank} / {off.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
              label="تاريخ الانتهاء (اختياري)"
              value={form.endDate}
              onChange={(v) => setForm({ ...form, endDate: v })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Order Number */}
            <div className="space-y-1.5">
              <label htmlFor="orderNumber" className="text-[10px] font-black uppercase text-slate-400 mr-1">رقم الأمر (اختياري)</label>
              <input
                id="orderNumber"
                type="text"
                placeholder="أدخل رقم البند/الأمر"
                value={form.orderNumber}
                onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
                className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-[10px] font-black uppercase text-slate-400 mr-1">حالة التعيين</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "ended" })}
                className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
              >
                <option value="active">ساري</option>
                <option value="ended">منتهي</option>
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label htmlFor="notes" className="text-[10px] font-black uppercase text-slate-400 mr-1">ملاحظات (اختياري)</label>
            <textarea
              id="notes"
              placeholder="أي تفاصيل أخرى..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full min-h-[60px] p-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none  focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right resize-none"
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
