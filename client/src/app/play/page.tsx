"use client";

import { PlayButton } from "@/components/PlayButton";
import { PrizeMachine, BOXES } from "@/components/PrizeMachine";
import {
  PrizeRevealCard,
  StashStrip,
} from "@/components/PrizeRevealCard";
import { useBeazieGame } from "@/hooks/useBeazieGame";
import { PULL_FEE_ETH, TIER_NAMES } from "@/utils/contract";
import type { BeazieStage } from "@/utils/beazie";
import {
  buildUnlockedPrize,
  loadCollection,
  saveToCollection,
  type UnlockedPrize,
} from "@/utils/prizes";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { useWinFx } from "@/hooks/useWinFx";
import { useEffect, useState } from "react";

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

  const messages: Record<Exclude<BeazieStage, "done">, string> = {
    betting: "Confirm in your wallet…",
    animating: "Locking your box…",
    revealing: "Unsealing the prize…",
    settling: "Opening your box…",
  };

  return (
    <div className="flex items-center justify-center gap-2 border-4 border-ink bg-white px-4 py-3 shadow-base">
      <Loader2 className="h-4 w-4 animate-spin text-ink" />
      <span className="font-body text-sm font-semibold text-ink">
        {messages[stage]}
      </span>
    </div>
  );
}

export default function PlayPage() {
  const { stage, error, result, isPlaying, play, reset } = useBeazieGame();
  const celebrate = useWinFx();
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [unlocked, setUnlocked] = useState<UnlockedPrize | null>(null);
  const [stash, setStash] = useState<UnlockedPrize[]>([]);

  useEffect(() => {
    setStash(loadCollection());
  }, []);

  useEffect(() => {
    if (!result) {
      setUnlocked(null);
      return;
    }
    celebrate();
    const selected = selectedBox != null ? BOXES[selectedBox] : null;
    const prize = buildUnlockedPrize({
      tier: result.tier,
      tierName: result.tierName || TIER_NAMES[result.tier],
      randomSeed: result.randomSeed,
      gameId: result.gameId,
      playTxHash: result.playTxHash,
      boxLabel: selected?.label,
    });
    setUnlocked(prize);
    setStash(saveToCollection(prize));
  }, [result, celebrate, selectedBox]);

  const selected = selectedBox != null ? BOXES[selectedBox] : null;
  const canPlay = selectedBox != null && !isPlaying;

  const onReset = () => {
    reset();
    setUnlocked(null);
    setSelectedBox(null);
  };

  return (
    <div className="min-h-[100svh] bg-bg text-ink">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-16 pt-28 m500:pt-24">
        <header className="text-center">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.35em] text-ink/45">
            How to play
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.03em] m500:text-3xl">
            Pick a box. Win a prize.
          </h1>
          <ol className="mx-auto mt-4 max-w-sm space-y-1.5 text-left font-body text-sm font-medium text-ink/70">
            <li>
              <span className="font-display font-bold text-ink">1.</span> Tap one
              of the five boxes
            </li>
            <li>
              <span className="font-display font-bold text-ink">2.</span> Press{" "}
              <span className="text-ink">Open</span> (connect wallet if asked)
            </li>
            <li>
              <span className="font-display font-bold text-ink">3.</span> Unlock a
              named prize — rarity from Common to Legendary
            </li>
          </ol>
          <p className="mt-3 font-body text-[11px] text-ink/40">
            Odds: Common 60% · Uncommon 25% · Rare 10% · Epic 4% · Legendary 1%
          </p>
        </header>

        <PrizeMachine
          stage={stage}
          active={isPlaying || Boolean(result)}
          selectedBox={selectedBox}
          onSelectBox={setSelectedBox}
          tier={result?.tier ?? null}
          tierName={
            unlocked?.prize.name ??
            result?.tierName ??
            (result ? TIER_NAMES[result.tier] : null)
          }
        />

        <RoundStatus
          stage={stage}
          error={error}
          onRetry={selectedBox != null ? play : undefined}
        />

        {unlocked && <PrizeRevealCard prize={unlocked} onAgain={onReset} />}

        {!result && (
          <div className="flex flex-col gap-3">
            {!selected && !isPlaying && (
              <p className="animate-pulse text-center font-display text-sm font-bold text-ink">
                ↑ Tap a box first — then this button unlocks
              </p>
            )}
            {selected && !isPlaying && (
              <p className="text-center font-body text-sm font-semibold text-ink/70">
                Selected: Box {selected.label} · {selected.name}
              </p>
            )}
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
              Costs {PULL_FEE_ETH} ETH · prize stays hidden until open
            </p>
          </div>
        )}

        <StashStrip items={stash} />
      </div>
    </div>
  );
}
