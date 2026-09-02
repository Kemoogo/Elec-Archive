"use client";

import { ModalShell, ModalHeaderCard, ModalSection, ModalBadge } from "@/components/ui/modal-shell";
import { RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer.shared";
import { compareOfficers } from "@/lib/officers/seniority";
import { Briefcase, User, Edit, CheckCircle2, AlertCircle, FileText, Trash2 } from "lucide-react";

interface OfficerInfo {
  id?: string;
  _id?: string;
  fullName: string;
  rank: string;
  militaryId?: string;
  seniorityNumber?: string;
  officerLabel?: string;
  isArkanHarb?: boolean;
}

export interface PositionViewData {
  id: string;
  positionTitle: string;
  department: string;
  primaryOfficer?: OfficerInfo | null;
  substituteOfficers?: OfficerInfo[];
  hasNoSubstitute?: boolean;
  orderNumber?: string;
  notes?: string;
}

interface PositionViewModalProps {
  isOpen: boolean;
  position: PositionViewData | null;
  canEdit: boolean;
  onClose: () => void;
  onEditPosition: (position: PositionViewData) => void;
  onPlacementPosition?: (position: PositionViewData) => void;
  onViewHistory?: (position: PositionViewData) => void;
  onDeletePosition?: (position: PositionViewData) => void;
  onSelectOfficer?: (officer: OfficerInfo) => void;
}

function getOfficerDisplay(officer?: OfficerInfo | null): string {
  if (!officer) return "شاغر";
  if (officer.officerLabel) return officer.officerLabel;
  const rLabel = officer.rank ? RANK_LABELS[officer.rank as OfficerRank] || officer.rank : "";
  const arkan = officer.isArkanHarb ? " أ ح" : "";
  return rLabel ? `${rLabel}${arkan} / ${officer.fullName}` : officer.fullName;
}

export function PositionViewModal({
  isOpen,
  position,
  canEdit,
  onClose,
  onEditPosition,
  onPlacementPosition: _onPlacementPosition,
  onViewHistory: _onViewHistory,
  onDeletePosition,
  onSelectOfficer,
}: PositionViewModalProps) {
  if (!isOpen || !position) return null;

  const hasPrimary = Boolean(position.primaryOfficer && (position.primaryOfficer.id || position.primaryOfficer._id || position.primaryOfficer.fullName));
  const subs = position.substituteOfficers || [];
  const sortedSubs = [...subs].sort((a, b) => compareOfficers(a, b));

  return (
    <ModalShell
      title={`بيانات الوظيفة: ${position.positionTitle}`}
      icon={<Briefcase className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          {canEdit && onDeletePosition ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeletePosition(position);
              }}
              className="btn-destructive text-xs"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>حذف الوظيفة</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              إلغاء
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPosition(position);
                }}
                className="btn-primary text-xs"
              >
                <Edit className="w-4 h-4" />
                <span>تعديل الوظيفة</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* 1. Header Card */}
      <ModalHeaderCard
        icon={<Briefcase className="w-6 h-6" />}
        title={position.positionTitle}
        subtitle={`الفرع / القسم: ${position.department}`}
        badge={
          position.hasNoSubstitute ? (
            <ModalBadge icon={<AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
              وظيفة بدون بديل
            </ModalBadge>
          ) : (
            <ModalBadge icon={<CheckCircle2 className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
              تتطلب ضابط بديل
            </ModalBadge>
          )
        }
      />

      {/* 2. Primary Officer Card */}
      <ModalSection
        title="الضابط الأساسي المكلف بالوظيفة"
        badge={
          hasPrimary ? (
            <ModalBadge icon={<CheckCircle2 className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
              مسكن
            </ModalBadge>
          ) : (
            <ModalBadge icon={<AlertCircle className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
              شاغر
            </ModalBadge>
          )
        }
      >
        {hasPrimary ? (
          <div className="flex items-center justify-between pt-1">
            <div className="space-y-1">
              <p
                onClick={() => {
                  if (onSelectOfficer && position.primaryOfficer) {
                    onSelectOfficer(position.primaryOfficer);
                  }
                }}
                className={`text-xs font-bold text-(--app-muted-foreground) ${
                  onSelectOfficer ? "hover:underline hover:text-(--app-info) cursor-pointer transition-colors" : ""
                }`}
              >
                {getOfficerDisplay(position.primaryOfficer)}
              </p>
              {position.primaryOfficer?.militaryId && (
                <p className="text-[11px] font-bold text-(--app-muted-foreground)/80">
                  الرقم العسكري: {position.primaryOfficer.militaryId}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-(--app-muted-foreground) py-1 font-bold">
            الوظيفة شاغرة حالياً ولا يوجد ضابط أساسي مسكن عليها.
          </p>
        )}
      </ModalSection>

      {/* 3. Substitute Officers Card (Dynamic: HIDE if hasNoSubstitute is true) */}
      {!position.hasNoSubstitute && (
        <ModalSection
          title={
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-(--color-primary)" />
              <span>الضباط البدلاء</span>
            </span>
          }
          badge={<span className="text-xs font-bold text-(--app-muted-foreground)">{subs.length} ضابط</span>}
        >
          {subs.length === 0 ? (
            <p className="text-xs text-(--app-muted-foreground) py-1 font-bold">
              لا يوجد ضباط بدلاء مسكنين على هذه الوظيفة حالياً.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {sortedSubs.map((sub, idx) => (
                <ModalBadge
                  key={sub.id || sub._id || idx}
                  icon={<User className="w-3.5 h-3.5 text-(--app-muted-foreground)" />}
                  onClick={onSelectOfficer ? () => onSelectOfficer(sub) : undefined}
                >
                  {getOfficerDisplay(sub)}
                </ModalBadge>
              ))}
            </div>
          )}
        </ModalSection>
      )}

      {/* 4. Order Number & Notes */}
      {(position.orderNumber || position.notes) && (
        <div className="p-4 bg-(--app-surface-container)/20 rounded-2xl border border-(--app-border)/60 space-y-2 text-right">
          {position.orderNumber && (
            <div className="flex items-center gap-2 text-xs">
              <FileText className="w-4 h-4 text-(--app-muted-foreground)" />
              <span className="font-bold text-(--app-foreground)">رقم أمر التكليف:</span>
              <span className="font-mono font-bold text-(--color-primary)">{position.orderNumber}</span>
            </div>
          )}
          {position.notes && (
            <div className="text-xs text-(--app-muted-foreground) pt-1">
              <span className="font-bold block text-(--app-foreground) mb-0.5">ملاحظات:</span>
              <p className="font-medium bg-(--app-surface) p-2.5 rounded-xl border border-(--app-border)/40">{position.notes}</p>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
