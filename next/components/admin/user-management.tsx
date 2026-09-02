"use client";

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { CreateUserModal } from "./create-user-modal";
import { EditUserModal } from "./edit-user-modal";
import MainTable, { TableColumn } from "@/components/ui/Table";
import { Pencil, UserCheck, Unlock, Lock, UserX } from "lucide-react";

interface UserSummary {
  id: string;
  username: string;
  fullName: string;
  role: string;
  department: string;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
}

interface UserManagementProps {
  searchQuery?: string;
  onShowCreate?: () => void;
  onUsersFetched?: (users: UserSummary[]) => void;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  onClick?: () => void;
  placement?: "top" | "bottom";
}

function ActionButton({ icon, color, title, onClick, placement = "top" }: ActionButtonProps) {
  const isBottom = placement === "bottom";

  return (
    <div className="relative flex flex-col items-center group">
      <button
        type="button"
        onClick={onClick}
        className={`p-1.5 rounded-lg transition-all ${color} relative cursor-pointer`}
      >
        {icon}
      </button>
      {title && (
        <div
          className={`absolute left-0 z-50 w-max max-w-[220px] whitespace-normal bg-(--app-foreground) text-(--app-surface) text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xl hidden group-hover:block pointer-events-none border border-(--app-border)/20 ${
            isBottom ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          {title}
          <div
            className={`absolute left-3 -translate-x-1/2 border-x-4 border-x-transparent ${
              isBottom
                ? "bottom-full border-b-4 border-b-(--app-foreground)"
                : "top-full border-t-4 border-t-(--app-foreground)"
            }`}
          ></div>
        </div>
      )}
    </div>
  );
}

export const UserManagement = forwardRef<{ openCreateModal: () => void }, UserManagementProps>(({ searchQuery = "", onShowCreate }, ref) => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);

  useImperativeHandle(ref, () => ({
    openCreateModal: () => setShowCreate(true)
  }));

  // Link external trigger to internal state if provided
  useEffect(() => {
    if (onShowCreate) {
      // Logic handled by caller
    }
  }, [onShowCreate]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (search = "") => {
    try {
      setLoading(true);
      const url = search
        ? `/api/auth/users?search=${encodeURIComponent(search)}`
        : "/api/auth/users";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      showToast("فشل في تحميل المستخدمين", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Debounced search: fires 350ms after last keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, fetchUsers]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCurrentUserId(d.user.id); })
      .catch(() => { });
  }, []);

  async function handleDeactivate(id: string) {
    try {
      const res = await fetch(`/api/auth/users/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        const errorMsg = extractApiError(data, "فشل في تعطيل المستخدم");
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم تعطيل المستخدم بنجاح", "success");
      fetchUsers();
    } catch {
      showToast("حدث خطأ في الاتصال", "error");
    }
  }

  async function handleActivate(id: string) {
    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMsg = extractApiError(data, "فشل في تفعيل المستخدم");
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم تفعيل المستخدم بنجاح", "success");
      fetchUsers();
    } catch {
      showToast("حدث خطأ في الاتصال", "error");
    }
  }

  async function handleUnlock(id: string) {
    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: false }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMsg = extractApiError(data, "فشل في فتح الحساب");
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم فتح الحساب بنجاح", "success");
      fetchUsers();
    } catch {
      showToast("حدث خطأ في الاتصال", "error");
    }
  }

  async function handleLock(id: string) {
    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMsg = extractApiError(data, "فشل في قفل الحساب");
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم قفل الحساب بنجاح", "success");
      fetchUsers();
    } catch {
      showToast("حدث خطأ في الاتصال", "error");
    }
  }

  function roleBadge(role: string) {
    switch (role) {
      case "admin":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
            مسؤول النظام
          </span>
        );
      case "commander":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
            قائد
          </span>
        );
      case "employee":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20">
            موظف
          </span>
        );
      case "viewer":
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-600 border border-zinc-500/20">
            مستعرض
          </span>
        );
    }
  }

  const ROLE_PRIORITY: Record<string, number> = {
    admin: 1,
    commander: 2,
    employee: 3,
    viewer: 4,
  };

  const sortedUsers = [...users].sort((a, b) => {
    const priorityA = ROLE_PRIORITY[a.role] ?? 99;
    const priorityB = ROLE_PRIORITY[b.role] ?? 99;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const columns: TableColumn<UserSummary>[] = [
    {
      header: "اسم المستخدم",
      accessor: "username",
      tdClassName: "text-xs font-mono font-bold text-(--app-muted-foreground)",
    },
    {
      header: "الاسم",
      accessor: "fullName",
      render: (val, user) => (
        <button
          type="button"
          onClick={() => setEditingUser(user)}
          className="font-bold text-xs text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
        >
          {val as string}
        </button>
      ),
    },
    {
      header: "الدور",
      accessor: "role",
      render: (role) => roleBadge(role as string),
    },
    {
      header: "الفرع / القسم",
      accessor: "department",
      tdClassName: "text-xs font-bold text-(--app-muted-foreground)",
      emptyValue: "---",
    },
    {
      header: "الحالة",
      render: (_, user) => (
        <div className="flex items-center gap-1.5">
          {!user.isActive ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              معطل
            </span>
          ) : user.isLocked ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              مقفل
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              نشط
            </span>
          )}
        </div>
      ),
    },
    {
      header: "الإجراءات",
      accessor: "id",
      minWidth: true,
      cellAlign: "left",
      headerAlign: "center",
      render: (_, user) => {
        const isTopRow = sortedUsers.findIndex((u) => u.id === user.id) === 0;
        const placement = isTopRow ? "bottom" : "top";

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Edit User Button */}
            <ActionButton
              icon={<Pencil className="w-4 h-4 text-blue-500" />}
              color="btn-action-primary"
              title="تعديل بيانات وصلاحيات المستخدم"
              placement={placement}
              onClick={() => setEditingUser(user)}
            />

            {/* Activate / Reactivate Button */}
            {!user.isActive && (
              <ActionButton
                icon={<UserCheck className="w-4 h-4 text-emerald-600" />}
                color="btn-action-success"
                title="تفعيل الحساب"
                placement={placement}
                onClick={() => handleActivate(user.id)}
              />
            )}

            {/* Unlock Locked Account Button */}
            {user.isLocked && (
              <ActionButton
                icon={<Unlock className="w-4 h-4 text-amber-500" />}
                color="btn-action-warning"
                title="إلغاء قفل الحساب"
                placement={placement}
                onClick={() => handleUnlock(user.id)}
              />
            )}

            {/* Lock Account Button */}
            {!user.isLocked && user.isActive && user.id !== currentUserId && (
              <ActionButton
                icon={<Lock className="w-4 h-4 text-amber-600" />}
                color="btn-action-warning"
                title="قفل الحساب مؤقتاً"
                placement={placement}
                onClick={() => handleLock(user.id)}
              />
            )}

            {/* Deactivate User Button */}
            {user.isActive && user.id !== currentUserId && (
              <ActionButton
                icon={<UserX className="w-4 h-4 text-red-500" />}
                color="btn-action-danger"
                title="تعطيل الحساب"
                placement={placement}
                onClick={() => handleDeactivate(user.id)}
              />
            )}
          </div>
        );
      },
    },
  ];

  if (loading) {
    return <div className="text-(--app-muted-foreground)">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      <MainTable
        columns={columns}
        data={sortedUsers}
        showSerialNumber
        emptyTitle="لا يوجد مستخدمون"
        emptyDescription="لم يتم العثور على أي مستخدمين يطابقون معايير البحث"
      />

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            showToast("تم إنشاء المستخدم بنجاح", "success");
            fetchUsers();
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            showToast("تم تحديث المستخدم بنجاح", "success");
            fetchUsers();
          }}
        />
      )}
    </div>
  );
});

UserManagement.displayName = "UserManagement";
