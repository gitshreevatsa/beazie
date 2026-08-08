"use client";

import { confetti } from "@/utils/confetii";
import { useCallback, useEffect, useRef } from "react";

/** Confetti + arcade win jingle (new file — not the old you-winn.mp3). */
export function useWinFx() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio("/audio/prize-win.wav");
    a.volume = 0.55;
    a.preload = "auto";
    audioRef.current = a;
  }, []);

  return useCallback(() => {
    confetti();
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => {});
  }, []);
}
