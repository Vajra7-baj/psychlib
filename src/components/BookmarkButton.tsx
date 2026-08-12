"use client";

import { useBookmarks } from "@/components/BookmarksProvider";
import { BookmarkFilledIcon, BookmarkIcon } from "@/components/icons";

export default function BookmarkButton({
  id,
  variant = "card",
}: {
  id: string;
  variant?: "card" | "detail";
}) {
  const { isBookmarked, toggle, ready } = useBookmarks();
  const saved = isBookmarked(id);

  function onClick(e: React.MouseEvent) {
    e.preventDefault(); // don't follow the card link
    e.stopPropagation();
    toggle(id);
  }

  const label = saved ? "Remove bookmark" : "Save to bookmarks";
  const Icon = saved ? BookmarkFilledIcon : BookmarkIcon;

  if (variant === "detail") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        disabled={!ready}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 ${
          saved
            ? "border-primary bg-accent-soft text-primary"
            : "border-border-strong hover:bg-surface-2"
        }`}
      >
        <Icon className="h-4 w-4" />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${
        saved
          ? "border-primary bg-accent-soft text-primary"
          : "border-transparent text-muted hover:border-border-strong hover:text-primary"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
