"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  /** Polling interval in ms. Default 5s. */
  intervalMs?: number;
  /** When false, polling stops. Pass `hasRenderingItems` etc. */
  enabled?: boolean;
}

/**
 * Drop-in component that re-runs server-side data fetching on the parent page
 * at a fixed interval. Used on pages where rows mutate from background workers
 * (HeyGen webhook → video.status, BullMQ → post.status, cron → metrics).
 *
 * Stops polling when the tab is hidden so we do not burn requests for a user
 * who is not looking, and resumes when the tab regains focus.
 */
export function AutoRefresh({ intervalMs = 5000, enabled = true }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      stop();
      timer = setInterval(() => {
        router.refresh();
      }, intervalMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs, router]);

  return null;
}
