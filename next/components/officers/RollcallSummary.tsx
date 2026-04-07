"use client";

import { CheckCircle2, XCircle, Calendar, Plane, History, UserCheck, ShieldCheck, Info, LucideIcon } from "lucide-react";

interface RollcallEntry {
  officerId: string;
  militaryId: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  status: string;
  note?: string;
}

interface RollcallSummaryData {
  date: string;
  status: string;
  targetOfficerCount: number;
  entries: RollcallEntry[];
  submittedAt: string;
  viewedByCommander: boolean;
}

interface RollcallSummaryProps {
  rollcall: RollcallSummaryData;
  isCommander: boolean;
}

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: LucideIcon }> = {
  present: { label: "حاضر", color: "bg-(--app-success)/10 text-(--app-success) border-(--app-success)/20", icon: UserCheck },
  absent: { label: "غائب", color: "bg-(--app-error)/10 text-(--app-error) border-(--app-error)/20", icon: XCircle },
  leave: { label: "إجازة", color: "bg-(--app-warning)/10 text-(--app-warning) border-(--app-warning)/20", icon: Calendar },
  mission: { label: "مأمورية", color: "bg-(--color-primary)/10 text-(--color-primary) border-(--color-primary)/20", icon: Plane },
};

export function RollcallSummary({ rollcall, isCommander }: RollcallSummaryProps) {
  const totals = {
    present: rollcall.entries.filter((e) => e.status === "present").length,
    absent: rollcall.entries.filter((e) => e.status === "absent").length,
    leave: rollcall.entries.filter((e) => e.status === "leave").length,
    mission: rollcall.entries.filter((e) => e.status === "mission").length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
              <ShieldCheck className="h-5 w-5 text-(--color-primary)" />
            </div>
            <h2 className="text-lg font-semibold text-(--color-primary)">تحليل التمام اليومي</h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-(--app-success)/10 text-(--app-success) border border-(--app-success)/20 rounded-full text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            تم الاعتماد
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(totals).map(([status, count]) => {
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            return (
              <div 
                key={status}
                className={`bg-(--app-surface-container) border p-4 rounded-lg transition-all`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Icon className="h-6 w-6 opacity-60" />
                  <div className="text-3xl font-bold">{count}</div>
                  <div className="text-xs font-medium opacity-60">{config.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-(--app-border) flex items-center gap-3 text-(--app-muted-foreground) text-xs font-medium">
          <History className="h-4 w-4" />
          <span>تم التوثيق في: {new Date(rollcall.submittedAt).toLocaleString("ar-EG")}</span>
        </div>
      </div>

      {isCommander && (
        <div className="bg-(--app-surface) border border-(--app-border) rounded-xl overflow-hidden">
          <div className="px-4 py-4 border-b border-(--app-border) flex items-center gap-3 bg-(--app-surface-container)">
             <Info className="h-5 w-5 text-(--color-primary)" />
             <h3 className="text-lg font-semibold text-(--color-primary)">كشف التفاصيل (للمراجعة)</h3>
          </div>
          
          <div className="overflow-x-auto rounded-b-xl bg-(--app-surface)">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-(--app-border) text-sm text-(--app-muted-foreground)">
                  <th className="p-4">البيانات الشخصية</th>
                  <th className="p-4">الرتبة</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {rollcall.entries.map((entry) => {
                  const config = STATUS_CONFIG[entry.status] || STATUS_CONFIG.present;
                  const StatusIcon = config.icon;
                  return (
                    <tr key={entry.officerId} className="border-b border-(--app-border) transition hover:bg-white/10">
                      <td className="p-4">
                         <div className="flex flex-col">
                            <span className="text-(--color-primary) font-bold">{entry.fullName}</span>
                            <span className="text-sm font-mono text-(--app-muted-foreground)">{entry.militaryId}</span>
                         </div>
                      </td>
                      <td className="p-4 text-(--app-muted-foreground)">
                        {entry.rankLabel}
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </td>
                      <td className="p-4 text-(--app-muted-foreground)">
                         {entry.note || "―"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
