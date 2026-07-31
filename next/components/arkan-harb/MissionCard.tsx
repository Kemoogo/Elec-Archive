import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeClass, getMissionStatusLabel } from "@/lib/utils/status-badge";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

// Helper function to format date for display
function formatDate(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ar-EG");
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
          >{getMissionStatusLabel(status)}</Badge>
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
            {getMissionStatusLabel(status)}
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