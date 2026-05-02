"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, CheckCircle2 } from "lucide-react";

interface LeaveItem {
  id: string;
  officerId: string;
  officerName: string;
  officerMilitaryId: string;
  category: string;
  categoryLabel: string;
  type: string;
  typeLabel: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  statusLabel: string;
}

interface OfficerOption {
  id: string;
  fullName: string;
  militaryId: string;
}

interface LeaveRegisterProps {
  leaves: LeaveItem[];
  officers: OfficerOption[];
  canEdit: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LEAVE_TYPE_OPTIONS = [
  { value: "annual", label: "سنوية" },
  { value: "sick", label: "مرضية" },
  { value: "emergency", label: "طارئة" },
  { value: "rest", label: "راحة" },
  { value: "overnight", label: "مبيت" },
  { value: "field", label: "ميدانية" },
  { value: "casual", label: "عارضة" },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["approved", "cancelled"],
  approved: ["closed", "cancelled"],
};

const STATUS_CONFIG: Record<string, string> = {
  draft: "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)",
  approved: "bg-(--app-success)/10 border border-(--app-success)/20 text-(--app-success) font-bold",
  closed: "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)/60",
  cancelled: "bg-(--app-error)/10 border border-(--app-error)/20 text-(--app-error)",
};

export function LeaveRegister({ leaves, canEdit }: LeaveRegisterProps) {
  const router = useRouter();
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});

   const handleStatusChange = async (leaveId: string, newStatus: string) => {
     setStatusErrors((prev) => ({ ...prev, [leaveId]: "" }));
     try {
       const res = await fetch(`/api/arkan-harb/leaves/${leaveId}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ status: newStatus }),
       });

       const data = await res.json();
       if (!res.ok || !data.success) {
         setStatusErrors((prev) => ({ ...prev, [leaveId]: data.error || "فشل في تحديث الحالة" }));
         return;
       }

       router.refresh();
     } catch {
       setStatusErrors((prev) => ({ ...prev, [leaveId]: "حدث خطأ في الاتصال" }));
     }
   };

  return (
    <div className="space-y-6">

      {leaves.length === 0 ? (
        <div className="rounded-lg bg-(--app-surface) p-8 text-center text-(--app-muted-foreground)">
          لا توجد سجلات مؤرشفة في النظام
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-(--app-surface)">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-(--app-border) text-sm text-(--app-muted-foreground)">
                <th className="p-4">الضابط</th>
                <th className="p-4">التصنيف</th>
                <th className="p-4">النوع</th>
                <th className="p-4">الفترة الزمنية</th>
                <th className="p-4">الحالة الإدارية</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave) => (
                <tr key={leave.id} className="border-b border-(--app-border) transition hover:bg-white/10">
                  <td className="p-4">
                     <div className="flex flex-col">
                        <span className="text-(--color-primary) font-medium">{leave.officerName}</span>
                        <span className="text-sm font-mono text-(--app-muted-foreground)">{leave.officerMilitaryId}</span>
                     </div>
                  </td>
                  <td className="p-4">
                     <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${leave.category === "leave" ? "bg-(--color-primary)/10 border-(--color-primary)/20 text-(--color-primary)" : "bg-(--app-error)/10 border-(--app-error)/20 text-(--app-error)"}`}>
                      {leave.categoryLabel}
                     </span>
                  </td>
                  <td className="p-4 text-(--app-muted-foreground)">{leave.typeLabel}</td>
                  <td className="p-4 text-mono text-sm text-(--app-muted-foreground)">
                     <div className="flex items-center gap-2">
                       <span>{new Date(leave.startDate).toLocaleDateString("ar-EG")}</span>
                       <span className="opacity-30">―</span>
                       <span>{new Date(leave.endDate).toLocaleDateString("ar-EG")}</span>
                     </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      {canEdit && STATUS_TRANSITIONS[leave.status] ? (
                        <div className="relative inline-block w-full max-w-[140px]">
                          <select
                            value={leave.status}
                            onChange={(e) => handleStatusChange(leave.id, e.target.value)}
                            className={`w-full rounded-lg border px-3 py-1.5 text-xs font-medium appearance-none cursor-pointer focus:outline-none ${STATUS_CONFIG[leave.status] || STATUS_CONFIG.draft}`}
                          >
                            <option value={leave.status} className="bg-(--app-surface)">{leave.statusLabel}</option>
                            {STATUS_TRANSITIONS[leave.status].map((s) => (
                              <option key={s} value={s} className="bg-(--app-surface) text-(--color-primary)">
                                {s === "approved" ? "اعتماد السجل" : s === "closed" ? "إغلاق السجل" : "إلغاء السجل"}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className={`px-4 py-1.5 rounded-full text-xs font-medium border flex items-center justify-center gap-2 ${STATUS_CONFIG[leave.status] || STATUS_CONFIG.draft}`}>
                          {leave.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                          {leave.statusLabel}
                        </div>
                      )}
                      {statusErrors[leave.id] && (
                        <p className="mt-1 text-xs text-(--app-error)">{statusErrors[leave.id]}</p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
