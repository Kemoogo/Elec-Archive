"use client";

import React, { useState } from "react";
import { OperateKpiStrip, type OperateKpiMetric } from "@/components/ui/operate-kpi-strip";
import { useToast } from "@/components/ui/toast";
import {
  Users,
  UserCheck,
  Calendar,
  FileSpreadsheet,
  GraduationCap,
  MapPin,
  Heart,
  ChevronLeft,
  RefreshCw,
  Send,
  Building2,
  Clock,
  Layers,
} from "lucide-react";
import {
  formatGovernorateDisplay,
  formatBloodTypeDisplay,
} from "@/lib/students/mappings";
import type { IStudentsAnalyticsData } from "@/types/student";

interface StudentsDashboardTabProps {
  initialAnalytics: IStudentsAnalyticsData;
  canEdit: boolean;
  onSelectQualification?: (qualification: string) => void;
  onSelectClassification?: (classificationId: string) => void;
  onSelectGovernorate?: (governorate: string) => void;
  onSelectBloodType?: (bloodType: string) => void;
  onNavigateToRollcall?: () => void;
  onNavigateToCurrentStage?: () => void;
  onOpenMdbUpload?: () => void;
}

export function StudentsDashboardTab({
  initialAnalytics,
  canEdit,
  onSelectQualification,
  onSelectClassification,
  onSelectGovernorate,
  onSelectBloodType,
  onNavigateToRollcall,
  onNavigateToCurrentStage,
  onOpenMdbUpload,
}: StudentsDashboardTabProps) {
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState<IStudentsAnalyticsData>(initialAnalytics);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/analytics?mrhla=${analytics.mrhla || ""}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل تحديث البيانات التحليلية", "error");
        return;
      }
      setAnalytics(data.data);
    } catch {
      showToast("خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  const totalOut = analytics.outOfficialCount + analytics.outDisciplinaryCount;

  // 1. Batch Arrival & Strength Flow Metrics (6 Core Metrics)
  const batchFlowMetrics: OperateKpiMetric[] = [
    {
      id: "target-count",
      label: "المقرر وصوله",
      value: analytics.targetCount || analytics.arrivedCount,
      unit: "جندي",
      subtitle: "القوة المخططة للدفعة",
      icon: <Users className="w-5 h-5 text-(--color-primary)" />,
      onClick: onNavigateToCurrentStage,
    },
    {
      id: "arrived-count",
      label: "ما تم وصوله",
      value: analytics.arrivedCount,
      unit: "جندي",
      subtitle: `المسجلين بالدفعة (${analytics.mrhlaName || ""})`,
      icon: <UserCheck className="w-5 h-5 text-(--color-primary)" />,
      onClick: onNavigateToCurrentStage,
    },
    {
      id: "remaining-count",
      label: "المتبقي للوصول",
      value: analytics.remainingCount,
      unit: "جندي",
      subtitle: analytics.remainingCount > 0 ? "متأخرين عن الوصول" : "اكتمل وصول القوة المخططة",
      icon: <Clock className="w-5 h-5 text-(--color-primary)" />,
    },
    {
      id: "in-unit-count",
      label: "لا زال بالوحدة (بالتدريب)",
      value: analytics.inUnitCount,
      unit: "طالب",
      subtitle: "القوة الصافية في طابور التمام",
      icon: <GraduationCap className="w-5 h-5 text-(--color-primary)" />,
      trend: {
        value: `${analytics.attendanceRate}%`,
        direction: "neutral",
        label: "نسبة الحضور الميداني",
      },
      onClick: onNavigateToCurrentStage,
    },
    {
      id: "relocated-count",
      label: "تم ترحيله لخارج الوحدة",
      value: analytics.relocatedCount,
      unit: "جندي",
      subtitle: "مرحلون بوحدات وتشكيلات أخرى",
      icon: <Send className="w-5 h-5 text-(--color-primary)" />,
      onClick: onNavigateToCurrentStage,
    },
    {
      id: "transferred-personnel-count",
      label: "انتقل لقوة أفراد الوحدة",
      value: analytics.transferredPersonnelCount,
      unit: "فرد",
      subtitle: "مسكنون كأفراد دائمين بالوحدة",
      icon: <Building2 className="w-5 h-5 text-(--color-primary)" />,
      onClick: onNavigateToCurrentStage,
    },
  ];

  // 2. Daily Rollcall Operating Metrics
  const rollcallMetrics: OperateKpiMetric[] = [
    {
      id: "rollcall-present",
      label: "الموجود الفعلي اليوم",
      value: analytics.presentCount,
      unit: "طالب",
      subtitle: `نسبة الحضور ${analytics.attendanceRate}%`,
      icon: <UserCheck className="w-5 h-5 text-(--color-primary)" />,
      progress: analytics.attendanceRate,
      onClick: onNavigateToRollcall,
    },
    {
      id: "rollcall-out-official",
      label: "الخوارج الرسمية والطبية",
      value: analytics.outOfficialCount,
      unit: "طالب",
      subtitle: "إجازات، عيادات، مستشفيات، اختبارات",
      icon: <Calendar className="w-5 h-5 text-(--color-primary)" />,
      onClick: onNavigateToRollcall,
    },
    {
      id: "rollcall-out-disc",
      label: "الخوارج الانضباطية",
      value: analytics.outDisciplinaryCount,
      unit: "طالب",
      subtitle: "غياب بدون إذن، حبس، محاكم",
      icon: <Clock className="w-5 h-5 text-(--color-primary)" />,
      onClick: onNavigateToRollcall,
    },
    {
      id: "rollcall-total-out",
      label: "إجمالي خوارج اليوم",
      value: totalOut,
      unit: "طالب",
      subtitle: "مستبعدين من طابور اليوم",
      icon: <Users className="w-5 h-5 text-(--color-primary)" />,
      onClick: onNavigateToRollcall,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-(--app-surface) p-4 rounded-2xl border border-(--app-border) shadow-depth-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-(--color-primary)/10 rounded-2xl border border-(--color-primary)/20 text-(--color-primary)">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-(--color-primary)">
              منظومة شئون الطلاب والدارسين
            </h2>
            <p className="text-xs font-bold text-(--app-muted-foreground)">
              المرحلة التجنيدية المعتمدة:{" "}
              <span className="text-(--app-foreground) font-black">
                {analytics.mrhlaName || "لا توجد مرحلة مسجلة"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && onOpenMdbUpload && (
            <button
              type="button"
              onClick={onOpenMdbUpload}
              className="btn-primary flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>استيراد ملف Access (.mdb)</span>
            </button>
          )}

          {onNavigateToRollcall && (
            <button
              type="button"
              onClick={onNavigateToRollcall}
              className="btn-secondary flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-(--color-primary)" />
              <span>التمام اليومي</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            title="تحديث المؤشرات"
            className="p-2 rounded-xl border border-(--app-border) hover:bg-(--app-surface-container) text-(--color-primary) hover:text-(--app-info) transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Empty State Onboarding Banner */}
      {analytics.arrivedCount === 0 && (
        <div className="bg-(--app-surface) p-8 rounded-2xl border border-(--app-border) text-center space-y-3">
          <div className="w-12 h-12 bg-(--color-primary)/10 text-(--color-primary) rounded-2xl flex items-center justify-center mx-auto border border-(--color-primary)/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-(--color-primary)">لم يتم استيراد بيانات طلبة حتى الآن</h3>
          <p className="text-xs font-bold text-(--app-muted-foreground max-w-md mx-auto">
            قم باستيراد ملف قاعدة بيانات Access (.mdb) لبدء متابعة تدفق وصول الدفعة، مصفوفة التصنيفات، التمام اليومي، وإحصائيات القوة.
          </p>
          {canEdit && onOpenMdbUpload && (
            <button
              type="button"
              onClick={onOpenMdbUpload}
              className="btn-primary inline-flex items-center gap-2 py-2 px-4 text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>استيراد ملف Access (.mdb) الآن</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Batch Arrival Flow KPI Strip */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-black text-(--color-primary)">
          <Users className="w-4 h-4" />
          <span>مسار تدفق وصول وقوة الدفعة ({analytics.mrhlaName})</span>
        </div>
        <OperateKpiStrip metrics={batchFlowMetrics} columns={6} isLoading={loading} />
      </div>

      {/* 2. Daily Rollcall Operating Strip */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-black text-(--color-primary)">
          <Calendar className="w-4 h-4" />
          <span>مؤشرات التمام اليومي للمتواجدين بالوحدة</span>
        </div>
        <OperateKpiStrip metrics={rollcallMetrics} columns={4} isLoading={loading} />
      </div>

      {/* 3. Classification & Qualification Matrix Panel */}
      <div className="bg-(--app-surface) p-5 rounded-2xl border border-(--app-border) shadow-depth-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-(--app-border)/60 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-(--color-primary)" />
            <h3 className="text-xs font-black text-(--color-primary)">
              مصفوفة التصنيفات التخصصية والمؤهلات الدراسية
            </h3>
          </div>
          <span className="text-[10px] font-bold text-(--app-muted-foreground)">
            إجمالي الدفعة: {analytics.arrivedCount} جندي
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-(--color-primary)/5 border-b border-(--app-border) text-(--color-primary) font-black">
                <th className="py-2.5 px-3">التصنيف التخصصي</th>
                <th className="py-2.5 px-3 text-center">إجمالي التصنيف</th>
                <th className="py-2.5 px-3 text-center">مؤهل عالٍ</th>
                <th className="py-2.5 px-3 text-center">فوق متوسط</th>
                <th className="py-2.5 px-3 text-center">متوسط</th>
                <th className="py-2.5 px-3 text-center">عادة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--app-border)/40 font-bold">
              {analytics.classificationsMatrix && analytics.classificationsMatrix.length > 0 ? (
                analytics.classificationsMatrix.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onSelectClassification?.(row.id)}
                    className="hover:bg-(--app-surface-container)/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 font-black text-(--color-primary) group-hover:underline">
                      {row.name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-(--color-primary)">
                      {row.total}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-(--app-muted-foreground)">
                      {row.high}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-(--app-muted-foreground)">
                      {row.aboveAvg}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-(--app-muted-foreground)">
                      {row.average}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-(--app-muted-foreground)">
                      {row.normal}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-(--app-muted-foreground)">
                    لا توجد تصنيفات مسجلة للدفعة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Geography and Blood Type Distribution Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Governorates Panel */}
        <div className="bg-(--app-surface) p-5 rounded-2xl border border-(--app-border) shadow-depth-sm space-y-4">
          <div className="flex items-center justify-between border-b border-(--app-border)/60 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-(--color-primary)" />
              <h3 className="text-xs font-black text-(--color-primary)">التوزيع الجغرافي (أعلى المحافظات)</h3>
            </div>
            <span className="text-[10px] font-bold text-(--app-muted-foreground)">
              {analytics.governorates.length} محافظة
            </span>
          </div>

          <div className="space-y-3">
            {analytics.governorates.length === 0 ? (
              <p className="text-xs text-center py-6 text-(--app-muted-foreground)">لا توجد بيانات مسجلة</p>
            ) : (
              analytics.governorates.map((g) => (
                <div
                  key={g.name}
                  onClick={() => onSelectGovernorate?.(g.name)}
                  className="group p-2.5 rounded-xl border border-(--app-border)/60 hover:border-(--color-primary)/30 hover:bg-(--color-primary)/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-(--app-foreground) group-hover:text-(--color-primary) transition-colors">
                      {formatGovernorateDisplay(g.name)}
                    </span>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold">
                      <span className="text-(--color-primary)">{g.count} طالب</span>
                      <span className="text-[10px] text-(--app-muted-foreground)">({g.percentage}%)</span>
                      <ChevronLeft className="w-3.5 h-3.5 text-(--app-muted-foreground) group-hover:text-(--color-primary) transition-transform group-hover:-translate-x-0.5" />
                    </div>
                  </div>
                  <div className="w-full bg-(--app-surface-container) h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-(--color-primary) h-full rounded-full transition-all duration-500"
                      style={{ width: `${g.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Blood Types Panel */}
        <div className="bg-(--app-surface) p-5 rounded-2xl border border-(--app-border) shadow-depth-sm space-y-4">
          <div className="flex items-center justify-between border-b border-(--app-border)/60 pb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-(--color-primary)" />
              <h3 className="text-xs font-black text-(--color-primary)">توزيع فصائل الدم</h3>
            </div>
            <span className="text-[10px] font-bold text-(--app-muted-foreground)">
              {analytics.bloodTypes.length} فصائل
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {analytics.bloodTypes.length === 0 ? (
              <p className="col-span-4 text-xs text-center py-6 text-(--app-muted-foreground)">
                لا توجد بيانات مسجلة
              </p>
            ) : (
              analytics.bloodTypes.map((b) => (
                <div
                  key={b.type}
                  onClick={() => onSelectBloodType?.(b.type)}
                  className="group p-3 rounded-xl border border-(--app-border)/60 hover:border-(--color-primary)/30 hover:bg-(--color-primary)/5 transition-all text-center cursor-pointer space-y-1"
                >
                  <div className="text-sm font-mono font-black text-(--color-primary) group-hover:scale-110 transition-transform">
                    {formatBloodTypeDisplay(b.type)}
                  </div>
                  <div className="text-xs font-mono font-bold text-(--app-foreground)">
                    {b.count} طالب
                  </div>
                  <div className="text-[10px] font-mono text-(--app-muted-foreground)">
                    ({b.percentage}%)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
