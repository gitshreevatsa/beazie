"use client";

import { useEffect, useState } from "react";
import type { BeazieStage } from "@/utils/beazie";

/**
 * Claw cabinet animation. Never takes a tier — no outcome hints mid-grab.
 */
export function ClawAnimation({
  stage,
  active,
}: {
  stage: BeazieStage | null;
  active: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "drop" | "grab" | "lift">("idle");

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }
    if (stage === "animating") {
      setPhase("drop");
      const t1 = setTimeout(() => setPhase("grab"), 900);
      const t2 = setTimeout(() => setPhase("lift"), 1600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    if (stage === "betting" || stage === "revealing" || stage === "settling") {
      setPhase("lift");
    }
  }, [stage, active]);

  const clawY =
    phase === "drop" ? 72 : phase === "grab" ? 78 : phase === "lift" ? 28 : 18;

  const lightLabel =
    phase === "idle"
      ? "INSERT COIN"
      : phase === "drop"
        ? "DROPPING"
        : phase === "grab"
          ? "GRABBING"
          : "LIFTING";

  return (
    <div className="relative mx-auto w-full" aria-hidden>
      {/* Marquee light above the glass — not over the prizes */}
      <div className="mb-0 flex items-center justify-between border-4 border-b-0 border-ink bg-ink px-3 py-2">
        <span className="font-display text-[10px] font-bold tracking-[0.25em] text-butter/50">
          BEAZIE
        </span>
        <span
          className={`font-display text-xs font-extrabold tracking-[0.2em] ${
            phase === "idle" ? "text-butter animate-pulse" : "text-main"
          }`}
        >
          {lightLabel}
        </span>
        <span className="font-display text-[10px] font-bold tracking-[0.25em] text-butter/50">
          ARCADE
        </span>
      </div>

      <div className="relative h-[300px] w-full overflow-hidden border-4 border-ink bg-cabinet shadow-base">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_10%,rgba(255,229,102,0.22),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(0deg,transparent,transparent_14px,rgba(255,255,255,0.06)_15px)]" />

        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-11 w-11 border-[3px] border-ink bg-main"
              style={{
                transform: `translateY(${(i % 2) * 7}px) rotate(${(i - 2) * 9}deg)`,
              }}
            />
          ))}
        </div>

        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 transition-[height] duration-700 ease-in-out"
          style={{ height: `${clawY}%` }}
        >
          <div className="mx-auto h-full w-1 bg-butter" />
          <div
            className={`absolute bottom-0 left-1/2 flex -translate-x-1/2 transition-transform duration-500 ${
              phase === "grab" ? "scale-y-90" : "scale-y-100"
            }`}
          >
            <div className="h-9 w-3.5 origin-top rotate-[-28deg] border-[3px] border-ink bg-butter" />
            <div className="h-9 w-3.5 origin-top rotate-[28deg] border-[3px] border-ink bg-butter" />
          </div>
        </div>
      </div>
    </div>
  );
}
