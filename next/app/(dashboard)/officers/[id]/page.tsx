import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer, RANK_LABELS } from "@/lib/db/models/Officer";
import { Promotion, type IPromotion } from "@/lib/db/models/Promotion";
import { Mission, type IMission } from "@/lib/db/models/Mission";
import { Leave, type ILeave } from "@/lib/db/models/Leave";
import { MISSION_STATUS_LABELS } from "@/lib/db/models/Mission.shared";
import { PositionAssignment, type IPositionAssignment } from "@/lib/db/models/PositionAssignment";
import { POSITION_STATUS_LABELS } from "@/lib/db/models/PositionAssignment.shared";
import { canViewOfficers, canEditOfficers } from "@/lib/officers/access";
import { serializeOfficerDetail } from "@/lib/officers/queries";
import { OfficerForm } from "@/components/officers/OfficerForm";
import { DeleteOfficerButton } from "@/components/officers/DeleteOfficerButton";
import { OfficerDocuments } from "@/components/officers/OfficerDocuments";
import { LeaveRecordTab } from "@/components/officers/tabs/LeaveRecordTab";
import { CareerTimeline, type TimelineEvent } from "@/components/officers/CareerTimeline";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";
import Link from "next/link";
import { ChevronLeft, User, Shield, Briefcase, Calendar, Phone, CreditCard, Landmark, History, FileText, MapPin, LucideIcon, Hash, Tag, Swords } from "lucide-react";

import { OfficerDetailTabs } from "@/components/officers/OfficerDetailTabs";
import { PositionHistory } from "@/components/officers/PositionHistory";


interface DBObject { 
  _id: { toString(): string };
}

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
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
  const { tab } = await searchParams;
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

  const [promotions, missions, positionAssignments, leaves] = await Promise.all([
    Promotion.find({ officerId: id }).sort({ effectiveDate: -1 }).lean(),
    Mission.find({ officerId: id }).sort({ startDate: -1 }).lean(),
    PositionAssignment.find({ officerId: id }).sort({ startDate: -1 }).lean(),
    Leave.find({ officerId: id }).sort({ startDate: -1 }).limit(10).lean(),
  ]);

  // Serialize data for components
  const serializedPositions = (positionAssignments as unknown as (IPositionAssignment & DBObject)[]).map(pa => ({
    id: pa._id.toString(),
    positionTitle: pa.positionTitle,
    positionType: pa.positionType,
    startDate: pa.startDate.toISOString(),
    endDate: pa.endDate?.toISOString() || null,
    status: pa.status,
  }));

  const serializedLeaves = (leaves as unknown as (ILeave & DBObject)[]).map(l => ({
    id: l._id.toString(),
    type: l.type,
    category: l.category,
    startDate: l.startDate.toISOString(),
    endDate: l.endDate.toISOString(),
    status: l.status,
  }));

  const timelineEvents: TimelineEvent[] = [
    {
      id: "join",
      type: "join",
      date: new Date(officer.joinDate),
      title: "الانضمام إلى الخدمة",
      description: `تم الانضمام برتبة ${RANK_LABELS[officer.rank as keyof typeof RANK_LABELS] || officer.rank}`,
    },
    ...(promotions as unknown as (IPromotion & DBObject)[]).map((p) => ({
      id: p._id.toString(),
      type: "promotion" as const,
      date: new Date(p.effectiveDate),
      title: `ترقية إلى ${RANK_LABELS[p.toRank as keyof typeof RANK_LABELS] || p.toRank}`,
      description: p.notes,
      badge: RANK_LABELS[p.fromRank as keyof typeof RANK_LABELS] ? `${RANK_LABELS[p.fromRank as keyof typeof RANK_LABELS]} ← ${RANK_LABELS[p.toRank as keyof typeof RANK_LABELS]}` : undefined,
    })),
    ...(missions as unknown as (IMission & DBObject)[]).map((m) => {
      const statusColors: Record<string, string> = {
        scheduled: "bg-amber-50 text-amber-700 border-amber-100",
        active: "bg-(--app-success)/10 text-(--app-success) border-(--app-success)/20",
        completed: "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)",
        cancelled: "bg-rose-50 text-rose-700 border-rose-100",
      };
      return {
        id: m._id.toString(),
        type: "mission" as const,
        date: new Date(m.startDate),
        endDate: m.endDate ? new Date(m.endDate) : undefined,
        title: m.title,
        description: m.description,
        statusLabel: MISSION_STATUS_LABELS[m.status as keyof typeof MISSION_STATUS_LABELS] || m.status,
        statusColor: statusColors[m.status],
      };
    }),
    ...(positionAssignments as unknown as (IPositionAssignment & DBObject)[]).map((pa) => {
        const isEnded = pa.status === 'ended';
        return {
          id: pa._id.toString(),
          type: "transfer" as const,
          date: new Date(pa.startDate),
          endDate: pa.endDate ? new Date(pa.endDate) : undefined,
          title: pa.positionTitle,
          description: pa.notes,
          statusLabel: POSITION_STATUS_LABELS[pa.status as keyof typeof POSITION_STATUS_LABELS] || pa.status,
          statusColor: isEnded ? "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)" : "bg-(--app-success)/10 text-(--app-success) border-(--app-success)/20",
          badge: pa.positionType === 'primary' ? 'أساسي' : 'بديل',
        };
    })
  ];

  const basicInfoTab = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6">
           <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
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

              {canEdit && (
                <div className="flex items-center gap-2">
                  <OfficerForm mode="edit" initialValues={detail} />
                  <DeleteOfficerButton officerId={detail.id} officerName={detail.fullName} />
                </div>
              )}
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
      </div>
    </div>
  );

  const leavesTab = <LeaveRecordTab officerId={id} initialData={serializedLeaves} />;

  const careerTab = (
    <div className="space-y-6">
      <div className="bg-(--app-surface) border border-(--app-border) rounded-xl p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
            <History className="h-5 w-5 text-(--color-primary)" />
          </div>
          <h2 className="text-xl font-bold text-(--color-primary)">مشاهدة السجل المهني</h2>
        </div>
        
        <CareerTimeline 
          events={timelineEvents} 
          officerName={detail.fullName} 
        />
      </div>
    </div>
  );

  return (
    <PageContainer className="max-w-[1400px] mx-auto pb-20">
      <PageHeader
        title={detail.fullName}
        backHref="/officers"
        backLabel="شئون الضباط"
      />

      <OfficerDetailTabs
        basicInfo={basicInfoTab}
        leaves={leavesTab}
        careerTimeline={careerTab}
        positionHistory={<PositionHistory officerId={id} initialData={serializedPositions} />}
        initialTab={tab}
      />
    </PageContainer>
  );
}
