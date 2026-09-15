import { useEffect, useRef } from "react";

/* Refresh data when another action changes the clinic data, when the user returns to the tab, and periodically. */
export const useAutoRefresh = (loadData, interval = 10000) => {
  const loadRef = useRef(loadData);

  useEffect(() => {
    loadRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    const refresh = () => loadRef.current?.();
    const handleDataUpdated = () => refresh();
    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("clinic:data-updated", handleDataUpdated);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    const timer = setInterval(refresh, interval);

    return () => {
      window.removeEventListener("clinic:data-updated", handleDataUpdated);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(timer);
    };
  }, [interval]);
};
