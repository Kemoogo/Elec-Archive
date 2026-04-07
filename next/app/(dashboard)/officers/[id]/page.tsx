import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { Leave } from "@/lib/db/models/Leave";
import { Assignment } from "@/lib/db/models/Assignment";
import { canViewOfficers, canEditOfficers } from "@/lib/officers/access";
import { serializeOfficerDetail } from "@/lib/officers/queries";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from "@/lib/db/models/Leave";
import { ASSIGNMENT_TYPE_LABELS, ASSIGNMENT_STATUS_LABELS } from "@/lib/db/models/Assignment";
import { OfficerForm } from "@/components/officers/OfficerForm";
import { OfficerDocuments } from "@/components/officers/OfficerDocuments";
import { AssignmentTimeline } from "@/components/officers/AssignmentTimeline";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";
import Link from "next/link";
import { ChevronLeft, User, Shield, Briefcase, Calendar, Phone, CreditCard, Landmark, History, FileText, MapPin, LucideIcon, Hash, Tag, Swords } from "lucide-react";

interface InfoItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}

function InfoItem({ icon: Icon, label, value, mono = false }: InfoItemProps) {
  return (
    <div className="flex gap-4 p-4 rounded-lg transition-all hover:bg-(--app-surface-container)">
      <div className="p-3 bg-(--app-surface-container) rounded-lg border border-(--app-border)">
        <Icon className="h-4 w-4 text-(--app-muted-foreground)" />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium text-(--app-muted-foreground)">{label}</span>
        <div className={`text-base font-bold text-(--color-primary) ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
    </div>
  );
}

export default async function OfficerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const result = await authenticate();
  if (!result.success) {
    redirect("/login");
  }

  const user = result.user!;
  if (!canViewOfficers(user)) {
    redirect("/");
  }

  const { id } = await params;
  await connectToDatabase();

  const officer = await Officer.findById(id).lean();
  if (!officer) {
    return (
      <div className="max-w-[1200px] mx-auto space-y-8 pb-12 text-center py-20">
        <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6 inline-block mx-auto">
          <Shield className="h-16 w-16 text-(--app-muted-foreground)/20 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-(--color-primary) mb-4">السجل غير متوفر</h2>
          <p className="text-(--app-muted-foreground) mb-8">عذراً، لم نتمكن من العثور على الضابط المطلوب في قاعدة البيانات.</p>
          <Link 
            href="/officers" 
            className="inline-flex items-center gap-2 btn-primary px-6 py-2.5 rounded-lg font-bold"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
            العودة لقائمة الضباط
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = canEditOfficers(user);
  const detail = serializeOfficerDetail(officer as Parameters<typeof serializeOfficerDetail>[0]);

  const leaves = await Leave.find({ officerId: id })
    .sort({ startDate: -1 })
    .limit(10)
    .lean();

  const assignments = await Assignment.find({ officerId: id })
    .sort({ effectiveDate: -1 })
    .limit(10)
    .lean();

  return (
    <PageContainer className="max-w-[1400px] mx-auto pb-20">
      <PageHeader
        title={detail.fullName}
        backHref="/officers"
        backLabel="شئون الضباط"
        action={canEdit && <OfficerForm mode="edit" initialValues={detail} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6">
            <div className="p-8 pt-10">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-32 h-40 bg-(--app-surface-container) border border-(--app-border) rounded-lg flex items-center justify-center">
                    <User className="h-16 w-16 text-(--app-muted-foreground)/20" />
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                         <span className="px-3 py-1 btn-primary text-xs font-bold rounded-lg">
                          {detail.rankLabel}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                           detail.employmentStatus === 'active' ? 'bg-(--app-success)/10 text-(--app-success) border-(--app-success)/20' : 'bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)'
                        }`}>
                          {detail.employmentStatusLabel}
                        </span>
                      </div>
                      <h1 className="text-3xl font-bold text-(--color-primary)">
                        {detail.fullName}
                      </h1>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 pt-2">
                       <div className="flex items-center gap-2 px-4 py-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                          <MapPin className="h-4 w-4 text-(--color-primary)" />
                          <span className="text-sm font-bold text-(--app-muted-foreground)">{detail.unit}</span>
                       </div>
                       <div className="flex items-center gap-2 px-4 py-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                          <Briefcase className="h-4 w-4 text-(--color-primary)" />
                          <span className="text-sm font-bold text-(--app-muted-foreground)">{detail.position}</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 mt-8 pt-8 border-t border-(--app-border)">
                  <InfoItem icon={CreditCard} label="الرقم العسكري" value={detail.militaryId} mono />
                  <InfoItem icon={Hash} label="رقم الأقدمية" value={detail.seniorityNumber} mono />
                  <InfoItem icon={Landmark} label="الرقم القومى" value={detail.nationalId || "---"} mono />
                  <InfoItem icon={Phone} label="رقم التواصل" value={detail.phone || "---"} mono />
                  <InfoItem icon={Calendar} label="تاريخ الالتحاق" value={new Date(detail.joinDate).toLocaleDateString("ar-EG")} />
                  <InfoItem icon={History} label="تاريخ الميلاد" value={detail.birthDate ? new Date(detail.birthDate).toLocaleDateString("ar-EG") : "---"} />
                  <InfoItem icon={Briefcase} label="الحالة الحالية" value={detail.employmentStatusLabel} />
                  {detail.batch && <InfoItem icon={Tag} label="الدفعة" value={detail.batch} />}
                  {detail.typeLabel && <InfoItem icon={User} label="النوع" value={detail.typeLabel} />}
                  {detail.weaponLabel && <InfoItem icon={Swords} label="السلاح" value={detail.weaponLabel} />}
                </div>
              </div>
          </div>

          <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                  <FileText className="h-5 w-5 text-(--color-primary)" />
                </div>
                <h2 className="text-lg font-semibold text-(--color-primary)">بيان الإجازات والغيابات</h2>
              </div>
              <Link href="/officers/leaves" className="text-xs font-bold text-(--color-primary) hover:underline">عرض الكل ←</Link>
            </div>

            {leaves.length === 0 ? (
              <div className="rounded-lg bg-(--app-surface) p-8 text-center text-(--app-muted-foreground)">
                لا توجد سجلات إجازات مسجلة لهذا الضابط
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg bg-(--app-surface-container)">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-(--app-border) text-sm text-(--app-muted-foreground)">
                      <th className="p-4">النوع</th>
                      <th className="p-4">الفئة</th>
                      <th className="p-4">الفترة الزمنية</th>
                      <th className="p-4 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={String(leave._id)} className="border-b border-(--app-border) transition hover:bg-white/10">
                        <td className="p-4 font-bold text-(--color-primary)">
                          {LEAVE_TYPE_LABELS[leave.type as keyof typeof LEAVE_TYPE_LABELS] ?? leave.type}
                        </td>
                        <td className="p-4 font-medium text-(--app-muted-foreground)">
                          {leave.category === "leave" ? "إجازة" : "غياب"}
                        </td>
                        <td className="p-4 text-sm font-mono text-(--app-muted-foreground)">
                          <div className="flex items-center gap-2">
                            <span>{new Date(leave.startDate).toLocaleDateString("ar-EG")}</span>
                            <span className="text-(--app-muted-foreground)/30">―</span>
                            <span>{new Date(leave.endDate).toLocaleDateString("ar-EG")}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-block px-3 py-1 rounded-full bg-(--app-surface-container) border border-(--app-border) text-xs font-medium text-(--app-muted-foreground)">
                            {LEAVE_STATUS_LABELS[leave.status as keyof typeof LEAVE_STATUS_LABELS] ?? leave.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           {detail.file121Url && (
             <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
                   <FileText className="h-5 w-5 text-(--color-primary)" />
                 </div>
                 <h2 className="text-lg font-semibold text-(--color-primary)">ملف 121</h2>
               </div>
               <a
                 href={detail.file121Url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center gap-3 rounded-lg bg-(--app-surface-container) border border-(--app-border) p-3 hover:bg-(--app-surface-container)/80 transition"
               >
                 <FileText className="w-5 h-5 text-(--color-primary) shrink-0" />
                 <span className="text-sm font-medium text-(--color-primary)">عرض ملف 121</span>
               </a>
             </div>
           )}

           <OfficerDocuments officerId={detail.id} documents={detail.documents} canEdit={canEdit} />
           
           <AssignmentTimeline
            officerId={detail.id}
            canEdit={canEdit}
            assignments={assignments.map((a) => ({
              id: String(a._id),
              type: a.type,
              typeLabel: ASSIGNMENT_TYPE_LABELS[a.type as keyof typeof ASSIGNMENT_TYPE_LABELS] ?? a.type,
              title: a.title,
              description: a.description ?? "",
              effectiveDate: a.effectiveDate ? a.effectiveDate.toISOString() : new Date().toISOString(),
              endDate: a.endDate?.toISOString() ?? "",
              status: a.status,
              statusLabel: ASSIGNMENT_STATUS_LABELS[a.status as keyof typeof ASSIGNMENT_STATUS_LABELS] ?? a.status,
            }))}
          />
        </div>
      </div>
    </PageContainer>
  );
}