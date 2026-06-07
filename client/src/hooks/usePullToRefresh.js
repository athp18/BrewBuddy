import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 72;   // px of pull needed to trigger
const RESISTANCE = 2.5; // slows down rubber-band effect

export const usePullToRefresh = (onRefresh) => {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(null);
  const refreshing = useRef(false);

  useEffect(() => {
    const container = document.documentElement;

    const onTouchStart = (e) => {
      if (container.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (startY.current === null || refreshing.current) return;
      if (container.scrollTop > 0) { startY.current = null; return; }

      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) return;

      e.preventDefault();
      const dist = Math.min(delta / RESISTANCE, THRESHOLD * 1.5);
      setPullDistance(dist);
      setPulling(true);
    };

    const onTouchEnd = async () => {
      if (!pulling) return;
      if (pullDistance >= THRESHOLD && !refreshing.current) {
        refreshing.current = true;
        try { await onRefresh(); } finally { refreshing.current = false; }
      }
      startY.current = null;
      setPulling(false);
      setPullDistance(0);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, pulling, pullDistance]);

  return { pullDistance, pulling };
};
