"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  /** Default polling cadence when nothing is "active". Default 15s. */
  intervalMs?: number;
  /** Faster cadence when `active` is true. Default 5s. */
  activeIntervalMs?: number;
  /**
   * When true (e.g. there are RENDERING videos), poll on `activeIntervalMs`.
   * When false, poll on the slower `intervalMs` so externally-triggered rows
   * (bulk render scripts, cron jobs, webhooks) still surface without F5.
   */
  active?: boolean;
  /** Render a small "última atualização há Xs" indicator. Default true. */
  indicator?: boolean;
}

/**
 * Always-on polling for server-component pages. Calls router.refresh() so the
 * RSC payload is rebuilt server-side and streamed to the client without a full
 * page reload. Adaptive cadence based on whether the page is "active" (work in
 * flight). Pauses when the tab is hidden, resumes on focus.
 *
 * Place once near the top of any server component whose data mutates from
 * background workers, cron jobs, webhooks, or other external sources.
 */
export function AutoRefresh({
  intervalMs = 15000,
  activeIntervalMs = 5000,
  active = false,
  indicator = true,
}: Props) {
  const router = useRouter();
  const [tickAt, setTickAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const interval = active ? activeIntervalMs : intervalMs;

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    const start = () => {
      stop();
      timerRef.current = setInterval(() => {
        router.refresh();
        setTickAt(Date.now());
      }, interval);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Snap a refresh on regaining focus so we don't wait a full interval.
        router.refresh();
        setTickAt(Date.now());
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, intervalMs, activeIntervalMs, router]);

  // Update the "Xs ago" label every second when the indicator is on.
  useEffect(() => {
    if (!indicator) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [indicator]);

  if (!indicator) return null;

  const ageSec = Math.max(0, Math.floor((now - tickAt) / 1000));
  return (
    <span className="text-xs text-[color:var(--muted)]">
      {active ? "atualizando " : "ao vivo · "}há {ageSec}s
    </span>
  );
}
