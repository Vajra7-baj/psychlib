"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-bold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      {copied ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 text-primary" />
          Copied
        </>
      ) : (
        <>
          <CopyIcon className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}
