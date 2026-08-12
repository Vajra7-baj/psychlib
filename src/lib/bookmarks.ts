"use client";

/*
  Per-device bookmarks stored in localStorage. No login required, works
  immediately per browser. When real accounts land, these migrate to the
  `bookmarks` table so saves sync across devices.
*/
const KEY = "psychlib:bookmarks";
const EVENT = "psychlib:bookmarks-changed";

export function getBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().includes(id);
}

export function toggleBookmark(id: string): boolean {
  const current = getBookmarks();
  const has = current.includes(id);
  const next = has ? current.filter((x) => x !== id) : [id, ...current];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
  return !has;
}

/** Subscribe to changes (same tab via custom event, other tabs via storage). */
export function subscribeBookmarks(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener(EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
