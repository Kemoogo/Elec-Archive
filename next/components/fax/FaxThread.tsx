interface FaxThreadProps {
  relatedFaxes: Array<{
    _id: string;
    faxNumber: string;
    date: string;
    subject: string;
    status: string;
  }>;
  currentFaxId: string;
}

export function FaxThread({ relatedFaxes, currentFaxId }: FaxThreadProps) {
  if (relatedFaxes.length === 0) {
    return null;
  }

  const sorted = [...relatedFaxes].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <div className="rounded-lg bg-(--app-surface) p-6" dir="rtl">
      <h2 className="mb-4 text-lg font-semibold text-(--app-white)">الفاكسات المرتبطة</h2>

      <div className="space-y-3">
        {sorted.map((fax) => (
          <a
            key={fax._id}
            href={`/fax/${fax._id}`}
            className={`block rounded-md border p-3 transition hover:bg-white/10 ${
              fax._id === currentFaxId
                ? "border-(--app-info) bg-(--app-info)/20"
                : "border-(--app-border)"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-(--app-white)">{fax.faxNumber}</span>
              <span className="text-sm text-(--app-muted-foreground)">
                {new Date(fax.date).toLocaleDateString("ar")}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground">{fax.subject}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
