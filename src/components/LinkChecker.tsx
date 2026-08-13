"use client";

import { useState } from "react";
import Link from "next/link";
import { checkLinks, type BrokenLink } from "@/app/manage/actions";
import { CheckIcon, ExternalIcon } from "@/components/icons";

export default function LinkChecker() {
  const [status, setStatus] = useState<"idle" | "checking" | "done">("idle");
  const [broken, setBroken] = useState<BrokenLink[]>([]);
  const [checked, setChecked] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Walk the library a batch at a time so a big collection can't exceed the
  // server's time limit, and so progress is visible while it runs.
  async function run() {
    setStatus("checking");
    setBroken([]);
    setChecked(0);
    setTotal(0);
    setError(null);

    const BATCH = 12;
    let offset = 0;
    const found: BrokenLink[] = [];

    for (;;) {
      const res = await checkLinks(offset, BATCH);
      if (!res.ok) {
        setError(res.error ?? "Could not check links.");
        setStatus("idle");
        return;
      }
      found.push(...res.broken);
      offset += res.checked;
      setBroken([...found]);
      setChecked(offset);
      setTotal(res.total);
      if (res.checked === 0 || offset >= res.total) break;
    }
    setStatus("done");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Check every resource link and DOI for dead pages. Sites that block
        automated checks (403/405) are treated as healthy to avoid false alarms.
      </p>
      <button
        onClick={run}
        disabled={status === "checking"}
        className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg transition hover:bg-primary-hover disabled:opacity-60"
      >
        {status === "checking" && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg border-t-transparent" />
        )}
        {status === "checking"
          ? total
            ? `Checking ${checked} of ${total}…`
            : "Checking…"
          : "Check links"}
      </button>

      {error && (
        <p className="rounded-lg border border-accent-soft bg-accent-soft px-3 py-2 text-sm text-primary">
          {error}
        </p>
      )}

      {status === "done" &&
        (broken.length === 0 ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-navy">
            <CheckIcon className="h-4 w-4" />
            {checked === 0
              ? "No links to check yet."
              : `All ${checked} links look healthy.`}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-primary">
              {broken.length} of {checked} may be broken:
            </p>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {broken.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="truncate text-xs text-muted">
                      {b.status} · {b.url}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open link"
                      className="rounded-md p-1.5 text-muted transition hover:bg-surface-2"
                    >
                      <ExternalIcon className="h-4 w-4" />
                    </a>
                    <Link
                      href={`/resource/${b.id}/edit`}
                      className="rounded-md border border-border-strong px-2.5 py-1 text-xs font-bold transition hover:bg-surface-2"
                    >
                      Fix
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
