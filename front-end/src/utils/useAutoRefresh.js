import { useEffect, useRef } from "react";
// Keep background refresh quiet; initial loading remains the page's responsibility.
export const useAutoRefresh = (loadData, interval = 30000) => {
  const loadRef = useRef(loadData);
  useEffect(() => { loadRef.current = loadData; }, [loadData]);
  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (!active || pending || document.visibilityState === "hidden") return;
      pending = true;
      try { await loadRef.current?.({ background: true }); }
      catch (error) { console.error("Background refresh failed:", error); }
      finally {
        pending = false;
        // Loaders keep mounted content visible during background updates.
        // Never force scroll: preserve both page/container scroll and user movement.
      }
    };
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("clinic:data-updated", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    const timer = setInterval(refresh, interval);
    return () => {
      active = false; clearInterval(timer);
      window.removeEventListener("clinic:data-updated", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [interval]);
};
