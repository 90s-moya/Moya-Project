// src/hooks/useCountdown.ts
import { useEffect, useRef, useState } from "react";

export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setLeft(seconds);

    timerRef.current = setInterval(() => {
      setLeft(v => (v <= 1 ? 0 : v - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [seconds]);

  return left;
}
