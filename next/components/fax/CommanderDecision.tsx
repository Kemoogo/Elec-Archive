"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface CommanderDecisionProps {
  faxId: string;
  faxStatus: string;
  userRole: string;
}

export function CommanderDecision({ faxId, faxStatus, userRole }: CommanderDecisionProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState("");
  const [action, setAction] = useState<"forward" | "close">("forward");
  const [forwardToType, setForwardToType] = useState<"user" | "department">("user");
  const [forwardToId, setForwardToId] = useState("");
  const [forwardToDepartment, setForwardToDepartment] = useState("");

  if (userRole !== "commander" && userRole !== "admin") {
    return null;
  }

  if (faxStatus !== "pending") {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!decision.trim()) {
      showToast("يرجى كتابة نص القرار", "error");
      return;
    }

    if (action === "forward") {
      if (forwardToType === "user" && !forwardToId.trim()) {
        showToast("يرجى تحديد المستخدم الموجَّه إليه", "error");
        return;
      }
      if (forwardToType === "department" && !forwardToDepartment.trim()) {
        showToast("يرجى تحديد القسم الموجَّه إليه", "error");
        return;
      }
    }

    setLoading(true);

    try {
      const body: Record<string, string> = { decision, action };
      if (action === "forward") {
        body.forwardToType = forwardToType;
        if (forwardToType === "user") body.forwardToId = forwardToId;
        if (forwardToType === "department") body.forwardToDepartment = forwardToDepartment;
      }

      const res = await fetch(`/api/fax/${faxId}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        showToast(result.error ?? "حدث خطأ أثناء اتخاذ القرار", "error");
        return;
      }

      showToast("تم اتخاذ القرار بنجاح", "success");
      router.refresh();
    } catch {
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg bg-(--app-surface) p-6" dir="rtl">
      <h2 className="mb-4 text-lg font-semibold text-(--app-white)">قرار القائد</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="decision" className="block text-sm font-medium text-foreground">
            نص القرار
          </label>
          <textarea
            id="decision"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-white) placeholder-(--app-muted-foreground) focus:border-(--app-info) focus:outline-none"
            placeholder="اكتب قرارك هنا..."
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-foreground">
            <input
              type="radio"
              name="action"
              value="forward"
              checked={action === "forward"}
              onChange={() => setAction("forward")}
              className="text-(--app-info)"
            />
            توجيه
          </label>
          <label className="flex items-center gap-2 text-foreground">
            <input
              type="radio"
              name="action"
              value="close"
              checked={action === "close"}
              onChange={() => setAction("close")}
              className="text-(--app-info)"
            />
            إغلاق مباشر
          </label>
        </div>

        {action === "forward" && (
          <div className="space-y-3">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-foreground">
                <input
                  type="radio"
                  name="forwardToType"
                  value="user"
                  checked={forwardToType === "user"}
                  onChange={() => setForwardToType("user")}
                  className="text-(--app-info)"
                />
                توجيه لمستخدم
              </label>
              <label className="flex items-center gap-2 text-foreground">
                <input
                  type="radio"
                  name="forwardToType"
                  value="department"
                  checked={forwardToType === "department"}
                  onChange={() => setForwardToType("department")}
                  className="text-(--app-info)"
                />
                توجيه لقسم
              </label>
            </div>

            {forwardToType === "user" && (
              <input
                type="text"
                value={forwardToId}
                onChange={(e) => setForwardToId(e.target.value)}
                className="block w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-white) placeholder-(--app-muted-foreground) focus:border-(--app-info) focus:outline-none"
                placeholder="معرف المستخدم"
              />
            )}

            {forwardToType === "department" && (
              <input
                type="text"
                value={forwardToDepartment}
                onChange={(e) => setForwardToDepartment(e.target.value)}
                className="block w-full rounded-md border border-(--app-border) bg-(--app-surface) px-3 py-2 text-(--app-white) placeholder-(--app-muted-foreground) focus:border-(--app-info) focus:outline-none"
                placeholder="اسم القسم"
              />
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-(--app-accent) hover:bg-(--app-accent)/90 text-(--app-accent-foreground) font-medium px-4 py-2 disabled:opacity-50"
        >
          {loading ? "جاري التنفيذ..." : action === "forward" ? "توجيه الفاكس" : "إغلاق الفاكس"}
        </button>
      </form>
    </div>
  );
}
