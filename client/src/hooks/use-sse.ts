import { useEffect, useRef } from "react";
import { queryClient, API_BASE } from "@/lib/queryClient";

/**
 * Opens a single SSE connection to /api/stream and feeds the broadcast payload
 * directly into the TanStack Query cache. Every component that reads from those
 * query keys will re-render automatically — no polling required.
 *
 * Reconnects automatically on error with exponential back-off (max 30s).
 * Should be mounted exactly once, inside AppShell.
 */
export function useSSE() {
  const esRef = useRef<EventSource | null>(null);
  const retryDelay = useRef(1000);

  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      const url = `${API_BASE}/api/stream`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          retryDelay.current = 1000; // reset back-off on successful message

          // Populate the same query keys that components already read from
          if (payload.leaderboard !== undefined)
            queryClient.setQueryData(["/api/leaderboard"], payload.leaderboard);
          if (payload.ctp !== undefined)
            queryClient.setQueryData(["/api/ctp"], payload.ctp);
          if (payload.teams !== undefined)
            queryClient.setQueryData(["/api/teams"], payload.teams);
          if (payload.settings !== undefined)
            queryClient.setQueryData(["/api/settings"], payload.settings);
          if (payload.holes !== undefined)
            queryClient.setQueryData(["/api/holes"], payload.holes);
          if (payload.sponsors !== undefined)
            queryClient.setQueryData(["/api/sponsors"], payload.sponsors);
          if (payload.submissions !== undefined)
            queryClient.setQueryData(["/api/submissions"], payload.submissions);
        } catch {
          // malformed message — ignore
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!destroyed) {
          // Exponential back-off: 1s → 2s → 4s → … → 30s max
          setTimeout(connect, retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 2, 30000);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);
}
