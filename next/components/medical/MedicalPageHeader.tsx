"use client";

import { PageHeader } from "@/components/layout/ModernPageHeader";
import { Stethoscope, Filter } from "lucide-react";
import { NewVisitButton } from "./NewVisitButton";
import { NewMedicineButton } from "./NewMedicineButton";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { SecondaryHeaderBtn } from "@/components/layout/ModernPageHeader";
import { useState, useEffect } from "react";
import { FilterModal } from "./FilterModal";

interface MedicalPageHeaderProps {
  tab?: string;
  searchQuery: string;
}

export function MedicalPageHeader({ tab, searchQuery }: MedicalPageHeaderProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [showFilters, setShowFilters] = useState(false);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);

  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setLocalSearch(searchQuery);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (localSearch) {
        params.set("search", localSearch);
      } else {
        params.delete("search");
      }

      const newUrl = `${pathname}?${params.toString()}`;
      if (params.get("search") !== searchParams.get("search")) {
        replace(newUrl, { scroll: false });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, pathname, replace, searchParams]);

  const handleSearch = (term: string) => {
    setLocalSearch(term);
  };

  const TAB_DESCRIPTIONS: Record<string, string> = {
    visits: "سجل متابعة وإدارة ترددات المرضى وتوثيق الكشوفات والتشخيصات",
    patients: "بيانات المرضى والسجلات الطبية والفحوصات والاستشارات الطبية",
    medicines: "إدارة مخزون العيادة وصرف الأدوية وتتبع تواريخ الصلاحية والجرعات",
  };

  const currentDescription = (tab && TAB_DESCRIPTIONS[tab]) || "متابعة التردد على العيادة وتوافر الأدوية ومخزون الصيدلية";

  const title = tab ? (
    <span className="flex items-center gap-2 flex-wrap">
      <span
        className="cursor-pointer text-(--color-primary) hover:underline transition-opacity"
        onClick={() => replace(pathname)}
      >
        النقطة الطبية
      </span>
      <span className="text-(--app-muted-foreground)/50 font-semibold">-</span>
      <span>
        {tab === "visits" ? "زيارات العيادة" : tab === "patients" ? "سجل المرضى" : "الصيدلية والدواء"}
      </span>
    </span>
  ) : "النقطة الطبية";

  const actions = (
    <div className="flex gap-2 items-center">
      {tab && (
        <SecondaryHeaderBtn
          label="فلترة"
          icon={<Filter className="w-4 h-4" />}
          onClick={() => setShowFilters(true)}
        />
      )}

      {tab === "visits" && <NewVisitButton />}
      {tab === "medicines" && <NewMedicineButton />}
    </div>
  );

  return (
    <>
      <PageHeader
        title={title}
        description={currentDescription}
        icon={<Stethoscope className="w-6 h-6" />}
        showSearch={!!tab}
        searchQuery={localSearch}
        onSearchChange={handleSearch}
        searchPlaceholder={tab === "visits" ? "اسم المريض أو الرقم ..." : tab === "patients" ? "اسم المريض أو الرقم ..." : "بحث في الأدوية..."}
        actions={actions}
      />
      {showFilters && tab && (
        <FilterModal tab={tab} onClose={() => setShowFilters(false)} />
      )}
    </>
  );
}
