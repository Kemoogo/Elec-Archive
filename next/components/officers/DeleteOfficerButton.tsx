"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";

export function DeleteOfficerButton({ officerId, officerLabel }: { officerId: string, officerLabel: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/officers/${officerId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("تم حذف الضابط بنجاح", "success");
        router.push("/officers");
        router.refresh();
      } else {
        const data = await res.json();
        const errorMsg = extractApiError(data, "فشل في حذف الضابط");
        showToast(errorMsg, "error");
        setLoading(false);
      }
    } catch {
      showToast("حدث خطأ في الاتصال بالخادم", "error");
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-destructive px-4 py-2 font-bold text-sm">
        <Trash2 className="w-4 h-4" />
        حذف الضابط
      </button>

      {open && (
        <ModalShell
          title="تأكيد الحذف"
          icon={<Trash2 className="w-4 h-4 text-(--app-error)" />}
          titleVariant="danger"
          onClose={() => setOpen(false)}
          footer={
            <ModalActions
              submitText="نعم، احذف الضابط"
              submitVariant="destructive"
              submitLoading={loading}
              onConfirm={handleDelete}
              cancelText="إلغاء"
              onCancel={() => setOpen(false)}
            />
          }
        >
          <div className="p-6">
            <p className="text-sm font-bold text-(--app-muted-foreground) font-sans">
              هل أنت متأكد من حذف الضابط <span className="text-(--app-error)">{officerLabel}</span>؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
          </div>
        </ModalShell>
      )}
    </>
  );
}
