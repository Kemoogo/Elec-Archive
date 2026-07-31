"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download, Printer, X } from "lucide-react";

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[85vw] md:max-w-4xl h-[95vh] flex flex-col p-0 overflow-hidden bg-(--app-surface) border-(--app-border) shadow-2xl rounded-2xl"
        hideCloseButton
      >
        {/* Modern Header Layout */}
        <div className="flex items-center justify-between p-4 border-b border-(--app-border) bg-(--app-surface) shrink-0" dir="rtl">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-primary) text-white shadow-md shadow-blue-900/10 border border-(--color-primary)/20">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <DialogTitle className="text-lg font-black text-(--color-primary) truncate">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-(--app-muted-foreground) font-bold uppercase tracking-wider">
                ملف 121 ش.ض
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="btn-secondary h-10 px-5 hidden sm:flex"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              <span>طباعة المستند</span>
            </button>
            <button
              className="btn-primary h-10 px-5"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              <span>تحميل PDF</span>
            </button>

            <div className="w-px h-8 bg-(--app-border) mx-1 hidden sm:block" />

            <button
              onClick={onClose}
              className="p-2 hover:bg-(--app-surface-container) rounded-full transition-all active:scale-90 text-(--color-primary)"
              title="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Viewer Area */}
        <div className="flex-1 bg-(--app-surface-container)/30 p-4 md:p-6 overflow-hidden">
          <div className="h-full w-full rounded-2xl border border-(--app-border)/50 bg-(--app-surface) shadow-lg overflow-hidden relative ring-1 ring-black/5">
            <iframe
              ref={iframeRef}
              src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              className="h-full w-full border-none"
              title={title}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
