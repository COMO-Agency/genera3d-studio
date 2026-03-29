import { useState, useEffect, useRef } from "react";

export function useCountUp(end: number, duration = 1500) {
  const [value, setValue] = useState(0);
  const currentValue = useRef(0);

  useEffect(() => {
    if (end === 0) { setValue(0); currentValue.current = 0; return; }
    const start = currentValue.current;
    const startTime = performance.now();

    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const v = Math.round(start + (end - start) * eased);
      currentValue.current = v;
      setValue(v);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return value;
}
