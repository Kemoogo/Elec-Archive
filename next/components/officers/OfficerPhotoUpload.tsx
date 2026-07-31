"use client";

import { useState } from "react";
import { User, Camera, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { extractApiError } from "@/lib/utils";

interface OfficerPhotoUploadProps {
  officerId: string;
  photoUrl?: string;
  canEdit: boolean;
}

export function OfficerPhotoUpload({ officerId, photoUrl, canEdit }: OfficerPhotoUploadProps) {
  const router = useRouter();
  const [photoOverride, setPhotoOverride] = useState<string | null | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [timestamp, setTimestamp] = useState(0);
  const currentPhoto = photoOverride === undefined ? photoUrl : photoOverride;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("يجب رفع صورة فقط");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/officers/${officerId}/photo`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في رفع الصورة");
        setError(errorMsg);
        return;
      }

      setPhotoOverride(data.data.fileUrl);
      setTimestamp(prev => prev + 1);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("هل أنت متأكد من حذف الصورة؟")) return;

    try {
      setUploading(true);
      const res = await fetch(`/api/officers/${officerId}/photo`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في حذف الصورة");
        setError(errorMsg);
        return;
      }

      setPhotoOverride(null);
      setTimestamp(prev => prev + 1);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setUploading(false);
    }
  };

  const photoSrc = currentPhoto
    ? (currentPhoto.includes('?') ? `${currentPhoto}&v=${timestamp}` : `${currentPhoto}?v=${timestamp}`)
    : null;

  return (
    <div className="relative group w-40 h-52 bg-(--app-surface-container) border border-(--app-border) rounded-2xl flex items-center justify-center shadow-inner overflow-hidden">
      {(typeof currentPhoto === 'string' && currentPhoto && photoSrc) ? (
        <Image
          src={photoSrc}
          alt="صورة الضابط"
          fill
          className="object-cover"
          sizes="160px"
          unoptimized={true}
        />
      ) : (
        <User className="h-20 w-20 text-(--app-muted-foreground)/20" />
      )}

      {canEdit && (
        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer rounded-full">
          {uploading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
          ) : (
            <>
              <Camera className="h-8 w-8 text-white mb-2" />
              <span className="text-white text-xs font-bold px-2 text-center">
                {currentPhoto ? "تغيير الصورة" : "رفع صورة"}
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}

      {canEdit && currentPhoto && !uploading && (
        <button
          onClick={handleDelete}
          className="absolute top-2 left-2 p-1.5 bg-(--app-error)/80 hover:bg-(--app-error) text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          title="حذف الصورة"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {error && (
        <div className="absolute bottom-0 inset-x-0 bg-(--app-error) text-white text-[10px] text-center p-1 font-bold truncate px-2">
          {error}
        </div>
      )}
    </div>
  );
}
