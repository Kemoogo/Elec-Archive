import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

// Helper function to format date for display
function formatDate(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

// Helper function to get status badge class
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    case "active":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-slate-100 text-(--app-foreground)";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-(--app-foreground)";
  }
}

// Helper function to get status label in Arabic
function getStatusLabel(status: string): string {
  switch (status) {
    case "scheduled":
      return "مجدولة";
    case "active":
      return "نشطة";
    case "completed":
      return "مكتملة";
    case "cancelled":
      return "ملغاة";
    default:
      return status;
  }
}

interface MissionCardProps {
  officerName: string;
  missionTitle: string;
  description?: string;
  destination?: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  status: string;
}

export default function MissionCard({
  officerName,
  missionTitle,
  description,
  destination,
  startDate,
  endDate,
  status,
}: MissionCardProps) {
  return (
    <Card className="h-full border-[var(--color-primary)]">
      <CardHeader className="pb-4">
        <CardTitle className="text-(--color-primary) text-lg font-bold">
          {missionTitle}
        </CardTitle>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-(--app-muted-foreground) text-sm">
            الضابط: {officerName}
          </span>
          <Badge 
            variant="secondary"
            className={`${getStatusBadgeClass(status)} text-xs font-bold px-2 py-1`}
          >
            {getStatusLabel(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {description && (
          <div className="space-y-1">
            <p className="text-(--app-muted-foreground) text-sm font-medium">
              الوصف:
            </p>
            <p className="text-(--app-foreground) text-sm">
              {description}
            </p>
          </div>
        )}
        
        <div className="space-y-1">
          <p className="text-(--app-muted-foreground) text-sm font-medium">
            التاريخ:
          </p>
          <div className="text-(--app-foreground) text-sm">
            <span>
              من: {formatDate(startDate)}
            </span>
            {endDate && (
              <>
                <span className="mx-2">إلى:</span>
                <span>{formatDate(endDate)}</span>
              </>
            )}
          </div>
        </div>
        
        {destination && (
          <div className="space-y-1">
            <p className="text-(--app-muted-foreground) text-sm font-medium">
              الجهة:
            </p>
            <p className="text-(--app-foreground) text-sm">
              {destination}
            </p>
          </div>
        )}
        
        <div className="space-y-1">
          <p className="text-(--app-muted-foreground) text-sm font-medium">
            الحالة:
          </p>
          <div className="text-(--app-foreground) text-sm font-medium">
            {getStatusLabel(status)}
          </div>
        </div>
        
        {/* Show time elapsed for active/completed missions */}
        {(status === "active" || status === "completed") && (
          <div className="space-y-1">
            <p className="text-(--app-muted-foreground) text-sm font-medium">
              المدة:
            </p>
            <div className="text-(--app-foreground) text-sm font-medium">
              {formatDistanceToNow(new Date(startDate), { 
                addSuffix: true,
                locale: ar 
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}