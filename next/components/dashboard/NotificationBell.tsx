"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Bell,
  BellOff,
  CheckCheck,
  FileText,
  Users,
  Calendar,
  AlertCircle,
  X,
  ChevronLeft,
  Clock,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  refId?: string;
  refModel?: string;
  createdAt: string;
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    function fetchCount() {
      if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
        return;
      }
      fetch("/api/notifications?limit=1")
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && typeof data.data?.unreadCount === "number") {
            setUnreadCount(data.data.unreadCount);
          }
        })
        .catch(() => {});
    }

    // Initial load
    fetchCount();

    // Setup periodic sync every 30 seconds as fallback only when SSE is disconnected
    const pollInterval = setInterval(fetchCount, 30000);

    function connect() {
      if (!isMounted) return;
      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        const eventSource = new EventSource("/api/notifications/stream");
        eventSourceRef.current = eventSource;

        eventSource.addEventListener("connected", (event) => {
          try {
            const data = JSON.parse(event.data);
            if (isMounted && typeof data.unreadCount === "number") {
              setUnreadCount(data.unreadCount);
            }
            retryCountRef.current = 0;
          } catch {
            // ignore parse errors
          }
        });

        eventSource.addEventListener("notification", (event) => {
          try {
            const data = JSON.parse(event.data);
            if (isMounted && !data.isRead) {
              setUnreadCount((prev) => prev + 1);
            }
          } catch {
            // ignore parse errors
          }
        });

        eventSource.onerror = () => {
          eventSource.close();
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          const delay = Math.min(2000 * Math.pow(1.5, retryCountRef.current), 30000);
          retryCountRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              connectRef.current?.();
            }
          }, delay);
        };
      } catch {
        // SSE not supported or network failure, rely on polling
      }
    }

    connectRef.current = connect;
    connect();

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-9 h-9 rounded-[var(--app-radius-xl)] bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 transition-all duration-300 ease-out active:scale-95 cursor-pointer shadow-xs"
        aria-label="الإشعارات والتنبيهات"
        title="التنبيهات"
      >
        {/* Hover Glow */}
        <span
          className="absolute inset-0 rounded-[var(--app-radius-xl)] opacity-0 group-hover:opacity-100
          transition-opacity duration-300
          bg-gradient-to-br from-white/20 to-transparent pointer-events-none"
        />

        {/* Bell Icon */}
        <span className="relative z-10 text-white/85 group-hover:text-white transition-colors duration-200">
          <Bell className="w-[18px] h-[18px]" />
        </span>

        {/* Sapphire Blue Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white/30 text-[10px] font-mono font-bold text-white shadow-md z-20 animate-in fade-in zoom-in duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Popover Dropdown adhering to Sapphire Archive */}
      {isOpen && (
        <NotificationPopover
          onClose={() => setIsOpen(false)}
          onUnreadCountChange={setUnreadCount}
        />
      )}
    </div>
  );
}

function NotificationPopover({
  onClose,
  onUnreadCountChange,
}: {
  onClose: () => void;
  onUnreadCountChange: (count: number | ((prev: number) => number)) => void;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetch("/api/notifications?page=1&limit=20")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setNotifications(data.data.notifications || []);
          setHasMore(1 < data.data.totalPages);
          onUnreadCountChange(data.data.unreadCount || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onUnreadCountChange]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    try {
      const res = await fetch(`/api/notifications?page=${nextPage}&limit=20`);
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications((prev) => [...prev, ...(data.data.notifications || [])]);
        setHasMore(nextPage < data.data.totalPages);
      }
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
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
    } finally {
      setMarkingAll(false);
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

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    onClose();

    // Contextual Routing
    switch (notification.type) {
      case "new_fax":
        if (notification.refId) {
          router.push(`/fax/${notification.refId}`);
        } else {
          router.push("/fax");
        }
        break;
      case "leave_decision":
      case "leave_request":
        router.push("/arkan-harb?tab=leaves");
        break;
      case "rollcall_submitted":
      case "rollcall_reminder":
      case "rollcall_approved":
        router.push("/arkan-harb?tab=rollcall");
        break;
      case "medicine_expiry":
      case "low_stock":
        router.push("/medical");
        break;
      case "officers_reminder":
        router.push("/officers");
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_fax":
        return <FileText className="w-4 h-4 text-(--color-primary)" />;
      case "rollcall_submitted":
      case "rollcall_approved":
      case "rollcall_reminder":
        return <Users className="w-4 h-4 text-(--color-primary)" />;
      case "leave_decision":
      case "leave_request":
        return <Calendar className="w-4 h-4 text-(--color-primary)" />;
      case "medicine_expiry":
      case "low_stock":
        return <AlertCircle className="w-4 h-4 text-(--color-primary)" />;
      default:
        return <Bell className="w-4 h-4 text-(--color-primary)" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      className="absolute left-0 top-full mt-2.5 w-[340px] sm:w-[400px] max-h-[540px] flex flex-col rounded-2xl bg-(--app-surface) backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-(--app-border) overflow-hidden z-60 origin-top-left transition-all duration-300"
      dir="rtl"
    >
      {/* Top Header Card */}
      <div className="p-3.5 px-4 bg-(--app-surface-container-low)/90 border-b border-(--app-border) flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-(--color-primary) rounded-xl text-white shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-(--app-foreground)">
                التنبيهات والإشعارات
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {unreadCount} جديد
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-(--app-muted-foreground)">
              سجل التنبيهات المباشرة لمنظومة الأرشيف
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="p-1.5 px-2 rounded-lg text-[11px] font-bold text-(--color-primary) hover:bg-(--app-surface-container) hover:underline flex items-center gap-1 transition-colors cursor-pointer"
              title="تحديد الكل كمقروء"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>قراءة الكل</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-(--app-muted-foreground) hover:text-(--app-foreground) hover:bg-(--app-surface-container) transition-colors cursor-pointer"
            aria-label="إغلاق"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-(--app-border)/40 no-scrollbar max-h-[380px]">
        {loading ? (
          <LoadingState message="جاري تحميل التنبيهات..." variant="inline" className="p-8" />
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-(--app-surface-container) flex items-center justify-center text-(--app-muted-foreground)/60 mx-auto">
              <BellOff className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-(--app-foreground)">
                لا توجد تنبيهات جديدة
              </p>
              <p className="text-[11px] font-bold text-(--app-muted-foreground)/80">
                أنت على اطلاع دائم بكافة التحديثات والمواقف الرسمية.
              </p>
            </div>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleNotificationClick(n)}
              className={`p-3.5 px-4 flex items-start gap-3 cursor-pointer transition-colors ${
                n.isRead
                  ? "hover:bg-(--app-surface-container)/60 opacity-80"
                  : "bg-blue-500/[0.04] hover:bg-(--app-surface-container)"
              }`}
            >
              {/* Type Icon Badge */}
              <div className="p-2 rounded-xl bg-(--app-surface) border border-(--app-border) shadow-xs shrink-0 mt-0.5">
                {getNotificationIcon(n.type)}
              </div>

              {/* Text Information */}
              <div className="flex-1 min-w-0 text-right space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-black truncate ${
                      n.isRead
                        ? "text-(--app-muted-foreground)"
                        : "text-(--app-foreground)"
                    }`}
                  >
                    {n.title}
                  </span>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 shadow-xs" />
                  )}
                </div>

                <p className="text-[11px] font-bold text-(--app-muted-foreground) line-clamp-2 leading-relaxed">
                  {n.body}
                </p>

                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-(--app-muted-foreground)/60 pt-0.5">
                  <Clock className="w-3 h-3 text-(--app-muted-foreground)/60" />
                  <span>
                    {format(new Date(n.createdAt), "p - yyyy/MM/dd", { locale: ar })}
                  </span>
                </div>
              </div>

              {/* Navigate Arrow */}
              <ChevronLeft className="w-4 h-4 text-(--app-muted-foreground)/40 shrink-0 self-center" />
            </div>
          ))
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-2.5 px-4 bg-(--app-surface-container-low)/60 border-t border-(--app-border) flex items-center justify-between shrink-0">
        {hasMore ? (
          <button
            onClick={loadMore}
            className="w-full py-1.5 text-center text-xs font-extrabold text-(--color-primary) hover:underline cursor-pointer"
          >
            تحميل المزيد من التنبيهات...
          </button>
        ) : (
          <button
            onClick={() => {
              onClose();
              router.push("/arkan-harb?tab=decisions");
            }}
            className="w-full py-1 text-center text-xs font-bold text-(--color-primary) hover:underline cursor-pointer flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-(--color-primary)" />
            <span>عرض سجل قرارات القائد والتنبيهات الكامل</span>
          </button>
        )}
      </div>
    </div>
  );
}
