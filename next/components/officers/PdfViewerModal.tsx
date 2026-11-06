"use client";

import { useRef } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FileText, Download, Printer } from "lucide-react";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  title?: string;
}

export function PdfViewerModal({
  isOpen,
  onClose,
  fileUrl,
  title = "معاينة الملف",
}: PdfViewerModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (iframeRef.current) {
      const contentWindow = iframeRef.current.contentWindow;
      if (contentWindow) {
        contentWindow.focus();
        contentWindow.print();
      }
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    // Clean filename
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, "-");
    link.download = `${safeTitle}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ModalShell
      title={title}
      icon={<FileText className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-[85vw] md:max-w-5xl h-[92vh] border-(--app-border) shadow-depth-xl"
      bodyClassName="p-3 md:p-4 overflow-hidden flex-1 flex flex-col no-scrollbar"
      footer={
        <ModalActions
          mode="view"
          cancelText="إغلاق"
          onCancel={onClose}
          startSlot={
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary h-9 px-4 hidden sm:inline-flex items-center gap-2 text-xs font-bold"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المستند</span>
              </button>
              <button
                type="button"
                className="btn-primary h-9 px-4 inline-flex items-center gap-2 text-xs font-bold"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                <span>تحميل PDF</span>
              </button>
            </div>
          }
        />
      }
    >
      {/* Viewer Area */}
      <div className="flex-1 w-full rounded-2xl border border-(--app-border) bg-(--app-surface) shadow-sm overflow-hidden relative">
        <iframe
          ref={iframeRef}
          src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          className="h-full w-full border-none"
          title={title}
        />
      </div>
    </ModalShell>
  );
}
