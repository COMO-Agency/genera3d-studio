import { useState, useEffect, useRef } from "react";

export function useTypewriter(text: string, speed = 50, delay = 300) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timeout = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setDone(true);
        }
      }, speed);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, speed, delay]);

  return { displayed, done };
}
