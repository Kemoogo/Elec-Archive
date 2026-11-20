"use client";

import React, { useEffect, useMemo } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { FormLabel } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { validateHistoricalImageFile } from "@/lib/historical-record/client-files";
import { HISTORICAL_MAX_PHOTOS_PER_ITEM } from "@/types/historical-record";

interface MultiPhotoPickerProps {
  existingPhotos?: string[];
  keptPhotos?: string[];
  onToggleKeepPhoto?: (url: string) => void;
  newFiles: File[];
  onNewFilesChange: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
}

export function MultiPhotoPicker({
  existingPhotos = [],
  keptPhotos = [],
  onToggleKeepPhoto,
  newFiles,
  onNewFilesChange,
  disabled = false,
  label = "الصور المرفقة",
}: MultiPhotoPickerProps) {
  const { showToast } = useToast();

  const totalCount = keptPhotos.length + newFiles.length;
  const remainingSlots = Math.max(
    0,
    HISTORICAL_MAX_PHOTOS_PER_ITEM - totalCount,
  );

  const previewUrls = useMemo(
    () => newFiles.map((file) => URL.createObjectURL(file)),
    [newFiles],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    const validToAdd: File[] = [];
    for (const file of selected) {
      const fileError = validateHistoricalImageFile(file, `الملف "${file.name}"`);
      if (fileError) {
        showToast(fileError, "error");
        continue;
      }
      if (keptPhotos.length + newFiles.length + validToAdd.length >= HISTORICAL_MAX_PHOTOS_PER_ITEM) {
        showToast(
          `الحد الأقصى للصور هو ${HISTORICAL_MAX_PHOTOS_PER_ITEM} صور للسجل الواحد`,
          "error",
        );
        break;
      }
      validToAdd.push(file);
    }

    if (validToAdd.length > 0) {
      onNewFilesChange([...newFiles, ...validToAdd]);
    }
  }

  function handleRemoveNewFile(index: number) {
    onNewFilesChange(newFiles.filter((_, idx) => idx !== index));
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <FormLabel>
          {label} ({totalCount} / {HISTORICAL_MAX_PHOTOS_PER_ITEM})
        </FormLabel>
        <span className="text-[11px] font-bold text-(--app-muted-foreground)">
          JPG / PNG / WebP — حتى 10 ميجابايت للصورة
        </span>
      </div>

      {/* Existing kept/removed photos in Edit mode */}
      {existingPhotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {existingPhotos.map((photoUrl) => {
            const isKept = keptPhotos.includes(photoUrl);
            return (
              <div
                key={photoUrl}
                className={`relative aspect-square rounded-xl overflow-hidden border transition-all ${
                  isKept
                    ? "border-(--color-primary)/40 opacity-100"
                    : "border-(--app-border) opacity-40"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="صورة محفوظة"
                  className="w-full h-full object-cover"
                />
                {onToggleKeepPhoto && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggleKeepPhoto(photoUrl)}
                    title={isKept ? "إزالة الصورة عند الحفظ" : "استعادة الصورة"}
                    className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-lg bg-(--app-surface) border border-(--app-border) shadow-sm text-[10px] font-black text-(--color-primary) hover:text-(--app-info) cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isKept ? "إزالة" : "تراجع"}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Newly selected local previews */}
      {newFiles.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {newFiles.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-(--color-primary)/40 bg-(--app-surface-container)"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrls[idx]}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemoveNewFile(idx)}
                title="إلغاء تحديد الصورة"
                className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-(--app-surface) border border-(--app-border) shadow-sm flex items-center justify-center text-(--color-primary) hover:text-(--app-info) cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload picker trigger */}
      <label
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-(--app-border) bg-(--app-surface-container)/50 text-xs font-bold text-(--color-primary) hover:bg-(--app-surface-container) hover:border-(--color-primary)/40 transition-colors ${
          disabled || remainingSlots <= 0
            ? "opacity-50 cursor-not-allowed pointer-events-none"
            : "cursor-pointer"
        }`}
      >
        <ImagePlus className="w-4 h-4 shrink-0" />
        <span>
          {remainingSlots > 0
            ? `اختيار صور للرفع (${remainingSlots} متبقية)`
            : "تم الوصول للحد الأقصى (10 صور)"}
        </span>
        <input
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleFilesSelected}
          disabled={disabled || remainingSlots <= 0}
          className="hidden"
        />
      </label>
    </div>
  );
}
