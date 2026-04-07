# Daily Rollcall Screen Layout Notes (T001)
- **Project ID**: 5333932305081722626
- **Screen ID**: 2e1ddf8786d540a18f044683466acb77
- **Title**: التمام اليومي - الأرشيف الإلكتروني
- **Theme**: Digital Vault (Azure Scribe RTL)
- **Background**: #0A0F1D
- **Surface**: #151C2C
- **Key Features**:
    - Commander's Summary Cards: Large status summary (Present, Absent, Leave, Mission) with glassmorphism.
    - Officer Roster: List with status selectors (حاضر, غائب, إجازة, مهمة).
    - Draft/Submit Workflow: Buttons for 'حفظ كمسودة' and 'إرسال التمام'.
    - Breadcrumbs: 'الرئيسية / شئون الضباط / التمام اليومي'.

## Design DNA Extraction (T002)
- [x] **Component Architecture**: 
    - Summary Dashboard (`RollcallSummaryStats`) at the top with large status counters.
    - Attendance List (`AttendanceList`) with status selector buttons.
    - Status Buttons (`StatusSelectorButton`) with high-contrast active states.
    - Action Header (`RollcallHeader`) with breadcrumbs and title.
- [x] **Color Tokens**:
    - Present: `#10B981` (Success)
    - Absent: `#EF4444` (Error)
    - Leave: `#F59E0B` (Warning)
    - Mission: `#3B82F6` (Primary)
- [x] **Layout Patterns**:
    - High Visual Contrast for status indicators.
    - Real-time Draft Recovery notification bar.
    - Corner radius: `12px`.
    - Spacing: `spacing-6` (1.5rem) internal padding.
    - RTL: mirrored status selectors.
