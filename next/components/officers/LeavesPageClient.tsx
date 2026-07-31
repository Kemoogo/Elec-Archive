"use client";

import { useState } from "react";
import { LeaveRegister } from "@/components/officers/LeaveRegister";
import { LeaveAddModal } from "@/components/officers/LeaveAddModal";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { ScrollText } from "lucide-react";

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

interface OfficerItem {
  id: string;
  fullName: string;
  militaryId: string;
  rank?: string;
}

interface LeavesPageClientProps {
  initialLeaves: LeaveItem[];
  officers: OfficerItem[];
  canEdit: boolean;
  hideHeader?: boolean;
}

export function LeavesPageClient({
  initialLeaves,
  officers,
  canEdit,
  hideHeader = false,
}: LeavesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLeaves = initialLeaves.filter((leave) => {
    const search = searchQuery.toLowerCase();
    return (
      leave.officerName.toLowerCase().includes(search) ||
      leave.officerMilitaryId.toLowerCase().includes(search) ||
      leave.reason.toLowerCase().includes(search)
    );
  });

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12">
      {!hideHeader && (
        <PageHeader
          title="سجل الإجازات والغياب"
          icon={<ScrollText className="w-6 h-6" />}
          backHref="/arkan-harb"
          backLabel="أركان الحرب"
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="بحث باسم الضابط أو السبب..."
          action={canEdit && <LeaveAddModal officers={officers} />}
        />
      )}
      <LeaveRegister leaves={filteredLeaves} officers={officers} canEdit={canEdit} />
    </PageContainer>
  );
}
