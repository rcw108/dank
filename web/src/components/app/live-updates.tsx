"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 400;
const NOTICE_MS = 2600;

/**
 * Keeps the open screen in step with WordPress. The sync updates the
 * investor's row in Supabase; Realtime pushes the change here and the screen
 * re-renders with fresh server data, without a page reload.
 * Also refreshes when the app returns to the foreground or comes back online,
 * because phones drop sockets in the background.
 */
export function LiveUpdates({ userId }: { userId: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let noticeTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = (announce: boolean) => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        startTransition(() => router.refresh());
        if (announce) {
          setNotice(true);
          clearTimeout(noticeTimer);
          noticeTimer = setTimeout(() => setNotice(false), NOTICE_MS);
        }
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`investor:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investors",
          filter: `user_id=eq.${userId}`,
        },
        () => refresh(true),
      )
      .subscribe();

    const onForeground = () => {
      if (document.visibilityState === "visible") refresh(false);
    };
    document.addEventListener("visibilitychange", onForeground);
    window.addEventListener("online", onForeground);

    return () => {
      clearTimeout(refreshTimer);
      clearTimeout(noticeTimer);
      document.removeEventListener("visibilitychange", onForeground);
      window.removeEventListener("online", onForeground);
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return (
    <div
      aria-live="polite"
      data-print-hide
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex justify-center"
    >
      {notice ? (
        <span className="flex items-center gap-2 rounded-pill border border-accent/40 bg-surface px-4 py-2 text-sm shadow-lg animate-rise">
          <RefreshCw size={14} aria-hidden className="text-accent" />
          Account updated
        </span>
      ) : null}
    </div>
  );
}
