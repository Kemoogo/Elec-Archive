"use client";

import { DateField } from "@/components/ui/date-field";

export function RollcallDateSelector({ initialDate }: { initialDate: string }) {
  const handleChange = (newDate: string) => {
    if (newDate && newDate.length === 10) {
      window.location.href = `/arkan-harb/rollcall?date=${newDate}`;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-(--color-muted)">تغيير التاريخ:</span>
      <DateField
        id="rollcall-date"
        label=""
        value={initialDate}
        onChange={handleChange}
        className="w-48"
      />
    </div>
  );
}
