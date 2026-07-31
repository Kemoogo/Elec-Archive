import React from 'react';
import { SectionWrapper } from "@/components/ui/section-wrapper";

interface Stat {
  label: string;
  value: number;
  color: string;
}

interface CommanderSummaryProps {
  totalOfficers: number;
  present: number;
  mission: number;
  leave: number;
  absent: number;
}

export const CommanderSummary: React.FC<CommanderSummaryProps> = ({
  totalOfficers,
  present,
  mission,
  leave,
  absent
}) => {
  const stats: Stat[] = [
    { label: "حاضر", value: present, color: "bg-(--app-success)" },
    { label: "مأمورية", value: mission, color: "bg-(--app-warning)" },
    { label: "إجازة", value: leave, color: "bg-(--app-info)" },
    { label: "غياب", value: absent, color: "bg-(--app-error)" },
  ];

  return (
    <SectionWrapper className="mb-8">
      <h3 className="text-sm font-black text-(--color-primary) mb-6">ملخص القائد (لوحة الموقف)</h3>
      
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <p className="text-sm text-(--app-muted-foreground) font-bold">إجمالي القوة</p>
          <p className="text-2xl font-black text-(--app-foreground)">{totalOfficers}</p>
        </div>
        <div className="flex-1 mx-8 h-4 bg-(--app-surface-container) rounded-full flex overflow-hidden shadow-inner">
          {stats.map((stat) => (
            <div 
              key={stat.label}
              className={`${stat.color} h-full transition-all`}
              style={{ width: `${totalOfficers > 0 ? (stat.value / totalOfficers) * 100 : 0}%` }}
              title={`${stat.label}: ${stat.value}`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center p-3 bg-(--app-surface-container-low) rounded-xl border border-(--app-border)/30">
            <p className="text-xs text-(--app-muted-foreground) font-black mb-1">{stat.label}</p>
            <p className="font-bold text-(--app-foreground)">{stat.value}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};
