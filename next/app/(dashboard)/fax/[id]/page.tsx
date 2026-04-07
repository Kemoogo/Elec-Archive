import { connectToDatabase } from "@/lib/db/connect";
import { authenticate } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/auth/audit";
import { Fax } from "@/lib/db/models/Fax";
import { canMakeDecision, canCloseFax } from "@/lib/fax/access";
import { FaxViewer } from "@/components/fax/FaxViewer";
import { CommanderDecision } from "@/components/fax/CommanderDecision";
import { FaxThread } from "@/components/fax/FaxThread";
import { FaxClosureForm } from "@/components/fax/FaxClosureForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/ModernPageHeader";
import type { Types } from "mongoose";

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
    redirect("/dashboard");
  }

  await connectToDatabase();

  const { id } = await params;

  const fax = await Fax.findById(id)
    .populate("uploadedBy", "fullName")
    .populate("forwardedToId", "fullName")
    .populate("closedBy", "fullName")
    .populate("relatedFaxes", "faxNumber date subject status")
    .lean();

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

  const populatedUploadedBy = fax.uploadedBy as { _id: Types.ObjectId; fullName: string };
  const populatedForwardedTo = fax.forwardedToId as { _id: Types.ObjectId; fullName: string } | null;
  const populatedClosedBy = fax.closedBy as { _id: Types.ObjectId; fullName: string } | null;
  const populatedRelated = (fax.relatedFaxes ?? []) as Array<{ _id: Types.ObjectId; faxNumber: string; date: Date; subject: string; status: string }>;

  const statusLabels: Record<string, string> = {
    pending: "معلق",
    forwarded: "موجّه",
    closed: "مغلق",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-(--app-warning)/20 text-(--app-warning)",
    forwarded: "bg-(--app-info)/20 text-(--app-info)",
    closed: "bg-(--app-success)/20 text-(--app-success)",
  };

  const showDecisionForm = canMakeDecision(auth.user!);
  const showClosureForm = canCloseFax(auth.user!, fax);

  return (
    <PageContainer>
      <PageHeader
        title={`فاكس رقم ${fax.faxNumber}`}
        backHref="/fax"
        backLabel="العودة للقائمة"
        action={
          <span
            className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${statusColors[fax.status]}`}
          >
            {statusLabels[fax.status]}
          </span>
        }
      />

      <div className="rounded-lg bg-(--app-surface) p-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-(--app-muted-foreground)">التاريخ:</span>
            <span className="mr-2 text-(--app-white)">
              {new Date(fax.date).toLocaleDateString("ar")}
            </span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground)">الجهة المرسِلة:</span>
            <span className="mr-2 text-(--app-white)">{fax.fromEntity}</span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground)">الجهة المستقبِلة:</span>
            <span className="mr-2 text-(--app-white)">{fax.toEntity}</span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground)">الموضوع:</span>
            <span className="mr-2 text-(--app-white)">{fax.subject}</span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground)">رفعه:</span>
            <span className="mr-2 text-(--app-white)">{populatedUploadedBy.fullName}</span>
          </div>
          <div>
            <span className="text-(--app-muted-foreground)">تاريخ الرفع:</span>
            <span className="mr-2 text-(--app-white)">
              {new Date(fax.createdAt).toLocaleString("ar")}
            </span>
          </div>
        </div>

        {fax.commanderDecision && (
          <div className="mt-4 rounded-md bg-(--app-surface) p-4">
            <h3 className="font-medium text-(--app-white)">قرار القائد</h3>
            <p className="mt-1 text-foreground">{fax.commanderDecision}</p>
            {fax.commanderDecisionAt && (
              <p className="mt-1 text-xs text-(--app-muted-foreground)">
                {new Date(fax.commanderDecisionAt).toLocaleString("ar")}
              </p>
            )}
          </div>
        )}

        {fax.forwardedToType && (
          <div className="mt-4 rounded-md bg-(--app-surface) p-4">
            <h3 className="font-medium text-(--app-white)">توجيه</h3>
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
          <div className="mt-4 rounded-md bg-(--app-surface) p-4">
            <h3 className="font-medium text-(--app-white)">الإغلاق</h3>
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
