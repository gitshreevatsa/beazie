"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BeazieStage } from "@/utils/beazie";

export const BOXES = [
  { id: 0, label: "A", name: "Amber", color: "#FFE566" },
  { id: 1, label: "B", name: "Bloom", color: "#FF5A5F" },
  { id: 2, label: "C", name: "Cove", color: "#7FCFB8" },
  { id: 3, label: "D", name: "Dawn", color: "#6EB5FF" },
  { id: 4, label: "E", name: "Ember", color: "#FF8A8E" },
] as const;

function coachCopy(
  stage: BeazieStage | null,
  selected: number | null,
  hasResult: boolean
): { title: string; detail: string; step: 0 | 1 | 2 | 3 } {
  if (hasResult || stage === "done") {
    return {
      title: "Opened!",
      detail: "Prize is below. Play again anytime.",
      step: 3,
    };
  }
  if (stage === "betting") {
    return {
      title: "Confirm start",
      detail: "Wallet #1 — draw private seed + shuffled deck.",
      step: 1,
    };
  }
  if (stage === "animating" || stage === "peeking" || stage === "revealing") {
    return {
      title: stage === "peeking" ? "Private peek" : "Seed is private",
      detail:
        stage === "peeking"
          ? "Sign to decrypt your card — only you can see it."
          : "Handles on-chain. Attesting seed + card…",
      step: 1,
    };
  }
  if (stage === "settling") {
    return {
      title: "Confirm claim",
      detail: "Settle makes the tier public and mints your NFT.",
      step: 2,
    };
  }
  if (selected == null) {
    return {
      title: "Tap a box",
      detail: "One tap to pick. Then hit Open.",
      step: 0,
    };
  }
  return {
    title: `Box ${BOXES[selected].label} ready`,
    detail: "Hit Open — two quick wallet confirms.",
    step: 0,
  };
}

/** Pick → open (2 wallet signs with clear on-screen beats) → prize. */
export function PrizeMachine({
  stage,
  active,
  selectedBox,
  onSelectBox,
  tier,
  tierName,
}: {
  stage: BeazieStage | null;
  active: boolean;
  selectedBox: number | null;
  onSelectBox: (id: number) => void;
  tier?: number | null;
  tierName?: string | null;
}) {
  const [showPrize, setShowPrize] = useState(false);
  const hasResult = Boolean(tier);
  const canSelect = !active && !hasResult && (!stage || stage === null);
  const copy = coachCopy(stage, selectedBox, hasResult);
  const pickedMeta = selectedBox != null ? BOXES[selectedBox] : null;
  const inFlight =
    stage === "betting" ||
    stage === "animating" ||
    stage === "revealing" ||
    stage === "settling";
  const showHero = pickedMeta != null && (inFlight || hasResult);

  useEffect(() => {
    if (hasResult) {
      setShowPrize(false);
      const t = setTimeout(() => setShowPrize(true), 280);
      return () => clearTimeout(t);
    }
    setShowPrize(false);
  }, [hasResult, tier]);

  return (
    <div className="relative mx-auto w-full">
      {/* Progress: 2 signatures called out */}
      <div className="border-4 border-b-0 border-ink bg-ink px-4 py-3">
        <div className="mb-2 flex items-center justify-center gap-2">
          {[
            { n: 1, label: "Start" },
            { n: 2, label: "Claim" },
            { n: 3, label: "Prize" },
          ].map((s) => {
            const done = copy.step > s.n || (s.n === 3 && hasResult);
            const current = copy.step === s.n || (s.n === 3 && hasResult && copy.step === 3);
            return (
              <div key={s.n} className="flex items-center gap-2">
                <div
                  className={`flex h-7 min-w-7 items-center justify-center border-2 border-butter px-1.5 font-display text-[10px] font-extrabold ${
                    done || current ? "bg-butter text-ink" : "bg-transparent text-butter/40"
                  }`}
                >
                  {s.n}
                </div>
                <span
                  className={`font-body text-[10px] font-semibold ${
                    done || current ? "text-butter" : "text-butter/35"
                  }`}
                >
                  {s.label}
                </span>
                {s.n < 3 && (
                  <span className="text-butter/25" aria-hidden>
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center font-display text-sm font-extrabold tracking-wide text-butter">
          {copy.title}
        </p>
        <p className="mt-1 text-center font-body text-xs font-medium leading-snug text-butter/65">
          {copy.detail}
        </p>
      </div>

      <div className="relative min-h-[400px] w-full overflow-hidden border-4 border-ink bg-cabinet shadow-base">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(255,229,102,0.25),transparent_55%)]" />

        {/* Stage banner — changes with each wallet beat */}
        {stage === "settling" && (
          <div className="absolute left-3 right-3 top-3 z-30 border-2 border-ink bg-butter px-3 py-2 text-center shadow-[3px_3px_0_0_#121212]">
            <p className="font-display text-xs font-extrabold text-ink">
              Wallet popup #2 — tap Confirm to claim
            </p>
          </div>
        )}
        {stage === "betting" && (
          <div className="absolute left-3 right-3 top-3 z-30 border-2 border-ink bg-main px-3 py-2 text-center shadow-[3px_3px_0_0_#121212]">
            <p className="font-display text-xs font-extrabold text-ink">
              Wallet popup #1 — tap Confirm to start
            </p>
          </div>
        )}

        <div
          className={`absolute inset-x-0 flex flex-wrap items-center justify-center gap-3 px-3 transition-all duration-500 ${
            showHero ? "bottom-5 opacity-30" : "bottom-8 top-6 content-center"
          }`}
        >
          {BOXES.map((box) => {
            const isSelected = selectedBox === box.id;
            if (showHero && isSelected) return null;

            return (
              <motion.button
                key={box.id}
                type="button"
                disabled={!canSelect}
                onClick={() => onSelectBox(box.id)}
                whileHover={canSelect ? { y: -8, scale: 1.05 } : undefined}
                whileTap={canSelect ? { scale: 0.95 } : undefined}
                animate={{
                  opacity: selectedBox != null && !isSelected ? 0.5 : 1,
                  scale: isSelected ? 1.06 : 1,
                  y: 0,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className={`relative flex h-[104px] w-[84px] flex-col items-center justify-center overflow-hidden border-[3px] border-ink px-1.5 py-2 shadow-[4px_4px_0_0_#121212] m500:h-[88px] m500:w-[70px] ${
                  canSelect ? "cursor-pointer" : "cursor-default"
                } ${
                  isSelected
                    ? "z-10 ring-4 ring-ink ring-offset-2 ring-offset-cabinet"
                    : ""
                }`}
                style={{ backgroundColor: box.color }}
                aria-pressed={isSelected}
                aria-label={`Select box ${box.label}: ${box.name}`}
              >
                <span className="font-display text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">
                  Box {box.label}
                </span>
                <span className="mt-0.5 max-w-full truncate font-display text-sm font-extrabold leading-tight text-ink m500:text-xs">
                  {box.name}
                </span>
                {isSelected && canSelect && (
                  <span className="mt-1.5 max-w-full truncate rounded-sm border border-ink bg-ink px-1 font-display text-[8px] font-extrabold leading-none text-butter">
                    TAP AGAIN
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {showHero && pickedMeta && (
            <motion.div
              className="absolute left-1/2 top-[18%] z-20 -translate-x-1/2"
              initial={{ y: 40, scale: 0.85, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Box always keeps its original color */}
              <motion.div
                className="relative flex h-40 w-36 flex-col items-center justify-center border-[4px] border-ink shadow-base"
                style={{ backgroundColor: pickedMeta.color }}
                animate={
                  stage === "settling"
                    ? { y: [0, -6, 0], rotate: 0 }
                    : inFlight && !showPrize
                      ? { rotate: [-2.5, 2.5, -2.5], scale: [1, 1.03, 1] }
                      : { scale: showPrize ? [1, 1.06, 1] : 1 }
                }
                transition={
                  inFlight && !showPrize
                    ? { duration: 0.85, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.4 }
                }
              >
                {!showPrize ? (
                  <>
                    <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-ink/50">
                      Box {pickedMeta.label}
                    </span>
                    <motion.span
                      className="mt-2 font-display text-4xl font-extrabold text-ink"
                      animate={{ opacity: [0.45, 1, 0.45] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      {stage === "settling" ? "!" : "?"}
                    </motion.span>
                    <span className="mt-2 font-body text-xs font-semibold text-ink/60">
                      {stage === "betting"
                        ? "Waiting for sign…"
                        : stage === "settling"
                          ? "Ready to claim"
                          : "Opening…"}
                    </span>
                  </>
                ) : (
                  <motion.div
                    className="flex flex-col items-center px-2 text-center"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink/55">
                      Prize
                    </span>
                    <span className="mt-1 font-display text-xl font-extrabold leading-tight text-ink">
                      {tierName}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
