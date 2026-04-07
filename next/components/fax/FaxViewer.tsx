"use client";

interface FaxViewerProps {
  fileUrl: string;
  fileType: "pdf" | "image";
}

export function FaxViewer({ fileUrl, fileType }: FaxViewerProps) {
  if (fileType === "pdf") {
    return (
      <div className="h-[600px] w-full rounded-lg bg-(--app-surface)">
        <iframe
          src={fileUrl}
          className="h-full w-full rounded-lg"
          title="عرض ملف الفاكس"
        />
      </div>
    );
  }

  return (
    <div className="flex justify-center rounded-lg bg-(--app-surface) p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fileUrl}
        alt="ملف الفاكس"
        className="max-h-[600px] rounded-lg object-contain"
      />
    </div>
  );
}
