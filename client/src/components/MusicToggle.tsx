"use client";

import { useEffect, useState } from "react";
import { isBgmPlaying, setBgmVolume, startBgm, stopBgm } from "@/utils/veilAudio";
import { Volume2, VolumeX } from "lucide-react";

/** Play-page ambient music toggle (starts after first user gesture). */
export function MusicToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    return () => stopBgm();
  }, []);

  const toggle = () => {
    if (isBgmPlaying() || on) {
      stopBgm();
      setOn(false);
      return;
    }
    startBgm(0.2);
    setBgmVolume(0.2);
    setOn(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 border-2 border-ink bg-white px-3 py-1.5 font-display text-xs font-bold text-ink shadow-[3px_3px_0_0_#121212]"
      aria-pressed={on}
      aria-label={on ? "Mute music" : "Play music"}
    >
      {on ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      {on ? "Music on" : "Music"}
    </button>
  );
}
