"use client";

import { useState } from "react";
import type { Citations } from "@/lib/citation";
import CopyButton from "@/components/CopyButton";
import { QuoteIcon } from "@/components/icons";

const FORMATS: (keyof Citations)[] = ["APA", "MLA", "Chicago"];

export default function CitationBlock({ citations }: { citations: Citations }) {
  const [format, setFormat] = useState<keyof Citations>("APA");
  const text = citations[format];

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <QuoteIcon className="h-4 w-4 text-navy" />
          Citation
        </h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                  format === f
                    ? "bg-navy text-navy-fg"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <CopyButton text={text} />
        </div>
      </div>
      <p className="mt-2 rounded-lg border border-border bg-surface-2/50 p-3.5 text-sm leading-relaxed text-muted">
        {text}
      </p>
    </section>
  );
}
