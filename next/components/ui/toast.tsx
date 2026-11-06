"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-100 flex flex-col items-end gap-2" dir="ltr">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            dir="rtl"
            onClick={() => dismiss(toast.id)}
            className={`relative cursor-pointer rounded-xl px-4 py-3 pr-10 text-sm font-bold shadow-xl transition-all max-w-md w-fit whitespace-normal break-words leading-relaxed text-right ${
              toast.type === "success"
                ? "bg-emerald-600 text-white border border-emerald-700"
                : toast.type === "error"
                ? "bg-red-600 text-white border border-red-700"
                : "bg-(--color-primary) text-white border border-(--color-primary-hover)"
            }`}
          >
            {toast.message}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismiss(toast.id);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-lg leading-none opacity-80 hover:opacity-100 cursor-pointer text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
