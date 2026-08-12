"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/icons";

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [isPending, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in sync if the URL changes elsewhere (e.g. clearing filters).
  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  function push(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next.trim()) sp.set("q", next);
    else sp.delete("q");
    sp.delete("page");
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`));
  }

  function onChange(next: string) {
    setValue(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push(next), 250);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
        {isPending ? (
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <SearchIcon className="h-5 w-5" />
        )}
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search titles, authors, abstracts, and PDF contents…"
        aria-label="Search resources"
        className="w-full rounded-xl border border-border-strong bg-surface py-4 pl-12 pr-4 text-base shadow-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-[var(--ring)]"
      />
    </div>
  );
}
