import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth/middleware";
import { connectToDatabase } from "@/lib/db/connect";
import { Officer } from "@/lib/db/models/Officer";
import { Promotion } from "@/lib/db/models/Promotion";
import { Mission } from "@/lib/db/models/Mission";
import { Leave } from "@/lib/db/models/Leave";
import { PositionAssignment } from "@/lib/db/models/PositionAssignment";
import { ServiceHistory } from "@/lib/db/models/ServiceHistory";
import { canViewOfficers, canEditOfficers } from "@/lib/officers/access";
import {
  serializeOfficerDetail,
  serializePositions,
  serializeLeaves,
  buildCareerTimeline,
  getOriginalJoinDate,
  type OfficerLean
} from "@/lib/officers/queries";
import { OfficerForm } from "@/components/officers/OfficerForm";
import { DeleteOfficerButton } from "@/components/officers/DeleteOfficerButton";
import { OfficerDocuments } from "@/components/officers/OfficerDocuments";
import { OfficerPhotoUpload } from "@/components/officers/OfficerPhotoUpload";
import { LeaveRecordTab } from "@/components/officers/tabs/LeaveRecordTab";
import { CareerTimeline } from "@/components/officers/CareerTimeline";
import { PageContainer } from "@/components/layout/PageContainer";
import Link from "next/link";
import { ChevronLeft, User, Shield, Calendar, Phone, CreditCard, IdCard, History, LucideIcon, Hash, Tag, Swords, GraduationCap, Award, Activity, BookOpen, Users } from "lucide-react";

import { OfficerDetailTabs } from "@/components/officers/OfficerDetailTabs";
import { PositionHistory } from "@/components/officers/PositionHistory";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { MonoBadge } from "@/components/ui/mono-badge";


interface InfoItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}

function InfoItem({ icon: Icon, label, value, mono = false }: InfoItemProps) {
  return (
    <div className="group flex gap-4 p-4 rounded-xl transition-all hover:bg-(--color-primary)/5 border border-transparent hover:border-(--color-primary)/10 hover:shadow-sm">
      <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-(--app-surface-container) border border-(--app-border) group-hover:bg-(--color-primary) group-hover:border-(--color-primary) group-hover:shadow-lg group-hover:shadow-(--color-primary)/20 transition-all duration-300">
        <Icon className="h-5 w-5 text-(--app-muted-foreground) group-hover:text-white transition-all duration-300" />
      </div>
      <div className="flex flex-col justify-center gap-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-(--app-muted-foreground)/70 group-hover:text-(--color-primary)/80 transition-colors">{label}</span>
        <div className={`text-base font-bold text-(--color-primary) leading-tight ${mono ? 'font-mono tracking-tight' : ''}`}>{value}</div>
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
        <SectionWrapper className="inline-block mx-auto">
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
        </SectionWrapper>
      </div>
    );
  }

  const canEdit = canEditOfficers(user);
  const detail = serializeOfficerDetail(officer as Parameters<typeof serializeOfficerDetail>[0]);

  const [promotions, missions, positionAssignments, leaves, movements] = await Promise.all([
    Promotion.find({ officerId: id }).sort({ effectiveDate: -1 }).lean(),
    Mission.find({ officerId: id }).sort({ startDate: -1 }).lean(),
    PositionAssignment.find({ officerId: id }).sort({ startDate: -1 }).lean(),
    Leave.find({ officerId: id }).sort({ startDate: -1 }).limit(10).lean(),
    ServiceHistory.find({ officerId: id }).sort({ date: -1 }).lean(),
  ]);

  // Serialize data for components using centralized queries
  const officerLean = officer as unknown as OfficerLean;
  const serializedPositions = serializePositions(positionAssignments as unknown as Parameters<typeof serializePositions>[0]);
  const serializedLeaves = serializeLeaves(leaves as unknown as Parameters<typeof serializeLeaves>[0]);
  const timelineEvents = buildCareerTimeline(
    officerLean,
    promotions as unknown as Parameters<typeof buildCareerTimeline>[1],
    missions as unknown as Parameters<typeof buildCareerTimeline>[2],
    positionAssignments as unknown as Parameters<typeof buildCareerTimeline>[3],
    movements as unknown as Parameters<typeof buildCareerTimeline>[4]
  );

  // --- Logic Calculations ---
  const calculateAge = (birthDate?: string | Date) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(officer.birthDate);

  // Detect original joining date from movements using helper
  const { originalJoinDate, isRejoined } = getOriginalJoinDate(officer.joinDate, movements as unknown as Parameters<typeof getOriginalJoinDate>[1]);
  const currentJoinDate = new Date(officer.joinDate);

  const basicInfoTab = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <OfficerPhotoUpload
              officerId={detail.id}
              photoUrl={detail.photoUrl}
              canEdit={canEdit}
            />

            <div className="flex-1 space-y-6 pt-2">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1.5 bg-(--color-primary) text-white text-xs font-bold rounded-xl shadow-md cursor-default">
                    {detail.rankLabel}
                  </span>
                </div>
                <h1 className="text-4xl font-extrabold text-(--color-primary) tracking-tight">
                  {detail.fullName}
                </h1>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <MonoBadge
                  label="الرقم العسكري"
                  value={detail.militaryId}
                  icon={<CreditCard className="w-4 h-4" />}
                  size="lg"
                />
                <MonoBadge
                  label="رقم الأقدمية"
                  value={detail.seniorityNumber}
                  icon={<Hash className="w-4 h-4" />}
                  size="lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 mt-10 pt-10 border-t border-(--app-border)">
          <InfoItem icon={CreditCard} label="الرقم العسكري" value={detail.militaryId} mono />
          <InfoItem icon={Hash} label="رقم الأقدمية" value={detail.seniorityNumber} mono />
          <InfoItem icon={IdCard} label="الرقم القومى" value={detail.nationalId || "---"} mono />
          <InfoItem icon={Phone} label="رقم الهاتف" value={detail.phone || "---"} mono />
          <InfoItem icon={User} label="العمر" value={age ? `${age} عام` : "---"} mono />
          <InfoItem icon={History} label="تاريخ الميلاد" value={detail.birthDate ? new Date(detail.birthDate).toLocaleDateString("ar-EG") : "---"} mono />
          <InfoItem
            icon={Shield}
            label="الحالة الحالية"
            value={officer.isInUnit ? "قوة الوحدة" : "خارج الوحدة"}
          />
          <InfoItem icon={Tag} label="الدفعة" value={detail.batch || "---"} mono />
          <InfoItem icon={GraduationCap} label="الكلية / المعهد" value={detail.faculty || "---"} />
          <InfoItem icon={Award} label="تاريخ التخرج" value={detail.graduationDate ? new Date(detail.graduationDate).toLocaleDateString("ar-EG") : "---"} mono />
          <InfoItem icon={User} label="التصنيف" value={detail.typeLabel || "---"} />
          <InfoItem icon={Swords} label="السلاح" value={detail.weaponLabel || "---"} />
          <InfoItem icon={Activity} label="فصيلة الدم" value={detail.bloodType || "---"} mono />
          <InfoItem icon={BookOpen} label="الديانة" value={detail.religion || "---"} />
          <InfoItem icon={Users} label="الحالة الاجتماعية" value={detail.maritalStatus || "---"} />
          <InfoItem icon={Calendar} label="تاريخ الانضمام للوحدة" value={currentJoinDate.toLocaleDateString("ar-EG")} mono />

          {isRejoined && originalJoinDate && (
            <InfoItem icon={History} label="تاريخ أول انضمام" value={originalJoinDate.toLocaleDateString("ar-EG")} mono />
          )}
        </div>
      </div>

      <div className="space-y-8">
        <OfficerDocuments
          officerId={detail.id}
          file121Url={detail.file121Url}
          file121UpdatedAt={detail.file121UpdatedAt}
          file121IssueDate={detail.file121IssueDate}
          officerLabel={detail.officerLabel}
          canEdit={canEdit}
        />
      </div>
    </div>
  );

  const leavesTab = <LeaveRecordTab officerId={id} initialData={serializedLeaves} />;

  const careerTab = (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-2.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl">
          <History className="h-6 w-6 text-(--color-primary)" />
        </div>
        <h2 className="text-2xl font-extrabold text-(--color-primary)">مشاهدة السجل المهني</h2>
      </div>

      <CareerTimeline
        events={timelineEvents}
        officerName={detail.fullName}
      />
    </div>
  );

  return (
    <PageContainer className="max-w-[1400px] mx-auto pb-20">
      <OfficerDetailTabs
        officerLabel={detail.officerLabel}
        basicInfo={basicInfoTab}
        leaves={leavesTab}
        careerTimeline={careerTab}
        positionHistory={<PositionHistory officerId={id} initialData={serializedPositions} />}
        actions={canEdit && (
          <div className="flex items-center gap-2">
            <OfficerForm mode="edit" initialValues={detail} />
            <DeleteOfficerButton officerId={detail.id} officerLabel={detail.officerLabel} />
          </div>
        )}
        initialTab={tab}
      />
    </PageContainer>
  );
}
