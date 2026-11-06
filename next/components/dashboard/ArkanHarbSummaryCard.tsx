import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Spotlight } from "@/components/ui/spotlight";

interface ArkanHarbSummaryCardProps {
  rollcallSubmitted: boolean;
  activeCount: number;
  className?: string;
}

export function ArkanHarbSummaryCard({
  rollcallSubmitted,
  activeCount,
  className,
}: ArkanHarbSummaryCardProps) {
  return (
    <Link href="/arkan-harb" className="block h-full">
      <Spotlight className="h-full">
        <Card className={cn("cursor-pointer transition-all hover:shadow-md h-full", className)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">فرع أركان الحرب</CardTitle>
            <span className="text-2xl">⚔️</span>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {rollcallSubmitted ? (
                <span className="text-(--color-primary)">التمام مكتمل</span>
              ) : (
                <span className="text-(--app-muted-foreground)">التمام لم يكتمل</span>
              )}
            </div>
            <p className="text-sm text-(--app-muted-foreground)">
              {activeCount} مأمورية/إجازة نشطة اليوم
            </p>
          </CardContent>
        </Card>
      </Spotlight>
    </Link>
  );
}
