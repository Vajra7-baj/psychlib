import { ExternalIcon, FileIcon } from "@/components/icons";

/**
 * Inline PDF preview that degrades gracefully.
 *
 * Two fallbacks, no JavaScript needed for either. Small screens get the card
 * via CSS, because phone browsers generally render an embedded PDF as a blank
 * box. On larger screens the <object> is used, and any browser that still
 * can't display a PDF renders the same card from its children.
 */
export default function PdfPreview({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const fallback = (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-primary">
        <FileIcon className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium">Preview isn&rsquo;t available here</p>
      <p className="max-w-xs text-xs text-muted">
        Some browsers can&rsquo;t display PDFs inline. Open it in a new tab to
        read it.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-fg hover:bg-primary-hover"
      >
        Open PDF
        <ExternalIcon className="h-4 w-4" />
      </a>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="sm:hidden">{fallback}</div>
      <object
        data={`${url}#view=FitH`}
        type="application/pdf"
        aria-label={`Preview of ${title}`}
        className="hidden h-[75vh] w-full sm:block"
      >
        {fallback}
      </object>
    </div>
  );
}
