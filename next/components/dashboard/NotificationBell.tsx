"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const retryCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    function connect() {
      const eventSource = new EventSource("/api/notifications/stream");
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("connected", (event) => {
        try {
          const data = JSON.parse(event.data);
          setUnreadCount(data.unreadCount);
          if (retryCountRef.current > 0) {
            showToast("تم استعادة الاتصال بالإشعارات", "success");
          }
          retryCountRef.current = 0;
        } catch {
          // ignore parse errors
        }
      });

      eventSource.addEventListener("notification", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data.isRead) {
            setUnreadCount((prev) => prev + 1);
          }
        } catch {
          // ignore parse errors
        }
      });

      eventSource.onerror = () => {
        showToast("انقطع الاتصال بالإشعارات، جاري إعادة المحاولة...", "error");
        eventSource.close();

        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current += 1;

        setTimeout(() => {
          connectRef.current?.();
        }, delay);
      };
    }

    connectRef.current = connect;
    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [showToast]);

  useEffect(() => {
    fetch("/api/notifications?limit=1")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUnreadCount(data.data.unreadCount);
        }
      })
      .catch(() => {
        // fallback — SSE will provide count
      });
  }, []);

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-(--app-white) transition-colors hover:bg-white/15"
        aria-label="الإشعارات"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-(--app-error) text-xs font-bold text-(--app-white)">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <NotificationPanel
          onClose={() => setIsOpen(false)}
          onUnreadCountChange={setUnreadCount}
        />
      )}
    </div>
  );
}

function NotificationPanel({
  onClose,
  onUnreadCountChange,
}: {
  onClose: () => void;
  onUnreadCountChange: (count: number | ((prev: number) => number)) => void;
}) {
  const [notifications, setNotifications] = useState<
    Array<{
      _id: string;
      type: string;
      title: string;
      body: string;
      isRead: boolean;
      refId?: string;
      refModel?: string;
      createdAt: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetch("/api/notifications?page=1&limit=20")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNotifications(data.data.notifications);
          setHasMore(1 < data.data.totalPages);
          onUnreadCountChange(data.data.unreadCount);
        }
      })
      .finally(() => setLoading(false));
  }, [onUnreadCountChange]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    const res = await fetch(`/api/notifications?page=${nextPage}&limit=20`);
    const data = await res.json();
    if (data.success) {
      setNotifications((prev) => [...prev, ...data.data.notifications]);
      setHasMore(nextPage < data.data.totalPages);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        onUnreadCountChange(0);
      }
    } catch {
      // ignore
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notificationIds: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      onUnreadCountChange((prev: number) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-96 overflow-y-auto border-r border-(--app-border) bg-(--app-surface) shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-(--app-border) bg-(--app-surface) p-4">
          <h2 className="text-lg font-semibold text-(--app-white)">الإشعارات</h2>
          <div className="flex gap-2">
            <button
              onClick={markAllAsRead}
              className="text-sm text-(--app-info) hover:text-(--app-info)/80"
            >
              تعيين الكل كمقروء
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-(--app-muted-foreground) hover:bg-white/10 hover:text-(--app-white)"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-center text-(--app-muted-foreground)">جاري التحميل...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-(--app-muted-foreground)">
            لا توجد إشعارات جديدة
          </div>
        ) : (
          <div className="divide-y divide-(--app-border)">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`cursor-pointer p-4 transition hover:bg-white/10 ${
                  notification.isRead ? "opacity-60" : ""
                }`}
                onClick={() => {
                  if (!notification.isRead) {
                    markAsRead(notification._id);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {notification.type === "new_fax" && "📠"}
                    {notification.type === "rollcall_submitted" && "👥"}
                    {notification.type === "medicine_expiry" && "💊"}
                    {notification.type === "low_stock" && "⚠️"}
                    {notification.type === "officers_reminder" && "🔔"}
                    {notification.type === "rollcall_reminder" && "📢"}
                    {notification.type === "rollcall_approved" && "✅"}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-(--app-white)">{notification.title}</p>
                    <p className="mt-1 text-sm text-(--app-muted-foreground)">{notification.body}</p>
                    <p className="mt-1 text-xs text-(--app-muted-foreground)">
                      {new Date(notification.createdAt).toLocaleString("ar")}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <span className="h-2 w-2 rounded-full bg-(--app-info)" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <button
            onClick={loadMore}
            className="w-full border-t border-(--app-border) p-3 text-center text-sm text-(--app-info) hover:bg-white/10"
          >
            تحميل المزيد
          </button>
        )}
      </div>
    </>
  );
}
