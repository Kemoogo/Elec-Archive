import Link from "next/link";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/auth/audit";
import { Fax } from "@/lib/db/models/Fax";
import { Officer } from "@/lib/db/models/Officer";
import { Mission } from "@/lib/db/models/Mission";
import { canMakeDecision, canCloseFax } from "@/lib/fax/access";
import { canEditModule } from "@/lib/auth/authorization";
import { formatOfficerRank, formatOfficerLabel } from "@/lib/db/models/Officer.shared";
import { FaxViewer } from "@/components/fax/FaxViewer";
import { CommanderDecision } from "@/components/fax/CommanderDecision";
import { FaxThread } from "@/components/fax/FaxThread";
import { FaxClosureForm } from "@/components/fax/FaxClosureForm";
import { ConvertFaxToMissionModal } from "@/components/fax/ConvertFaxToMissionModal";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";
import { formatDateDisplay } from "@/lib/utils/date-display";
import { Compass, ExternalLink } from "lucide-react";
import type { Types } from "mongoose";
import type { OfficerOption } from "@/types";

interface FaxDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FaxDetailPage({ params }: FaxDetailPageProps) {
  const auth = await authenticate();
  if (!auth.success) {
    redirect("/login");
  }

  const faxPermission = auth.user!.permissions.fax;
  if (faxPermission === "none") {
    redirect("/");
  }

  await connectToDatabase();

  const { id } = await params;

  const [fax, activeOfficers, linkedMissions] = await Promise.all([
    Fax.findById(id)
      .populate("uploadedBy", "fullName")
      .populate("forwardedToId", "fullName")
      .populate("closedBy", "fullName")
      .populate("relatedFaxes", "faxNumber date subject status")
      .lean(),
    Officer.find({ isInUnit: true, employmentStatus: "active" })
      .collation({ locale: "en", numericOrdering: true })
      .sort({ seniorityNumber: 1 })
      .lean(),
    Mission.find({
      $or: [{ linkedFax: id }, { linkedFaxId: id }],
    })
      .populate("officerId", "fullName rank isArkanHarb")
      .lean(),
  ]);

  if (!fax) {
    redirect("/fax");
  }

  await logAuditEvent({
    userId: auth.user!.id,
    userName: auth.user!.fullName,
    action: "VIEW",
    module: "fax",
    targetId: id,
    description: `عرض تفاصيل الفاكس رقم ${fax.faxNumber}`,
    ipAddress: "",
  });

  const populatedUploadedBy = fax.uploadedBy as { _id: Types.ObjectId; fullName: string } | null | undefined;
  const populatedForwardedTo = fax.forwardedToId as { _id: Types.ObjectId; fullName: string } | null;
  const populatedClosedBy = fax.closedBy as { _id: Types.ObjectId; fullName: string } | null;
  const populatedRelated = (fax.relatedFaxes ?? []) as Array<{ _id: Types.ObjectId; faxNumber: string; date: Date; subject: string; status: string }>;

  const statusLabels: Record<string, string> = {
    pending: "معلق",
    forwarded: "موجّه",
    closed: "مغلق",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20",
    forwarded: "bg-(--app-info)/10 text-(--app-info) border border-(--app-info)/20",
    closed: "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)",
  };

  const showDecisionForm = canMakeDecision(auth.user!);
  const showClosureForm = canCloseFax(auth.user!, fax);
  const canConvert =
    auth.user!.role === "admin" ||
    auth.user!.role === "commander" ||
    (canEditModule(auth.user!, "fax") && canEditModule(auth.user!, "arkan_harb"));

  const officersFormatted: OfficerOption[] = activeOfficers.map((o) => ({
    id: o._id.toString(),
    fullName: o.fullName,
    name: o.fullName,
    rank: formatOfficerRank(o.rank, o.isArkanHarb),
    officerLabel: formatOfficerLabel(o.fullName, o.rank, o.isArkanHarb),
    seniorityNumber: o.seniorityNumber,
    militaryId: o.militaryId,
  }));

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className="flex items-center gap-2 flex-wrap">
            <Link
              href="/fax"
              className="text-(--color-primary) hover:underline hover:text-blue-600 transition-colors"
            >
              الفاكسات والمكاتبات
            </Link>
            <span className="text-(--app-muted-foreground)/50 font-semibold">-</span>
            <span>فاكس رقم {fax.faxNumber} ({fax.subject})</span>
          </span>
        }
        description="عرض المستند الرقمي وتتبع التوجيهات وقرارات القيادة بشأن المكاتبة"
        action={
          <div className="flex items-center gap-3">
            {canConvert && (
              <ConvertFaxToMissionModal
                faxId={id}
                faxNumber={fax.faxNumber}
                faxSubject={fax.subject}
                faxFromEntity={fax.fromEntity}
                officers={officersFormatted}
              />
            )}
            <span
              className={`inline-block rounded-full px-4 py-1.5 text-xs font-bold ${statusColors[fax.status]}`}
            >
              {statusLabels[fax.status]}
            </span>
          </div>
        }
      />

      <div className="rounded-lg bg-(--app-surface) p-6 border border-(--app-border) shadow-xs">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-(--app-muted-foreground)">التاريخ:</span>
            <span className="mr-2 text-(--app-foreground)">
              {formatDateDisplay(fax.date)}
            </span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground)">الجهة المرسِلة:</span>
            <span className="mr-2 text-(--app-foreground)">{fax.fromEntity}</span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground)">الجهة المستقبِلة:</span>
            <span className="mr-2 text-(--app-foreground)">{fax.toEntity}</span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground)">الموضوع:</span>
            <span className="mr-2 text-(--app-foreground)">{fax.subject}</span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground)">رفعه:</span>
            <span className="mr-2 text-(--app-foreground)">{populatedUploadedBy?.fullName ?? "غير معروف"}</span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground)">تاريخ الرفع:</span>
            <span className="mr-2 text-(--app-foreground)">
              {new Date(fax.createdAt).toLocaleString("ar")}
            </span>
          </div>
        </div>

        {/* Linked Operations / Missions Banner */}
        {linkedMissions.length > 0 && (
          <div className="mt-5 p-4 rounded-xl bg-(--color-primary)/5 border border-(--color-primary)/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-(--color-primary)">
              <Compass className="w-4 h-4" />
              <span>مأموريات وتكليفات عملياتية مرتبطة بهذا الفاكس ({linkedMissions.length}):</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {linkedMissions.map((m) => {
                const off = m.officerId as { fullName?: string; rank?: string } | null;
                return (
                  <div
                    key={m._id.toString()}
                    className="flex items-center justify-between text-xs font-bold text-(--app-foreground) bg-(--app-surface) p-2.5 rounded-lg border border-(--app-border)"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-(--color-primary) font-black">{m.title}</span>
                      <span className="text-(--app-muted-foreground)">- المكلف: {off?.fullName || "ضابط غير معروف"}</span>
                      {m.travelOrderNumber && (
                        <span className="font-mono text-[11px] text-(--app-muted-foreground) bg-(--app-surface-container) px-2 py-0.5 rounded">
                          أمر تحرك: {m.travelOrderNumber}
                        </span>
                      )}
                    </span>
                    <Link
                      href="/arkan-harb?tab=missions"
                      className="text-xs font-bold text-(--color-primary) hover:underline flex items-center gap-1"
                    >
                      <span>عرض في العمليات</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {fax.commanderDecision && (
          <div className="mt-4 rounded-md bg-(--app-surface-container) p-4">
            <h3 className="font-medium text-(--app-foreground)">قرار القائد</h3>
            <p className="mt-1 text-foreground">{fax.commanderDecision}</p>
            {fax.commanderDecisionAt && (
              <p className="mt-1 text-xs text-(--app-muted-foreground)">
                {new Date(fax.commanderDecisionAt).toLocaleString("ar")}
              </p>
            )}
          </div>
        )}

        {fax.forwardedToType && (
          <div className="mt-4 rounded-md bg-(--app-surface-container) p-4">
            <h3 className="font-medium text-(--app-foreground)">توجيه</h3>
            <p className="mt-1 text-foreground">
              {fax.forwardedToType === "user" && populatedForwardedTo
                ? `موجّه إلى: ${populatedForwardedTo.fullName}`
                : fax.forwardedToType === "department"
                  ? `موجّه إلى قسم: ${fax.forwardedToDepartment}`
                  : ""}
            </p>
          </div>
        )}

        {populatedClosedBy && (
          <div className="mt-4 rounded-md bg-(--app-surface-container) p-4">
            <h3 className="font-medium text-(--app-foreground)">الإغلاق</h3>
            <p className="mt-1 text-foreground">
              أغلقه: {populatedClosedBy.fullName}
              {fax.closedAt && (
                <span className="mr-2 text-(--app-muted-foreground)">
                  في {new Date(fax.closedAt).toLocaleString("ar")}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <FaxViewer fileUrl={fax.fileUrl} fileType={fax.fileType} />

      <FaxThread
        relatedFaxes={populatedRelated.map((r) => ({
          _id: r._id.toString(),
          faxNumber: r.faxNumber,
          date: r.date?.toISOString() ?? new Date().toISOString(),
          subject: r.subject,
          status: r.status,
        }))}
        currentFaxId={id}
      />

      {showDecisionForm && (
        <CommanderDecision
          faxId={id}
          faxStatus={fax.status}
          userRole={auth.user!.role}
        />
      )}

      {showClosureForm && <FaxClosureForm faxId={id} canClose={showClosureForm} />}
    </PageContainer>
  );
}
