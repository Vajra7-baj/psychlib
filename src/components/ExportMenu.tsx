"use client";

import { useEffect, useRef, useState } from "react";
import {
  downloadText,
  safeFileBase,
  toApaList,
  toBibTeX,
  toRis,
  type ExportItem,
} from "@/lib/export";
import { CheckIcon, ChevronDownIcon, DownloadIcon } from "@/components/icons";

export default function ExportMenu({
  items,
  name,
}: {
  items: ExportItem[];
  name?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const base = safeFileBase(name ?? null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function copyApa() {
    try {
      await navigator.clipboard.writeText(toApaList(items));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
    setOpen(false);
  }

  if (!items.length) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-bold transition-colors hover:bg-surface-2"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        Export
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm shadow-lg">
          <button
            onClick={copyApa}
            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-2"
          >
            <span>Copy APA reference list</span>
            {copied && <CheckIcon className="h-4 w-4 text-primary" />}
          </button>
          <button
            onClick={() => {
              downloadText(`${base}.bib`, toBibTeX(items), "application/x-bibtex");
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left hover:bg-surface-2"
          >
            Download BibTeX (.bib)
          </button>
          <button
            onClick={() => {
              downloadText(`${base}.ris`, toRis(items), "application/x-research-info-systems");
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left hover:bg-surface-2"
          >
            Download RIS (.ris)
          </button>
          <p className="border-t border-border px-3 py-2 text-[11px] text-muted">
            BibTeX/RIS import into Zotero, Mendeley &amp; EndNote.
          </p>
        </div>
      )}
    </div>
  );
}
