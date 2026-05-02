import React from 'react';

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
    { label: "حاضر", value: present, color: "bg-green-500" },
    { label: "مأمورية", value: mission, color: "bg-yellow-500" },
    { label: "إجازة", value: leave, color: "bg-blue-500" },
    { label: "غياب", value: absent, color: "bg-red-500" },
  ];

  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-6 shadow-sm mb-8">
      <h3 className="text-sm font-black text-(--color-primary) mb-6">ملخص القائد (لوحة الموقف)</h3>
      
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <p className="text-sm text-slate-500">إجمالي القوة</p>
          <p className="text-2xl font-black text-(--app-foreground)">{totalOfficers}</p>
        </div>
        <div className="flex-1 mx-8 h-4 bg-slate-100 rounded-full flex overflow-hidden shadow-inner">
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
          <div key={stat.label} className="text-center p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
            <p className="font-bold text-(--app-foreground)">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
