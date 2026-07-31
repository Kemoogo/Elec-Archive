"use client";

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { CreateUserModal } from "./create-user-modal";
import { EditUserModal } from "./edit-user-modal";
import MainTable, { TableColumn } from "@/components/ui/Table";

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
    const colors: Record<string, string> = {
      admin: "bg-(--app-error)/20 text-(--app-error)",
      commander: "bg-(--app-warning)/20 text-(--app-warning)",
      employee: "bg-(--app-info)/20 text-(--app-info)",
      viewer: "bg-(--app-border) text-foreground",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs ${colors[role] ?? colors.viewer}`}>
        {role}
      </span>
    );
  }

  const columns: TableColumn<UserSummary>[] = [
    {
      header: "اسم المستخدم",
      accessor: "username",
      tdClassName: "text-sm font-mono text-(--app-muted-foreground)",
    },
    {
      header: "الاسم",
      accessor: "fullName",
      tdClassName: "font-medium text-(--color-primary)",
    },
    {
      header: "الدور",
      accessor: "role",
      render: (role) => roleBadge(role as string),
    },
    {
      header: "القسم",
      accessor: "department",
      tdClassName: "text-(--app-muted-foreground)",
    },
    {
      header: "الحالة",
      render: (_, user) => (
        <div className="flex flex-col gap-1 items-start">
          {!user.isActive && (
            <span className="text-xs text-(--app-error)">معطل</span>
          )}
          {user.isLocked && (
            <span className="text-xs text-(--app-warning)">مقفل</span>
          )}
          {user.isActive && !user.isLocked && (
            <span className="text-xs text-(--app-success)">نشط</span>
          )}
        </div>
      ),
    },
    {
      header: "إجراءات",
      minWidth: true,
      cellAlign: "center",
      render: (_, user) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditingUser(user)}
            className="rounded bg-(--app-surface-container) px-2 py-1 text-xs text-(--app-muted-foreground) hover:bg-(--app-white)/10 hover:text-(--app-white)"
          >
            تعديل
          </button>
          {!user.isActive && (
            <button
              onClick={() => handleActivate(user.id)}
              className="rounded bg-(--app-success)/20 px-2 py-1 text-xs text-(--app-success) hover:bg-(--app-success)/30"
            >
              تفعيل
            </button>
          )}
          {user.isLocked && (
            <button
              onClick={() => handleUnlock(user.id)}
              className="rounded bg-(--app-warning)/20 px-2 py-1 text-xs text-(--app-warning) hover:bg-(--app-warning)/30"
            >
              فتح الحساب
            </button>
          )}
          {!user.isLocked && user.isActive && user.id !== currentUserId && (
            <button
              onClick={() => handleLock(user.id)}
              className="rounded bg-(--app-warning)/20 px-2 py-1 text-xs text-(--app-warning) hover:bg-(--app-warning)/30"
            >
              قفل
            </button>
          )}
          {user.isActive && user.id !== currentUserId && (
            <button
              onClick={() => handleDeactivate(user.id)}
              className="rounded bg-(--app-error)/20 px-2 py-1 text-xs text-(--app-error) hover:bg-(--app-error)/30"
            >
              تعطيل
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-(--app-muted-foreground)">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      <MainTable
        columns={columns}
        data={users}
        showSerialNumber
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
