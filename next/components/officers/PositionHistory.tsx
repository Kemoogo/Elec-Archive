"use client"

import * as React from "react"
import MainTable, { type TableColumn } from "@/components/ui/Table"
import { Badge } from "@/components/ui/badge"
import { POSITION_TYPE_LABELS, POSITION_STATUS_LABELS } from "@/lib/db/models/PositionAssignment.shared"
import { Loader2, Briefcase } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { extractApiError } from "@/lib/utils"

interface PositionAssignment {
  id: string
  positionTitle: string
  positionType: "primary" | "substitute"
  startDate: string | Date
  endDate?: string | Date | null
  status: "active" | "ended"
}

interface PositionHistoryProps {
  officerId: string
  initialData?: PositionAssignment[]
}

/**
 * مكون يعرض سجل التعيينات الوظيفية للضابط.
 * يدعم SSR عبر استقبال البيانات الأولية، أو يجلبها من API أركان الحرب إذا لم تتوفر.
 */
export function PositionHistory({ officerId, initialData }: PositionHistoryProps) {
  const [data, setData] = React.useState<PositionAssignment[]>(initialData || [])
  const [loading, setLoading] = React.useState(!initialData)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // تخطي الجلب التلقائي إذا تم توفير البيانات أولياً (SSR)
    if (initialData && data.length > 0) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        // جلب التعيينات مع زيادة الحد الأقصى لضمان عرض السجل بالكامل
        const response = await fetch(`/api/arkan-harb/positions?officerId=${officerId}&limit=100`)
        if (!response.ok) {
          throw new Error("فشل في تحميل سجل الوظائف")
        }
        const result = await response.json()
        if (result.success) {
          setData(result.data.items || [])
        } else {
          const errMsg = extractApiError(result, "فشل في تحميل سجل الوظائف");
          throw new Error(errMsg)
        }
      } catch (err) {
        console.error("Fetch error:", err)
        setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
      } finally {
        setLoading(false)
      }
    }

    if (officerId) {
      fetchData()
    }
  }, [officerId, initialData, data.length])

  const columns: TableColumn<PositionAssignment>[] = [
    {
      header: "مسمى الوظيفة",
      accessor: "positionTitle",
      cellAlign: "right",
    },
    {
      header: "النوع",
      cellAlign: "center",
      render: (_, row) => (
        <span className="text-xs font-medium">
          {POSITION_TYPE_LABELS[row.positionType] || row.positionType}
        </span>
      ),
    },
    {
      header: "من",
      accessor: "startDate",
      cellAlign: "center",
      isNumeric: true,
      render: (value) => value ? new Date(value as string).toLocaleDateString("ar-EG") : "-",
    },
    {
      header: "إلى",
      accessor: "endDate",
      cellAlign: "center",
      isNumeric: true,
      render: (value) => value ? new Date(value as string).toLocaleDateString("ar-EG") : "-",
    },
    {
      header: "الحالة",
      cellAlign: "center",
      render: (_, row) => (
        <Badge
          variant={row.status === "active" ? "default" : "outline"}
          className={row.status === "active" ? "bg-(--app-success) border-(--app-success) hover:bg-(--app-success)/90 text-white" : "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border)"}
        >
          {POSITION_STATUS_LABELS[row.status] || row.status}
        </Badge>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-(--app-border) bg-(--app-surface-container)/30">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-(--color-primary)" />
          <p className="text-sm text-(--app-muted-foreground) font-medium">جاري تحميل سجل الوظائف...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-(--app-error)/20 bg-(--app-error)/10 p-6 text-center">
        <p className="text-sm font-medium text-(--app-error)">{error}</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="لا يوجد سجل وظائف"
        description="لا يوجد سجل وظائف مسجل لهذا الضابط حتى الآن."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-(--app-surface-container) border border-(--app-border) rounded-lg">
            <Briefcase className="h-5 w-5 text-(--color-primary)" />
          </div>
          <h3 className="text-xl font-bold text-(--color-primary)">تاريخ التعيينات الوظيفية</h3>
        </div>
      </div>
      <MainTable
        columns={columns}
        data={data}
        showSerialNumber

      />
    </div>
  )
}
