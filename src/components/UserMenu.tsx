"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";

export default function UserMenu({
  email,
  role,
}: {
  email: string | null;
  role: "faculty" | "student" | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (email?.[0] ?? "?").toUpperCase();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-sm font-bold text-header-fg transition hover:bg-white/25"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium">{email}</p>
            {role && (
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  role === "faculty"
                    ? "bg-accent-soft text-primary"
                    : "bg-navy-soft text-navy"
                }`}
              >
                {role}
              </span>
            )}
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-surface-2"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
