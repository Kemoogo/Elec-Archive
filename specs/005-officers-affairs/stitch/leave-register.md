# Leave Register Screen Layout Notes (T001)
- **Project ID**: 5333932305081722626
- **Screen ID**: 4fec3372244441f3a100ef9fe051409e
- **Title**: سجل الإجازات - أرشيف الكتروني
- **Theme**: Digital Vault (Azure Scribe RTL)
- **Key Features**:
    - Officer Leave Management: View and register leaves/absences.
    - Fields: Type (annual, sick, emergency), dates, reason, status.
    - Filters: Officer and Status.
    - List Table: Glassmorphism status markers.
    - Breadcrumbs: 'الرئيسية / شئون الضباط / سجل الإجازات'.

## Design DNA Extraction (T002)
- [x] **Component Architecture**: 
    - Register Header (`LeaveRegisterHeader`) with Breadcrumbs/Title.
    - Filter Bar (`LeaveFilterBar`) for targeted searching of leaves by category and status.
    - Leave History Table (`LeaveHistoryTable`) with glassmorphic status labels ('مسودة', 'معتمد', 'مغلق').
- [x] **Color Tokens**:
    - Background: `#0e1321` (surface-dim)
    - Row Hover: `#1F2937`
    - Column Text: `#c2c6d6` (on-surface-variant)
- [x] **Layout Patterns**:
    - 24px content padding.
    - Right Sidebar (280px) integration.
    - Standardized success/error notifications at the bottom.
    - Outfito or Inter Arabic typography.
    - 12px container corners.
