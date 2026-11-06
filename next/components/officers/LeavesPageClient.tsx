"use client";

import { useState, useMemo, useEffect } from "react";
import { LeaveRegister, type LeaveItem, type OfficerLeaveStatusRow } from "@/components/officers/LeaveRegister";
import { LeaveRequestModal } from "@/components/officers/LeaveRequestModal";
import type { OfficerOption } from "@/types/officer";
import { ModernPageHeader as PageHeader, PrimaryHeaderBtn, SecondaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { ScrollText, Plus, Filter } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface LeavesPageClientProps {
  officerRows: OfficerLeaveStatusRow[];
  officers: OfficerOption[];
  pendingRequests: LeaveItem[];
  canEdit: boolean;
  isCommander: boolean;
  isAdmin?: boolean;
  hideHeader?: boolean;
}

export function LeavesPageClient({
  officerRows = [],
  officers = [],
  pendingRequests = [],
  canEdit,
  isCommander,
  isAdmin = false,
  hideHeader = false,
}: LeavesPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  // Active search query: when header is hidden (inside ArkanHarbClient), use URL search; otherwise use local searchQuery
  const effectiveSearch = (hideHeader ? urlSearch : searchQuery).trim().toLowerCase();

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

  // Filter officer rows by search query (memoized to preserve reference stability)
  const filteredRows = useMemo(() => {
    return (officerRows || []).filter((row) => {
      if (!effectiveSearch) return true;
      return (
        (row?.fullName && row.fullName.toLowerCase().includes(effectiveSearch)) ||
        (row?.militaryId && row.militaryId.toLowerCase().includes(effectiveSearch)) ||
        (row?.rankLabel && row.rankLabel.toLowerCase().includes(effectiveSearch)) ||
        (row?.defaultLeaveSystem && row.defaultLeaveSystem.toLowerCase().includes(effectiveSearch))
      );
    });
  }, [officerRows, effectiveSearch]);

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
        isAdmin={isAdmin}
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
