"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

/*
  Account-synced bookmarks + collections, stored in the `bookmarks` table so
  they follow the user across devices. On first load after login we migrate
  any bookmarks left in this browser's localStorage, then clear them.
*/
const LEGACY_KEY = "psychlib:bookmarks";

interface BookmarksContextValue {
  map: Map<string, string | null>; // resourceId -> collection (null = uncategorized)
  ids: Set<string>;
  ready: boolean;
  count: number;
  collections: string[];
  isBookmarked: (id: string) => boolean;
  collectionOf: (id: string) => string | null;
  toggle: (id: string) => Promise<void>;
  setCollection: (id: string, collection: string | null) => Promise<void>;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [map, setMap] = useState<Map<string, string | null>>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user) {
        await migrateLegacyBookmarks(supabase, user.id);
        const { data } = await supabase
          .from("bookmarks")
          .select("resource_id, collection");
        if (active) {
          setMap(
            new Map(
              (data ?? []).map((r) => [
                r.resource_id as string,
                (r.collection as string | null) ?? null,
              ]),
            ),
          );
        }
      }
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const toggle = useCallback(
    async (id: string) => {
      if (!userId) return;
      const has = map.has(id);
      setMap((prev) => {
        const next = new Map(prev);
        if (has) next.delete(id);
        else next.set(id, null);
        return next;
      });
      if (has) {
        await supabase
          .from("bookmarks")
          .delete()
          .eq("resource_id", id)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("bookmarks")
          .insert({ user_id: userId, resource_id: id, collection: null });
      }
    },
    [map, userId, supabase],
  );

  const setCollection = useCallback(
    async (id: string, collection: string | null) => {
      if (!userId) return;
      const clean = collection?.trim() || null;
      setMap((prev) => new Map(prev).set(id, clean));
      await supabase
        .from("bookmarks")
        .upsert(
          { user_id: userId, resource_id: id, collection: clean },
          { onConflict: "user_id,resource_id" },
        );
    },
    [userId, supabase],
  );

  const collections = useMemo(
    () =>
      [...new Set([...map.values()].filter((c): c is string => !!c))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [map],
  );

  const value: BookmarksContextValue = {
    map,
    ids: new Set(map.keys()),
    ready,
    count: map.size,
    collections,
    isBookmarked: (id) => map.has(id),
    collectionOf: (id) => map.get(id) ?? null,
    toggle,
    setCollection,
  };

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
}

/** One-time move of this device's old localStorage bookmarks into the account. */
async function migrateLegacyBookmarks(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, string | null>;
    const ids = Object.keys(obj ?? {});
    if (ids.length) {
      await supabase.from("bookmarks").upsert(
        ids.map((id) => ({
          user_id: userId,
          resource_id: id,
          collection: obj[id] || null,
        })),
        { onConflict: "user_id,resource_id" },
      );
    }
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore malformed legacy data */
  }
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx)
    throw new Error("useBookmarks must be used within a BookmarksProvider");
  return ctx;
}
