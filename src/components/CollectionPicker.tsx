"use client";

import { useEffect, useRef, useState } from "react";
import { useBookmarks } from "@/components/BookmarksProvider";
import { CheckIcon, ChevronDownIcon, FolderIcon, PlusIcon } from "@/components/icons";

/**
 * Assign a saved resource to a named collection. Picking a collection also
 * saves the resource if it wasn't already bookmarked.
 */
export default function CollectionPicker({
  id,
  variant = "full",
}: {
  id: string;
  variant?: "full" | "compact";
}) {
  const { collections, collectionOf, setCollection, ready } = useBookmarks();
  const current = collectionOf(id);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(name: string | null) {
    setCollection(id, name);
    setOpen(false);
    setCreating(false);
    setNewName("");
  }

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim()) choose(newName.trim());
  }

  const label = current ?? (variant === "compact" ? "Add to collection" : "None");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        disabled={!ready}
        className={`inline-flex items-center gap-1.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
          variant === "compact"
            ? "border-border px-2.5 py-1 text-xs"
            : "border-border-strong px-3.5 py-2.5 font-bold"
        } ${current ? "text-navy" : "text-muted"} hover:bg-surface-2`}
      >
        <FolderIcon className={variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        <span className="max-w-[12rem] truncate">{label}</span>
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1.5 w-60 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <ul className="max-h-64 overflow-y-auto py-1 text-sm">
            <li>
              <button
                onClick={() => choose(null)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-2"
              >
                <span className="text-muted">No collection</span>
                {current === null && <CheckIcon className="h-4 w-4 text-primary" />}
              </button>
            </li>
            {collections.map((name) => (
              <li key={name}>
                <button
                  onClick={() => choose(name)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-2"
                >
                  <span className="flex items-center gap-2 truncate">
                    <FolderIcon className="h-4 w-4 shrink-0 text-navy" />
                    <span className="truncate">{name}</span>
                  </span>
                  {current === name && <CheckIcon className="h-4 w-4 text-primary" />}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-1">
            {creating ? (
              <form onSubmit={submitNew} className="flex items-center gap-1 p-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Collection name"
                  className="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-fg hover:bg-primary-hover"
                >
                  Add
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-surface-2"
              >
                <PlusIcon className="h-4 w-4" />
                New collection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
