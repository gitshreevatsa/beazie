"use client";

import { useCallback, useEffect, useRef } from "react";
import { confetti } from "@/utils/confetii";
import { playWinSting } from "@/utils/veilAudio";

/** Confetti + soft win sting. */
export function useWinFx() {
  const celebrate = useCallback(() => {
    confetti();
    playWinSting();
  }, []);

  // Keep hook signature stable; no MP3 preload needed.
  const primed = useRef(false);
  useEffect(() => {
    primed.current = true;
  }, []);

  return celebrate;
}
