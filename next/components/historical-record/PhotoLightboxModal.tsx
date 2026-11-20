"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";

interface PhotoLightboxModalProps {
  photos: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

export function PhotoLightboxModal({
  photos,
  initialIndex = 0,
  title = "معاينة الصور",
  onClose,
}: PhotoLightboxModalProps) {
  const safeInitial =
    initialIndex >= 0 && initialIndex < photos.length ? initialIndex : 0;
  const [currentIndex, setCurrentIndex] = useState(safeInitial);

  useEffect(() => {
    if (photos.length <= 1) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => (prev + 1) % photos.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos.length]);

  if (photos.length === 0) return null;

  const currentSrc = photos[currentIndex] ?? photos[0];

  return (
    <ModalShell
      title={`${title} (${currentIndex + 1} / ${photos.length})`}
      icon={<ImageIcon className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-4xl"
      footer={<ModalActions mode="view" onCancel={onClose} />}
    >
      <div className="space-y-4">
        <div className="relative bg-(--app-surface-container) border border-(--app-border) rounded-2xl overflow-hidden flex items-center justify-center min-h-[320px] max-h-[65vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={`${title} - صورة ${currentIndex + 1}`}
            className="max-h-[65vh] w-auto max-w-full object-contain select-none"
          />

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex(
                    (prev) => (prev - 1 + photos.length) % photos.length,
                  )
                }
                aria-label="الصورة السابقة"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-(--app-surface) border border-(--app-border) shadow-md flex items-center justify-center text-(--color-primary) hover:text-(--app-info) hover:bg-(--app-surface-container) transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev + 1) % photos.length)
                }
                aria-label="الصورة التالية"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-(--app-surface) border border-(--app-border) shadow-md flex items-center justify-center text-(--color-primary) hover:text-(--app-info) hover:bg-(--app-surface-container) transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {photos.map((src, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={`${src}-${idx}`}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? "border-(--color-primary) ring-2 ring-(--color-primary)/25"
                      : "border-(--app-border) opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`مصغرة ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
