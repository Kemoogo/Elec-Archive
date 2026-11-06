"use client";

import { useState } from "react";
import {
  Shield,
  Briefcase,
  User,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Eye,
  FileText,
  Search,
  Check,
  X,
  Layers,
  Sparkles,
  Award,
  Activity,
  Users,
  Building2,
  CreditCard,
  Hash,
  Calendar,
} from "lucide-react";
import {
  ModalShell,
  ModalHeaderCard,
  ModalSection,
  ModalBadge,
} from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { MonoBadge } from "@/components/ui/mono-badge";
import { DateField } from "@/components/ui/date-field";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { FormLabel, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { FolderTabs, type TabItem } from "@/components/ui/folder-tabs";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { LoadingState } from "@/components/ui/loading-state";
import { ActionButton } from "@/components/officers/OfficersTable";
import { ModernPageHeader as PageHeader, PrimaryHeaderBtn, SecondaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { useToast } from "@/components/ui/toast";

interface DemoTableRow {
  id: string;
  rank: string;
  name: string;
  department: string;
  role: string;
  status: "active" | "vacant";
}

export default function ThemePlaygroundPage() {
  const { showToast } = useToast();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoDate, setDemoDate] = useState("2026-08-28");
  const [inputVal, setInputVal] = useState("نص تجريبي");
  const [selectVal, setSelectVal] = useState("branch-1");
  const [customSelectVal, setCustomSelectVal] = useState("field");
  const [textareaVal, setTextareaVal] = useState("ملاحظات تجريبية موثقة وفق الهوية البصرية الموحدة.");

  const customSelectOptions: CustomSelectOption[] = [
    { value: "field", label: "ميدانية", description: "نظام الإجازات الميدانية الرسمية للضباط", badge: "افتراضي" },
    { value: "daily_sleep", label: "مبيت يومي", description: "تنفيذ الراحة الأسبوعية مباشرة دون طلب تصديق القائد", badge: "تلقائي" },
    { value: "weekly_rest", label: "راحة أسبوعية", description: "نظام الراحة الدورية لعناصر النوبتجيات بالوحدة" },
    { value: "annual", label: "سنوية اعتيادية", description: "رصيد الإجازات السنوية المستحقة قانوناً" },
  ];

  const branchOptions: CustomSelectOption[] = [
    { value: "branch-1", label: "فرع القيادة" },
    { value: "branch-2", label: "فرع التعليم" },
    { value: "branch-3", label: "فرع أركان حرب" },
  ];

  const demoData: DemoTableRow[] = [
    { id: "1", rank: "لواء أ ح", name: "احمد عبد اللطيف الجرف", department: "القيادة", role: "قائد المركز", status: "active" },
    { id: "2", rank: "عميد أ ح", name: "محمد ابراهيم السيد", department: "القيادة", role: "قائد ثان المركز", status: "active" },
    { id: "3", rank: "عقيد", name: "طارق محمود علي", department: "فرع التعليم", role: "رئيس فرع التعليم", status: "active" },
    { id: "4", rank: "---", name: "شاغر", department: "فرع التعليم", role: "مساعد رئيس الفرع", status: "vacant" },
  ];

  const demoColumns: TableColumn<DemoTableRow>[] = [
    {
      header: "الرتبة",
      accessor: "rank",
      className: "text-xs font-bold text-(--app-muted-foreground)",
    },
    {
      header: "الاسم والبيانات العسكرية",
      accessor: "name",
      render: (val, row) => (
        <span
          onClick={() => setIsDemoModalOpen(true)}
          className={`text-xs font-black ${
            row.status === "vacant"
              ? "text-(--app-muted-foreground)"
              : "text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer"
          }`}
        >
          {String(val)}
        </span>
      ),
    },
    {
      header: "الفرع / القسم",
      accessor: "department",
      className: "text-xs font-bold text-(--app-muted-foreground)",
    },
    {
      header: "الوظيفة",
      accessor: "role",
      render: (val) => <span className="font-bold text-xs text-(--app-muted-foreground)">{String(val)}</span>,
    },
    {
      header: "حالة التسكين",
      render: (_val, row) =>
        row.status === "active" ? (
          <ModalBadge icon={<CheckCircle2 className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
            مسكن
          </ModalBadge>
        ) : (
          <ModalBadge icon={<AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
            شاغر
          </ModalBadge>
        ),
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      render: (_val) => (
        <div className="flex items-center justify-center gap-1">
          <ActionButton
            icon={<Eye className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
            color="btn-action-primary"
            title="معاينة التفاصيل"
            onClick={() => setIsDemoModalOpen(true)}
          />
          <ActionButton
            icon={<Edit className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
            color="btn-action-primary"
            title="تعديل"
            onClick={() => {}}
          />
          <ActionButton
            icon={<Trash2 className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
            color="btn-action-primary"
            title="حذف"
            onClick={() => {}}
          />
        </div>
      ),
    },
  ];

  const playgroundTabs: TabItem[] = [
    {
      id: "modals",
      label: "المودالز والشاشات المنبثقة",
      icon: <Layers className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Live Component Preview */}
            <div className="p-6 bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-xs space-y-4">
              <h4 className="text-sm font-extrabold text-(--color-primary) border-b border-(--app-border) pb-2">
                المكونات الفرعية الجاهزة للمودال (`ModalHeaderCard` & `ModalSection` & `ModalBadge`)
              </h4>

              <ModalHeaderCard
                icon={<Briefcase className="w-6 h-6" />}
                title="قائد المركز (نموذج عنوان الوظيفة)"
                subtitle="الفرع / القسم: القيادة العامة"
                badge={
                  <ModalBadge icon={<AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
                    وظيفة بدون بديل
                  </ModalBadge>
                }
              />

              <ModalSection
                title="الضابط الأساسي المكلف بالوظيفة"
                badge={
                  <ModalBadge icon={<CheckCircle2 className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
                    مسكن
                  </ModalBadge>
                }
              >
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-bold text-(--app-muted-foreground) hover:underline hover:text-(--app-info) cursor-pointer">
                    لواء أ ح / احمد عبد اللطيف الجرف
                  </p>
                  <p className="text-[11px] font-bold text-(--app-muted-foreground)/80">
                    الرقم العسكري: 199823412 · الأقدمية: 1420
                  </p>
                </div>
              </ModalSection>

              <ModalSection
                title={
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-(--color-primary)" />
                    <span>الضباط البدلاء المسكنين</span>
                  </span>
                }
                badge={<span className="text-xs font-bold text-(--app-muted-foreground)">2 ضابط</span>}
              >
                <div className="flex flex-wrap gap-2 pt-1">
                  <ModalBadge icon={<User className="w-3.5 h-3.5 text-(--app-muted-foreground)" />}>
                    عميد أ ح / محمد ابراهيم
                  </ModalBadge>
                  <ModalBadge icon={<User className="w-3.5 h-3.5 text-(--app-muted-foreground)" />}>
                    عقيد / طارق محمود
                  </ModalBadge>
                </div>
              </ModalSection>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="btn-primary w-full justify-center text-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>فتح المودال الحي للتجربة والمعاينة</span>
                </button>
              </div>
            </div>

            {/* Architecture Guidelines */}
            <div className="p-6 bg-(--app-surface-container) border border-(--app-border) rounded-2xl shadow-xs space-y-4">
              <h4 className="text-sm font-extrabold text-(--color-primary) border-b border-(--app-border) pb-2">
                قواعد استخدام مكونات المودال (Centralized Rules)
              </h4>
              <div className="space-y-3 text-xs text-(--app-muted-foreground) font-bold leading-relaxed">
                <div className="p-3 bg-(--app-surface) rounded-xl border border-(--app-border)">
                  <span className="text-(--color-primary) font-black block mb-1">1. الحاوية الرئيسية:</span>
                  استخدام `ModalShell` فقط مع `overlayClassName=&apos;bg-black/40&apos;` (ممنوع backdrop-blur).
                </div>
                <div className="p-3 bg-(--app-surface) rounded-xl border border-(--app-border)">
                  <span className="text-(--color-primary) font-black block mb-1">2. كروت وبيانات الملخص:</span>
                  استخدام `ModalHeaderCard` و `ModalSection` (تأخذ تلقائياً `bg-(--color-primary)/5`).
                </div>
                <div className="p-3 bg-(--app-surface) rounded-xl border border-(--app-border)">
                  <span className="text-(--color-primary) font-black block mb-1">3. الشارات والعناصر الداخلية:</span>
                  استخدام `ModalBadge` (تأخذ تلقائياً `bg-(--app-surface-container)` مع `shadow-sm`).
                </div>
                <div className="p-3 bg-(--app-surface) rounded-xl border border-(--app-border)">
                  <span className="text-(--color-primary) font-black block mb-1">4. الأزرار والتذييل (ModalActions):</span>
                  استخدام `ModalActions` دائماً في تذييل المودال لتوحيد موقع الأزرار (الزر الأساسي في أقصى اليسار، والزر الثانوي بجواره، وزر الحذف أو العناصر المساعدة في أقصى اليمين، مع الالتزام بتسمية &apos;إلغاء&apos; لنماذج الإدخال و&apos;إغلاق&apos; لنوافذ العرض).
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "tables",
      label: "الجداول ومنظومة العرض",
      icon: <TableIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <SectionWrapper noPadding className="overflow-hidden rounded-2xl border border-(--app-border)/80 shadow-xs">
            <MainTable
              columns={demoColumns}
              data={demoData}
              showSerialNumber
              emptyTitle="لا توجد بيانات"
            />
          </SectionWrapper>
          <p className="text-xs font-bold text-(--app-muted-foreground) text-right">
            * الجداول تدعم الترقيم التلقائي، دمج الخلايا متعددة الصفوف (`rowSpan`)، تلميحات التحويم للأزرار، والتنقل السلس.
          </p>
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-black text-(--color-primary) text-right">
              مؤشر التحميل الموحد (`LoadingState` / `LoadingWrapper`)
            </h4>
            <LoadingState message="جاري تحميل جدول نوبتجيات الأسبوع..." />
          </div>
        </div>
      ),
    },
    {
      id: "forms",
      label: "النماذج والمدخلات",
      icon: <FileText className="w-4 h-4" />,
      content: (
        <div className="space-y-6 text-right">
          <div className="p-6 bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-xs grid grid-cols-1 md:grid-cols-2 gap-5 text-right">
            <div className="space-y-1.5">
              <FormLabel htmlFor="form-input-demo" required>
                حقل نصي قياسي (FormInput)
              </FormLabel>
              <FormInput
                id="form-input-demo"
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="أدخل النص هنا..."
              />
            </div>

            <div className="space-y-1.5">
              <CustomSelect
                id="custom-select-demo"
                label="قائمة اختيار حديثة موحدة (CustomSelect) — المعيار المعتمد"
                value={customSelectVal}
                onChange={setCustomSelectVal}
                options={customSelectOptions}
                required
              />
            </div>

            <div className="space-y-1.5">
              <DateField
                id="form-date-demo"
                label="حقل التاريخ الذكي (DateField)"
                value={demoDate}
                onChange={setDemoDate}
                required
              />
            </div>

            <CustomSelect
              id="form-select-demo"
              label="قائمة منسدلة قياسية (CustomSelect)"
              value={selectVal}
              onChange={setSelectVal}
              options={branchOptions}
            />

            <div className="space-y-1.5 md:col-span-2">
              <FormLabel htmlFor="form-textarea-demo">
                مربع نص متعدد الأسطر (FormTextarea)
              </FormLabel>
              <FormTextarea
                id="form-textarea-demo"
                value={textareaVal}
                onChange={(e) => setTextareaVal(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Form Rules Card */}
          <div className="p-5 bg-(--app-surface-container) border border-(--app-border) rounded-2xl space-y-2">
            <h5 className="text-xs font-black text-(--color-primary)">
              المعايير المعتمدة للمدخلات والقوائم المنسدلة:
            </h5>
            <ul className="list-disc list-inside text-xs font-bold text-(--app-muted-foreground) space-y-1">
              <li>
                <strong>CustomSelect:</strong> هي القائمة المنسدلة المعتمدة رسمياً للنظام، تدعم الشارات التوضيحية (Badges)، الوصف الإضافي (Description)، والتنقل عبر لوحة المفاتيح.
              </li>
              <li>
                <strong>DateField:</strong> المكون المعتمد لإدخال التواريخ الذكية مع التحقق والتنسيق التلقائي.
              </li>
              <li>
                <strong>حلقات التركيز:</strong> جميع الحقول تستخدم حلقة تركيز زرقاء ملكية موحدة: <code className="font-mono text-[11px] bg-(--app-surface) px-1.5 py-0.5 rounded border border-(--app-border)">focus:ring-blue-500/20 focus:border-blue-500</code>.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "buttons-badges",
      label: "الأزرار والشارات والتنبيهات",
      icon: <Award className="w-4 h-4" />,
      content: (
        <div className="space-y-6 text-right">
          {/* Buttons Showcase */}
          <div className="p-6 bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-xs space-y-4">
            <h4 className="text-xs font-black text-(--color-primary)">منظومة الأزرار المعتمدة</h4>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary">
                <Plus className="w-4 h-4" />
                <span>Primary Button (btn-primary)</span>
              </button>
              <button type="button" className="btn-secondary">
                <Search className="w-4 h-4" />
                <span>Secondary Button (btn-secondary)</span>
              </button>
              <button type="button" className="btn-destructive">
                <Trash2 className="w-4 h-4 text-white" />
                <span>Destructive Button (btn-destructive)</span>
              </button>
            </div>
          </div>

          {/* Badges Showcase */}
          <div className="p-6 bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-xs space-y-4">
            <h4 className="text-xs font-black text-(--color-primary)">منظومة الشارات والبطاقات (ModalBadge)</h4>
            <div className="flex flex-wrap items-center gap-3">
              <ModalBadge icon={<CheckCircle2 className="w-3.5 h-3.5 text-(--app-muted-foreground)" />}>
                شارة حالة (مسكن)
              </ModalBadge>
              <ModalBadge icon={<AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground)" />}>
                شارة تنبيه (شاغر)
              </ModalBadge>
              <ModalBadge icon={<User className="w-3.5 h-3.5 text-(--app-muted-foreground)" />}>
                شارة ضابط بديل
              </ModalBadge>
              <ModalBadge icon={<Building2 className="w-3.5 h-3.5 text-(--app-muted-foreground)" />}>
                شارة قسم / فرع
              </ModalBadge>
            </div>
          </div>

          {/* MonoBadge Showcase */}
          <div className="p-6 bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-xs space-y-4">
            <h4 className="text-xs font-black text-(--color-primary)">منظومة الأرقام والبيانات العسكرية (MonoBadge - font-mono)</h4>
            <div className="flex flex-wrap items-center gap-3">
              <MonoBadge
                label="الرقم العسكري"
                value="132488"
                icon={<CreditCard className="w-3.5 h-3.5" />}
                size="md"
              />
              <MonoBadge
                label="رقم الأقدمية"
                value="42627"
                icon={<Hash className="w-3.5 h-3.5" />}
                size="md"
              />
              <MonoBadge
                label="الدفعة"
                value="115"
                variant="primary"
                size="md"
              />
              <MonoBadge
                label="تاريخ التعيين"
                value="2026/05/12"
                icon={<Calendar className="w-3.5 h-3.5" />}
                variant="surface"
                size="md"
              />
              <MonoBadge
                label="كود القرار"
                value="#ORD-889"
                variant="muted"
                size="sm"
              />
            </div>
          </div>

          {/* Toast Notification Triggers */}
          <div className="p-6 bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-xs space-y-4">
            <h4 className="text-xs font-black text-(--color-primary)">اختبار التنبيهات المنبثقة (Toast Notifications)</h4>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => showToast("تم حفظ وتحديث البيانات بنجاح", "success")}
                className="btn-secondary text-xs"
              >
                <Check className="w-4 h-4 text-(--color-primary)" />
                <span>Toast نجاح (Success)</span>
              </button>
              <button
                type="button"
                onClick={() => showToast("حدث خطأ أثناء الاتصال بالخادم", "error")}
                className="btn-secondary text-xs"
              >
                <X className="w-4 h-4 text-(--color-primary)" />
                <span>Toast خطأ (Error)</span>
              </button>
              <button
                type="button"
                onClick={() => showToast("تنبيه: يرجى استكمال البيانات المطلوبة", "info")}
                className="btn-secondary text-xs"
              >
                <AlertTriangle className="w-4 h-4 text-(--color-primary)" />
                <span>Toast تنبيه (Warning/Info)</span>
              </button>
              <button
                type="button"
                onClick={() => showToast("معلومة: تم تطبيق التحديث في النظام", "info")}
                className="btn-secondary text-xs"
              >
                <Info className="w-4 h-4 text-(--color-primary)" />
                <span>Toast معلومة (Info)</span>
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "stats-cards",
      label: "الكروت والإحصائيات",
      icon: <Activity className="w-4 h-4" />,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-right">
          <StatCard
            icon={<Users className="w-6 h-6 text-(--color-primary)" />}
            title="إجمالي الضباط المسجلين"
            value="142"
            subtitle="ضابط على قوة المركز"
          />
          <StatCard
            icon={<CheckCircle2 className="w-6 h-6 text-(--color-primary)" />}
            title="الوظائف المسكنة"
            value="38"
            subtitle="وظيفة مأهولة حالياً"
          />
          <StatCard
            icon={<AlertCircle className="w-6 h-6 text-(--color-primary)" />}
            title="الوظائف الشاغرة"
            value="6"
            subtitle="تتطلب تسكين ضابط"
          />
          <StatCard
            icon={<Activity className="w-6 h-6 text-(--color-primary)" />}
            title="الزيارات الطبية اليومية"
            value="14"
            subtitle="كشف ومتابعة بالعيادة"
          />
        </div>
      ),
    },
    {
      id: "palette",
      label: "لوحة الألوان و Design Tokens",
      icon: <Sparkles className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <ColorSwatch name="Primary Navy" hex="#1E3C72" varName="--color-primary" />
            <ColorSwatch name="Primary Hover" hex="#2a5298" varName="--color-primary-hover" />
            <ColorSwatch name="Surface" hex="#ffffff" varName="--app-surface" />
            <ColorSwatch name="Surface Container" hex="#f1f5f9" varName="--app-surface-container" />
            <ColorSwatch name="Surface Low" hex="#f8fafc" varName="--app-surface-container-low" />
            <ColorSwatch name="Border" hex="#e2e8f0" varName="--app-border" />
            <ColorSwatch name="Muted FG" hex="#4a638c" varName="--app-muted-foreground" />
            <ColorSwatch name="Foreground" hex="#172b53" varName="--app-foreground" />
            <ColorSwatch name="Info Blue" hex="#3b82f6" varName="--app-info" />
            <ColorSwatch name="Success Green" hex="#10b981" varName="--app-success" />
            <ColorSwatch name="Error Red" hex="#ef4444" varName="--app-error" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div dir="rtl" className="space-y-8 pb-24">
      {/* Page Header */}
      <PageHeader
        icon={<Shield className="w-6 h-6" />}
        title="المرجع القياسي للتصميم والمكونات — Sapphire Archive Design System"
        subtitle="Single Source of Truth (SSOT) لكافة مكونات، ألوان، ومودالز النظام"
        actions={
          <div className="flex items-center gap-2">
            <SecondaryHeaderBtn
              label="معاينة المودال التفاعلي"
              icon={<Eye className="w-4 h-4" />}
              onClick={() => setIsDemoModalOpen(true)}
            />
            <PrimaryHeaderBtn
              label="إضافة عنصر جديد"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {}}
            />
          </div>
        }
      />

      {/* ===== INSTRUCTIONS BANNER ===== */}
      <div className="p-4 bg-(--color-primary)/5 border border-(--color-primary)/15 rounded-2xl shadow-xs text-right space-y-1.5">
        <h3 className="text-sm font-black text-(--color-primary) flex items-center gap-2">
          <Info className="w-4 h-4 text-(--color-primary)" />
          <span>المرجع الشامل والوحيد (SSOT) لكافة عناصر وتنسيقات النظام</span>
        </h3>
        <p className="text-xs text-(--app-muted-foreground) leading-relaxed font-bold">
          هذه الصفحة تمثل المرجع الأساسي الموحد لجميع المكونات البرمجية (`@/components/ui/`). لا يتم كتابة أي كود تنسيق مخصص (Custom Inline Styles) داخل الصفحات أو المودالز، بل يتم استخدام المكونات الجاهزة الموضحة أدناه فقط لضمان انعكاس أي تعديل مستقبلي تلقائياً على كامل المشروع.
        </p>
      </div>

      {/* ===== CENTRAL TABS SYSTEM ===== */}
      <FolderTabs tabs={playgroundTabs} initialTab="modals" />

      {/* ===== LIVE DEMO MODAL ===== */}
      {isDemoModalOpen && (
        <ModalShell
          title="معاينة حية لمودال قياسي موحد"
          icon={<Briefcase className="w-4 h-4" />}
          onClose={() => setIsDemoModalOpen(false)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 no-scrollbar"
          footer={
            <ModalActions
              mode="view"
              destructiveText="حذف الوظيفة"
              onDestructive={() => setIsDemoModalOpen(false)}
              submitText="تعديل الوظيفة"
              onConfirm={() => setIsDemoModalOpen(false)}
              onCancel={() => setIsDemoModalOpen(false)}
            />
          }
        >
          {/* Header Card */}
          <ModalHeaderCard
            icon={<Briefcase className="w-6 h-6" />}
            title="قائد المركز"
            subtitle="الفرع / القسم: القيادة العامة"
            badge={
              <ModalBadge icon={<AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
                وظيفة بدون بديل
              </ModalBadge>
            }
          />

          {/* Primary Officer Section */}
          <ModalSection
            title="الضابط الأساسي المكلف بالوظيفة"
            badge={
              <ModalBadge icon={<CheckCircle2 className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
                مسكن
              </ModalBadge>
            }
          >
            <div className="space-y-1 pt-1">
              <p className="text-xs font-bold text-(--app-muted-foreground) hover:underline hover:text-(--app-info) cursor-pointer">
                لواء أ ح / احمد عبد اللطيف الجرف
              </p>
              <p className="text-[11px] font-bold text-(--app-muted-foreground)/80">
                الرقم العسكري: 199823412 · الأقدمية: 1420
              </p>
            </div>
          </ModalSection>

          {/* Substitute Officers Section */}
          <ModalSection
            title={
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-(--color-primary)" />
                <span>الضباط البدلاء</span>
              </span>
            }
            badge={<span className="text-xs font-bold text-(--app-muted-foreground)">2 ضابط</span>}
          >
            <div className="flex flex-wrap gap-2 pt-1">
              <ModalBadge icon={<User className="w-3.5 h-3.5 text-(--app-muted-foreground)" />}>
                عميد أ ح / محمد ابراهيم
              </ModalBadge>
              <ModalBadge icon={<User className="w-3.5 h-3.5 text-(--app-muted-foreground)" />}>
                عقيد / طارق محمود
              </ModalBadge>
            </div>
          </ModalSection>
        </ModalShell>
      )}
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="p-4 bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-(--app-muted-foreground)">{title}</span>
        <div className="p-2 rounded-xl bg-(--color-primary)/5 border border-(--color-primary)/10">{icon}</div>
      </div>
      <div className="text-2xl font-black text-(--color-primary) font-mono tabular-nums">{value}</div>
      {subtitle && <p className="text-[11px] font-bold text-(--app-muted-foreground)/80">{subtitle}</p>}
    </div>
  );
}

function ColorSwatch({ name, hex, varName }: { name: string; hex: string; varName: string }) {
  return (
    <div className="p-3 bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-xs space-y-2">
      <div className="h-10 rounded-xl border border-(--app-border)" style={{ background: hex }} />
      <div>
        <p className="text-xs font-extrabold text-(--color-primary)">{name}</p>
        <p className="text-[10px] text-(--app-muted-foreground) font-mono">{varName}</p>
      </div>
    </div>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </svg>
  );
}
