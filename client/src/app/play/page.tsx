"use client";

import { PlayButton } from "@/components/PlayButton";
import { PrizeMachine, BOXES } from "@/components/PrizeMachine";
import { useBeazieGame } from "@/hooks/useBeazieGame";
import { PULL_FEE_ETH, TIER_NAMES } from "@/utils/contract";
import type { BeazieStage } from "@/utils/beazie";
import { AlertTriangle, Check, Loader2, RotateCcw, ExternalLink } from "lucide-react";
import { useWinFx } from "@/hooks/useWinFx";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const STEPS: { key: BeazieStage; label: string }[] = [
  { key: "betting", label: "Confirm" },
  { key: "animating", label: "Lock" },
  { key: "revealing", label: "Seal" },
  { key: "settling", label: "Open" },
];

function RoundStatus({
  stage,
  error,
  onRetry,
}: {
  stage: BeazieStage | null;
  error: string | null;
  onRetry?: () => void;
}) {
  if (error) {
    return (
      <div className="flex items-center gap-3 border-4 border-ink bg-main px-4 py-3 text-left text-ink shadow-base">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="flex-1 font-body text-sm font-medium">{error}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 border-2 border-ink bg-butter px-3 py-1.5 font-display text-sm font-bold"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        )}
      </div>
    );
  }
  if (!stage || stage === "done") return null;
  const active = STEPS.findIndex((s) => s.key === stage);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-4 border-ink bg-white px-4 py-3 shadow-base">
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            <div
              className={`flex h-6 w-6 items-center justify-center border-2 border-ink ${
                done ? "bg-bg" : current ? "bg-butter" : "bg-white"
              }`}
            >
              {done ? (
                <Check className="h-3.5 w-3.5" />
              ) : current ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span className="font-display text-[10px] font-bold">{i + 1}</span>
              )}
            </div>
            <span className="font-body text-xs font-medium text-ink/70">
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PlayPage() {
  const { stage, error, result, isPlaying, play, reset } = useBeazieGame();
  const celebrate = useWinFx();
  const [selectedBox, setSelectedBox] = useState<number | null>(null);

  useEffect(() => {
    if (result) celebrate();
  }, [result, celebrate]);

  const basescanPlay = result
    ? `https://sepolia.basescan.org/tx/${result.playTxHash}`
    : null;

  const selected = selectedBox != null ? BOXES[selectedBox] : null;
  const canPlay = selectedBox != null && !isPlaying;

  const onReset = () => {
    reset();
    setSelectedBox(null);
  };

  return (
    <div className="min-h-[100svh] bg-bg text-ink">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-16 pt-28 m500:pt-24">
        <header className="text-center">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.35em] text-ink/45">
            Veil
          </p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-[-0.03em] m500:text-4xl">
            Pick a box
          </h1>
          <p className="mt-3 font-body text-base font-medium leading-snug text-ink/70">
            Choose one, then open it. Your prize stays private until it unlocks.
          </p>
        </header>

        <PrizeMachine
          stage={stage}
          active={isPlaying || Boolean(result)}
          selectedBox={selectedBox}
          onSelectBox={setSelectedBox}
          tier={result?.tier ?? null}
          tierName={
            result?.tierName ?? (result ? TIER_NAMES[result.tier] : null)
          }
        />

        <RoundStatus
          stage={stage}
          error={error}
          onRetry={selectedBox != null ? play : undefined}
        />

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-4 border-ink bg-ink px-5 py-5 text-center shadow-base"
          >
            <p className="font-body text-sm text-butter/70">
              Box {selected?.label ?? "?"} opened —{" "}
              <span className="font-display font-bold text-butter">
                {result.tierName || TIER_NAMES[result.tier]}
              </span>
            </p>
            {basescanPlay && (
              <a
                href={basescanPlay}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 font-body text-xs font-semibold text-butter/50 underline"
              >
                Round receipt <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              onClick={onReset}
              className="mt-4 block w-full border-2 border-butter bg-butter px-3 py-2.5 font-display text-sm font-bold text-ink"
            >
              Pick another box
            </button>
          </motion.div>
        )}

        {!result && (
          <div className="flex flex-col gap-3">
            <p className="text-center font-body text-sm text-ink/55">
              {selected
                ? `Selected · Box ${selected.label} (${selected.name})`
                : "Select a box above to continue"}
            </p>
            <PlayButton
              onPlay={play}
              isPlaying={isPlaying}
              disabled={!canPlay}
              label={
                selected
                  ? `Open Box ${selected.label}`
                  : "Select a box first"
              }
            />
            <p className="text-center font-body text-xs text-ink/45">
              {PULL_FEE_ETH} ETH · outcome stays sealed until open
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
