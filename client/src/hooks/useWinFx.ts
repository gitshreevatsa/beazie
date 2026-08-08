"use client";

import { useCallback, useEffect, useRef } from "react";
import { confetti } from "@/utils/confetii";

/** Confetti + win sound. Call celebrate() on a winning round. */
export function useWinFx() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio("/audio/you-winn.mp3");
    a.volume = 0.5;
    audioRef.current = a;
  }, []);

  const celebrate = useCallback(() => {
    confetti();
    const a = audioRef.current;
    if (a) {
      a.currentTime = 0;
      a.play().catch(() => {});
    }
  }, []);

  return celebrate;
}
