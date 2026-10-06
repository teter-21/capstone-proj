import { useEffect, useRef } from "react";

/*
 * Automatically refresh data without jumping the page
 * back to the top.
 */
export const useAutoRefresh = (loadData, interval = 10000) => {
  const loadRef = useRef(loadData);

  useEffect(() => {
    loadRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    const refresh = async () => {
      // Remember current scroll position
      const scrollY = window.scrollY;

      try {
        await loadRef.current?.();
      } finally {
        // Restore scroll position after data refresh
        requestAnimationFrame(() => {
          window.scrollTo({
            top: scrollY,
            behavior: "instant",
          });
        });
      }
    };

    const handleDataUpdated = () => refresh();

    const handleFocus = () => refresh();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
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
