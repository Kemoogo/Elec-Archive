"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Info, 
  Unlock,
  History,
  UserCheck,
  Plane
} from "lucide-react";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { RollcallPrintReport } from "@/components/arkan-harb/RollcallPrintReport";
import { ROLLCALL_STATUS_LABELS, isRollcallPresent, computeRollcallBreakdown, type RollcallStatus } from "@/lib/db/models/DailyRollcall.shared";

interface RollcallEntry {
  officerId: string;
  militaryId: string;
  fullName: string;
  rank: string;
  rankLabel: string;
  status: string;
  note?: string;
  customReason?: string;
  attachedDestination?: string;
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
  isAdmin?: boolean;
}

export function RollcallSummary({ rollcall, isCommander: _isCommander, isAdmin = true }: RollcallSummaryProps) {
  const router = useRouter();
  const [isReopening, setIsReopening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const breakdown = computeRollcallBreakdown(
    rollcall.entries as unknown as Parameters<typeof computeRollcallBreakdown>[0]
  );

  const handleReopen = async () => {
    if (!confirm("هل أنت تأكد من إمكانية إعادة فتح كشف التمام اليومي للتعديل؟")) return;
    setIsReopening(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/arkan-harb/rollcall/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: rollcall.date }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشلت عملية إعادة التمام");
      }
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "حدث خطأ أثناء إعادة الفتح");
    } finally {
      setIsReopening(false);
    }
  };

  // Dynamic present breakdown items (count > 0 only)
  const presentItems = [
    { label: "داخل الوحدة", count: breakdown.present.insideUnit },
    { label: "مأمورية يومية", count: breakdown.present.dailyMission },
    { label: "عيادة", count: breakdown.present.clinic },
    { label: "أسباب أخرى (موجود)", count: breakdown.present.customPresent },
  ].filter((item) => item.count > 0);

  // Dynamic out breakdown items (count > 0 only)
  const outItems = [
    { label: "إجازة", count: breakdown.out.leave },
    { label: "مأمورية خارجية", count: breakdown.out.externalMission },
    { label: "فرقة", count: breakdown.out.course },
    { label: "راحة", count: breakdown.out.rest },
    { label: "غياب", count: breakdown.out.absence },
    { label: "ملحق", count: breakdown.out.attached },
    { label: "مستشفى", count: breakdown.out.hospital },
    { label: "أسباب أخرى (خارج)", count: breakdown.out.customOut },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-6">
      {/* Header Controls Bar */}
      <SectionWrapper>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-xs">
              <ShieldCheck className="h-6 w-6 text-(--color-primary)" />
            </div>
            <div>
              <h2 className="text-lg font-black text-(--color-primary)">سجل التمام اليومي المعتمد</h2>
              <p className="text-xs font-semibold text-(--app-muted-foreground)">ليوم {rollcall.date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RollcallPrintReport
              date={rollcall.date}
              entries={rollcall.entries.map((e) => ({
                officerId: String(e.officerId),
                status: e.status as import("@/lib/db/models/DailyRollcall.shared").RollcallStatus,
                note: e.note,
              }))}
              targetOfficerCount={rollcall.targetOfficerCount}
            />

            {isAdmin && (
              <button
                onClick={handleReopen}
                disabled={isReopening}
                className="px-3.5 py-2 bg-(--color-primary)/10 hover:bg-(--color-primary)/20 text-(--color-primary) border border-(--color-primary)/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                {isReopening ? "جاري الفتح..." : "إعادة فتح التمام للتعديل"}
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-600">
            {errorMsg}
          </div>
        )}
      </SectionWrapper>

      {/* TOP: Roster Detailed Table */}
      <SectionWrapper className="overflow-hidden">
        <div className="px-5 py-4 border-b border-(--app-border) flex items-center justify-between bg-(--app-surface-container-low)">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-(--color-primary)" />
            <h3 className="text-sm font-black text-(--color-primary)">كشف التمام اليومي التفصيلي للضباط</h3>
          </div>
          <span className="text-xs font-bold text-slate-500">إجمالي الضباط: {rollcall.targetOfficerCount}</span>
        </div>
        
        <div className="overflow-x-auto rounded-b-2xl border border-t-0 border-(--app-border) bg-(--app-surface)">
          <table className="w-full text-right text-sm">
            <thead className="bg-(--color-primary) text-white border-b border-(--app-border) text-xs font-bold">
              <tr>
                <th className="px-4 py-3 text-center w-10">م</th>
                <th className="px-5 py-3 text-center w-28">الرتبة</th>
                <th className="px-5 py-3 text-right">الاسم والبيانات العسكرية</th>
                <th className="px-5 py-3 text-center">حالة التمام</th>
                <th className="px-5 py-3 text-right">التفاصيل / الملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--app-border)/40">
              {rollcall.entries.map((entry, index) => {
                const isPresent = isRollcallPresent(entry.status as RollcallStatus);
                const statusLabel = ROLLCALL_STATUS_LABELS[entry.status as keyof typeof ROLLCALL_STATUS_LABELS] || entry.status;
                const detailsStr = entry.customReason || entry.attachedDestination || entry.note || "―";

                return (
                  <tr key={entry.officerId} className="border-b border-(--app-border)/40 transition hover:bg-(--app-surface-container)">
                    <td className="px-4 py-3 text-center font-mono text-xs font-bold text-(--app-muted-foreground)">
                      {index + 1}
                    </td>
                    <td className="px-5 py-3 text-center text-xs font-extrabold text-(--app-muted-foreground)">
                      {entry.rankLabel || entry.rank}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col text-right">
                        <span className="text-sm font-black text-(--color-primary)">{entry.fullName}</span>
                        <span className="text-xs font-mono text-(--app-muted-foreground)">رقم عسكري: #{entry.militaryId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border bg-(--app-surface-container) border-(--app-border) text-(--app-muted-foreground)">
                        <span>{statusLabel}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-(--app-muted-foreground)">
                      {detailsStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionWrapper>

      {/* BOTTOM: Military Breakdown Statistics Summary */}
      <SectionWrapper>
        <div className="mb-4 flex items-center justify-between border-b border-(--app-border) pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-(--color-primary)" />
            <h3 className="text-sm font-black text-(--color-primary)">ملخص موقف التمام العسكري</h3>
          </div>
          <span className="text-xs font-extrabold text-(--app-muted-foreground)">
            إجمالي القوة: {breakdown.totalOfficers} ضابط
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Present (الموجود) Card */}
          <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-black text-emerald-900">الموجود (داخل الوحدة والمهام اليومية)</span>
              </div>
              <span className="text-xl font-black text-emerald-700 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20">
                {breakdown.present.total}
              </span>
            </div>

            {presentItems.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {presentItems.map((item, idx) => (
                  <div key={idx} className="flex-1 min-w-[120px] p-3 bg-white/80 dark:bg-slate-900/50 rounded-xl border border-emerald-500/20 text-center">
                    <div className="text-xs text-slate-500 font-bold mb-1">{item.label}</div>
                    <div className="text-lg font-black text-emerald-800 dark:text-emerald-300">{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-xs font-bold text-emerald-600">
                لا يوجد ضباط متواجدين حالياً
              </div>
            )}
          </div>

          {/* Out (الخارج) Card */}
          <div className="p-5 bg-(--app-surface-container) border border-(--app-border) rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-(--app-border)/60 pb-3">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-(--color-primary)" />
                <span className="text-sm font-black text-(--app-foreground)">الخارج (الإجازات والمأموريات والخوارج)</span>
              </div>
              <span className="text-xl font-black text-(--app-foreground) bg-(--app-surface) px-3 py-0.5 rounded-full border border-(--app-border)">
                {breakdown.out.total}
              </span>
            </div>

            {outItems.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {outItems.map((item, idx) => (
                  <div key={idx} className="flex-1 min-w-[100px] p-2.5 bg-(--app-surface) rounded-xl border border-(--app-border) text-center">
                    <div className="text-[11px] text-(--app-muted-foreground) font-bold mb-0.5">{item.label}</div>
                    <div className="text-base font-black text-(--app-foreground)">{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-xs font-bold text-(--app-muted-foreground)">
                لا يوجد خوارج اليوم (جميع الضباط متواجدين بالوحدة)
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-(--app-border) flex items-center gap-3 text-(--app-muted-foreground) text-xs font-medium">
          <History className="h-4 w-4" />
          <span>تم التوثيق والاعتماد في: {rollcall.submittedAt ? new Date(rollcall.submittedAt).toLocaleString("ar-EG") : "مسودة"}</span>
        </div>
      </SectionWrapper>
    </div>
  );
}
