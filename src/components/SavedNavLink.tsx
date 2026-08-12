"use client";

import Link from "next/link";
import { useBookmarks } from "@/components/BookmarksProvider";
import { BookmarkIcon } from "@/components/icons";

export default function SavedNavLink() {
  const { count } = useBookmarks();

  return (
    <Link
      href="/saved"
      className="relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold text-header-fg/90 transition-colors hover:bg-white/10"
    >
      <BookmarkIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Saved</span>
      {count > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-fg">
          {count}
        </span>
      )}
    </Link>
  );
}
