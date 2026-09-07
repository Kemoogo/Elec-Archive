"use client";

import { useState } from "react";
import { LeaveRegister, type LeaveItem, type OfficerLeaveStatusRow } from "@/components/officers/LeaveRegister";
import { LeaveRequestModal, type OfficerOption } from "@/components/officers/LeaveRequestModal";
import { ModernPageHeader as PageHeader, PrimaryHeaderBtn, SecondaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { ScrollText, Plus, Filter } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface LeavesPageClientProps {
  officerRows: OfficerLeaveStatusRow[];
  officers: OfficerOption[];
  pendingRequests: LeaveItem[];
  canEdit: boolean;
  isCommander: boolean;
  hideHeader?: boolean;
}

export function LeavesPageClient({
  officerRows = [],
  officers = [],
  pendingRequests = [],
  canEdit,
  isCommander,
  hideHeader = false,
}: LeavesPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Active search query: either from header (URL search) or local header input
  const effectiveSearch = (searchParams.get("search") ?? searchQuery).trim().toLowerCase();

  // Toggle for requests only (like positions by-officer / by-position toggle)
  const showRequestsOnly = searchParams.get("requestsOnly") === "true";

  const toggleRequestsOnly = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (showRequestsOnly) {
      params.delete("requestsOnly");
    } else {
      params.set("requestsOnly", "true");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Filter officer rows by search query
  const filteredRows = (officerRows || []).filter((row) => {
    if (!effectiveSearch) return true;
    return (
      (row?.fullName && row.fullName.toLowerCase().includes(effectiveSearch)) ||
      (row?.militaryId && row.militaryId.toLowerCase().includes(effectiveSearch)) ||
      (row?.rankLabel && row.rankLabel.toLowerCase().includes(effectiveSearch)) ||
      (row?.defaultLeaveSystem && row.defaultLeaveSystem.toLowerCase().includes(effectiveSearch))
    );
  });

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <PageHeader
          title="سجل الإجازات والانقطاعات"
          icon={<ScrollText className="w-6 h-6" />}
          backHref="/arkan-harb"
          backLabel="أركان الحرب"
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="بحث باسم الضابط أو الرقم العسكري أو نظام الإجازة..."
          action={
            <div className="flex items-center gap-2">
              <SecondaryHeaderBtn
                label={showRequestsOnly ? "عرض كافة الضباط" : "عرض الطلبات فقط"}
                icon={<Filter className="w-4 h-4" />}
                onClick={toggleRequestsOnly}
              />
              {canEdit && (
                <PrimaryHeaderBtn
                  label="تقديم طلب إجازة"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsRequestModalOpen(true)}
                />
              )}
            </div>
          }
        />
      )}

      <LeaveRegister
        officers={officers}
        officerRows={filteredRows}
        pendingRequests={pendingRequests}
        canEdit={canEdit}
        isCommander={isCommander}
        showRequestsOnly={showRequestsOnly}
      />

      <LeaveRequestModal
        officers={officers}
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </div>
  );
}
