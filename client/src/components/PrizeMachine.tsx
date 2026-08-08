"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BeazieStage } from "@/utils/beazie";
import { TIER_COLORS, TIER_NAMES } from "@/utils/contract";

export const BOXES = [
  { id: 0, label: "A", name: "Amber", color: "#FFE566" },
  { id: 1, label: "B", name: "Bloom", color: "#FF5A5F" },
  { id: 2, label: "C", name: "Cove", color: "#7FCFB8" },
  { id: 3, label: "D", name: "Dawn", color: "#6EB5FF" },
  { id: 4, label: "E", name: "Ember", color: "#FF8A8E" },
] as const;

type Phase = "idle" | "locking" | "sealed" | "reveal";

function phaseCopy(phase: Phase, selected: number | null): {
  title: string;
  detail: string;
} {
  if (phase === "idle") {
    if (selected == null) {
      return {
        title: "Step 1 — Pick a box",
        detail: "Tap any colored box below. Only one can be yours.",
      };
    }
    return {
      title: "Step 2 — Open it",
      detail: `Box ${BOXES[selected].label} is selected. Hit the big button under the machine.`,
    };
  }
  if (phase === "locking") {
    return {
      title: "Locking your pick…",
      detail: "Approve in your wallet if it asks. We’re sealing this round.",
    };
  }
  if (phase === "sealed") {
    return {
      title: "Prize is sealed",
      detail: "Nobody can peek yet — including us. Opening in a moment…",
    };
  }
  return {
    title: "Opened!",
    detail: "Your rarity is revealed below.",
  };
}

/** Interactive mystery boxes — tap to choose, then open. */
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
  const [phase, setPhase] = useState<Phase>("idle");
  const [lidOpen, setLidOpen] = useState(false);
  const canSelect = !active && phase === "idle" && !tier;
  const copy = phaseCopy(phase, selectedBox);

  useEffect(() => {
    if (stage === "done" && tier) {
      setPhase("reveal");
      setLidOpen(false);
      const t = setTimeout(() => setLidOpen(true), 500);
      return () => clearTimeout(t);
    }
    if (!active || !stage) {
      setPhase("idle");
      setLidOpen(false);
      return;
    }
    if (stage === "betting" || stage === "animating") {
      setPhase("locking");
      const t = setTimeout(() => setPhase("sealed"), 1600);
      return () => clearTimeout(t);
    }
    if (stage === "revealing" || stage === "settling") {
      setPhase("sealed");
    }
  }, [stage, active, tier]);

  const picked = selectedBox ?? 0;
  const pickedMeta = BOXES[picked] ?? BOXES[0];
  const revealColor = tier ? TIER_COLORS[tier] ?? "#FFE566" : pickedMeta.color;
  const revealLabel = tierName || (tier ? TIER_NAMES[tier] : "");
  const showHero = phase === "sealed" || phase === "reveal";

  return (
    <div className="relative mx-auto w-full">
      {/* Live coach */}
      <div className="border-4 border-b-0 border-ink bg-ink px-4 py-3 text-center">
        <p className="font-display text-sm font-extrabold tracking-wide text-butter">
          {copy.title}
        </p>
        <p className="mt-1 font-body text-xs font-medium leading-snug text-butter/65">
          {copy.detail}
        </p>
      </div>

      <div className="relative min-h-[400px] w-full overflow-hidden border-4 border-ink bg-cabinet shadow-base">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(255,229,102,0.25),transparent_55%)]" />

        {/* Box grid */}
        <div
          className={`absolute inset-x-0 flex flex-wrap items-center justify-center gap-3 px-3 transition-all duration-500 ${
            showHero ? "bottom-5 opacity-35" : "bottom-8 top-6 content-center"
          }`}
        >
          {BOXES.map((box) => {
            const isSelected = selectedBox === box.id;
            const isHero = showHero && isSelected;
            if (isHero) return null;

            return (
              <motion.button
                key={box.id}
                type="button"
                disabled={!canSelect}
                onClick={() => onSelectBox(box.id)}
                whileHover={canSelect ? { y: -8, scale: 1.05 } : undefined}
                whileTap={canSelect ? { scale: 0.95 } : undefined}
                animate={
                  phase === "locking" && isSelected
                    ? { y: [0, -18, 0], scale: [1, 1.1, 1] }
                    : phase === "locking" && !isSelected
                      ? { opacity: 0.3, scale: 0.9 }
                      : {
                          opacity: 1,
                          scale: isSelected ? 1.08 : 1,
                          y: canSelect && selectedBox == null ? [0, -4, 0] : 0,
                        }
                }
                transition={
                  canSelect && selectedBox == null
                    ? {
                        y: {
                          duration: 1.6 + box.id * 0.12,
                          repeat: Infinity,
                          ease: "easeInOut",
                        },
                        scale: { type: "spring", stiffness: 220, damping: 16 },
                      }
                    : { type: "spring", stiffness: 220, damping: 16 }
                }
                className={`relative flex h-[100px] w-[78px] flex-col items-center justify-center border-[3px] border-ink shadow-[4px_4px_0_0_#121212] m500:h-[84px] m500:w-[66px] ${
                  canSelect ? "cursor-pointer" : "cursor-default"
                } ${
                  isSelected
                    ? "z-10 ring-4 ring-butter ring-offset-2 ring-offset-cabinet"
                    : ""
                }`}
                style={{ backgroundColor: box.color }}
                aria-pressed={isSelected}
                aria-label={`Select box ${box.label}: ${box.name}`}
              >
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-ink/50">
                  Box {box.label}
                </span>
                <span className="mt-1 font-display text-base font-extrabold leading-none text-ink m500:text-sm">
                  {box.name}
                </span>
                {isSelected && canSelect && (
                  <span className="absolute -top-3 rounded-sm border-2 border-ink bg-main px-1.5 font-display text-[10px] font-extrabold text-ink shadow-[2px_2px_0_0_#121212]">
                    ✓ YOURS
                  </span>
                )}
                {canSelect && !isSelected && selectedBox == null && (
                  <span className="absolute -bottom-2.5 rounded-sm border border-ink bg-butter px-1 font-display text-[8px] font-bold text-ink">
                    TAP
                  </span>
                )}
                <div className="pointer-events-none absolute left-2 right-2 top-[24%] h-[2px] bg-ink/15" />
              </motion.button>
            );
          })}
        </div>

        {/* Hero sealed / open box */}
        <AnimatePresence>
          {showHero && (
            <motion.div
              className="absolute left-1/2 top-[16%] z-20 -translate-x-1/2"
              initial={{ y: 60, scale: 0.7, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
            >
              <motion.div
                className="relative flex h-40 w-36 flex-col items-center justify-center border-[4px] border-ink shadow-base"
                style={{
                  backgroundColor:
                    phase === "reveal" && lidOpen ? revealColor : pickedMeta.color,
                }}
                animate={
                  phase === "sealed"
                    ? { rotate: [-2, 2, -2], y: [0, -5, 0] }
                    : { scale: lidOpen ? [1, 1.06, 1] : 1 }
                }
                transition={
                  phase === "sealed"
                    ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.5 }
                }
              >
                {!lidOpen ? (
                  <>
                    <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-ink/50">
                      Box {pickedMeta.label}
                    </span>
                    <span className="mt-2 font-display text-4xl font-extrabold text-ink">
                      ?
                    </span>
                    <span className="mt-2 font-body text-xs font-semibold text-ink/55">
                      Still sealed
                    </span>
                    <motion.div
                      className="pointer-events-none absolute inset-0 border-4 border-butter/70"
                      animate={{ opacity: [0.25, 0.95, 0.25] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </>
                ) : (
                  <motion.div
                    className="flex flex-col items-center px-2 text-center"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  >
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink/55">
                      Unlocked
                    </span>
                    <span className="mt-1 font-display text-xl font-extrabold leading-tight text-ink">
                      {revealLabel}
                    </span>
                  </motion.div>
                )}
              </motion.div>

              {lidOpen &&
                [0, 1, 2, 3, 4, 5].map((p) => (
                  <motion.div
                    key={p}
                    className="absolute left-1/2 top-1/2 h-3 w-3 border-2 border-ink"
                    style={{ backgroundColor: BOXES[p % BOXES.length].color }}
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{
                      x: Math.cos((p / 6) * Math.PI * 2) * 72,
                      y: Math.sin((p / 6) * Math.PI * 2) * 72,
                      opacity: 0,
                    }}
                    transition={{ duration: 0.65, ease: "easeOut" }}
                  />
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
