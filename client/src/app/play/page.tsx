"use client";

import { PlayButton } from "@/components/PlayButton";
import { PrizeMachine } from "@/components/PrizeMachine";
import { useBeazieGame } from "@/hooks/useBeazieGame";
import { PULL_FEE_ETH, TIER_COLORS, TIER_NAMES } from "@/utils/contract";
import type { BeazieStage } from "@/utils/beazie";
import { AlertTriangle, Check, Loader2, RotateCcw, ExternalLink } from "lucide-react";
import { useWinFx } from "@/hooks/useWinFx";
import { useEffect } from "react";
import { motion } from "framer-motion";

const STEPS: { key: BeazieStage; label: string }[] = [
  { key: "betting", label: "Start" },
  { key: "animating", label: "Play" },
  { key: "revealing", label: "Prepare" },
  { key: "settling", label: "Uncover" },
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

  useEffect(() => {
    if (result && result.tier >= 4) celebrate();
  }, [result, celebrate]);

  const basescanPlay = result
    ? `https://sepolia.basescan.org/tx/${result.playTxHash}`
    : null;

  return (
    <div className="min-h-[100svh] bg-bg text-ink">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-16 pt-28 m500:pt-24">
        <header className="text-center">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.35em] text-ink/45">
            Veil
          </p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-[-0.03em] m500:text-4xl">
            Play a round
          </h1>
          <p className="mt-3 font-body text-base font-medium leading-snug text-ink/70">
            Your prize stays private until you uncover it.
          </p>
        </header>

        <PrizeMachine stage={stage} active={isPlaying || stage === "done"} />

        <RoundStatus stage={stage} error={error} onRetry={play} />

        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border-4 border-ink px-5 py-8 text-center shadow-base"
            style={{ backgroundColor: TIER_COLORS[result.tier] ?? "#FFE566" }}
          >
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-ink/55">
              Your prize
            </p>
            <p className="mt-2 font-display text-5xl font-extrabold tracking-tight text-ink">
              {result.tierName || TIER_NAMES[result.tier]}
            </p>
            {basescanPlay && (
              <a
                href={basescanPlay}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 font-body text-sm font-semibold text-ink/70 underline"
              >
                View transaction <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              onClick={reset}
              className="mt-5 block w-full border-2 border-ink bg-ink px-3 py-2.5 font-display text-sm font-bold text-butter"
            >
              Play again
            </button>
          </motion.div>
        )}

        {!result && (
          <div className="flex flex-col gap-3">
            <p className="text-center font-body text-sm text-ink/55">
              {PULL_FEE_ETH} ETH per round
            </p>
            <PlayButton onPlay={play} isPlaying={isPlaying} label="Play" />
            <p className="text-center font-body text-xs text-ink/45">
              Results stay hidden until you uncover them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
