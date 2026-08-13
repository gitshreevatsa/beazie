"use client";

import { PlayButton } from "@/components/PlayButton";
import { PrizeMachine, BOXES } from "@/components/PrizeMachine";
import {
  PrizeRevealCard,
  StashStrip,
} from "@/components/PrizeRevealCard";
import { MusicToggle } from "@/components/MusicToggle";
import { useBeazieGame } from "@/hooks/useBeazieGame";
import { PULL_FEE_ETH, TIER_NAMES } from "@/utils/contract";
import type { BeazieStage } from "@/utils/beazie";
import {
  buildUnlockedPrize,
  loadCollection,
  saveToCollection,
  type UnlockedPrize,
} from "@/utils/prizes";
import { playSelectBlip } from "@/utils/veilAudio";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { useWinFx } from "@/hooks/useWinFx";
import { useEffect, useState } from "react";

const PITY_THRESHOLD = 8;

function PityMeter({ pity }: { pity: number | null }) {
  if (pity == null) return null;
  const capped = Math.min(PITY_THRESHOLD, Math.max(0, pity));
  const pct = (capped / PITY_THRESHOLD) * 100;
  const near = capped >= PITY_THRESHOLD - 1;

  return (
    <div className="border-4 border-ink bg-white px-3 py-2.5 shadow-base">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="font-display text-[10px] font-extrabold uppercase tracking-[0.22em] text-ink">
          Pity
        </p>
        <p className="font-body text-[11px] font-semibold text-ink/55">
          {capped}/{PITY_THRESHOLD}
          {near ? " · next open leans legendary" : ""}
        </p>
      </div>
      <div className="h-2 w-full border-2 border-ink bg-bg">
        <div
          className="h-full bg-butter transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 font-body text-[10px] text-ink/40">
        Private decrypt of your dry streak — only you can read it.
      </p>
    </div>
  );
}

function RoundStatus({
  stage,
  error,
  peekedSlot,
  onRetry,
}: {
  stage: BeazieStage | null;
  error: string | null;
  peekedSlot: number | null;
  onRetry?: () => void;
}) {
  if (error) {
    return (
      <div className="flex items-center gap-3 border-4 border-ink bg-main px-4 py-3 text-left text-ink shadow-base">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="flex-1 font-body text-sm font-medium">{error}</span>
        {onRetry && (
          <button
            type="button"
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
    betting: "Confirm start — drawing seed + shuffled deck",
    animating: "Encrypted handles on-chain…",
    peeking: "Private peek — sign to decrypt your card",
    revealing: "Public seed attest + private card settle…",
    settling: "Confirm claim — mint your Veil NFT",
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-2 border-4 border-ink bg-white px-4 py-3 shadow-base">
        <Loader2 className="h-4 w-4 animate-spin text-ink" />
        <span className="font-body text-sm font-semibold text-ink">
          {messages[stage]}
        </span>
      </div>
      {peekedSlot != null && (
        <p className="text-center font-body text-xs font-semibold text-ink/55">
          Peeked card slot {peekedSlot + 1}/4 (private)
        </p>
      )}
    </div>
  );
}

export default function PlayPage() {
  const {
    stage,
    error,
    result,
    isPlaying,
    play,
    reset,
    peekedSlot,
    pity,
  } = useBeazieGame();
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
      cardId: result.cardId,
      tokenId: result.tokenId,
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

  const onPick = (id: number) => {
    if (isPlaying || result) return;
    playSelectBlip();
    if (selectedBox === id) {
      void play(id);
      return;
    }
    setSelectedBox(id);
  };

  return (
    <div className="min-h-[100svh] bg-bg text-ink">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-16 pt-28 m500:pt-24">
        <header className="text-center">
          <div className="mb-2 flex items-center justify-center gap-3">
            <MusicToggle />
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] m500:text-3xl">
            Tap a box. Open it.
          </h1>
        </header>

        <PityMeter pity={pity} />

        <PrizeMachine
          stage={stage}
          active={isPlaying || Boolean(result)}
          selectedBox={selectedBox}
          onSelectBox={onPick}
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
          peekedSlot={peekedSlot}
          onRetry={selectedBox != null ? () => play(selectedBox) : undefined}
        />

        {unlocked && <PrizeRevealCard prize={unlocked} onAgain={onReset} />}

        {!result && (
          <div className="flex flex-col gap-2">
            <PlayButton
              onPlay={() => {
                if (selectedBox == null) return;
                void play(selectedBox);
              }}
              isPlaying={isPlaying}
              disabled={!canPlay}
              label={
                selected
                  ? `Open Box ${selected.label}`
                  : "Tap a box to start"
              }
            />
            <p className="text-center font-body text-xs text-ink/45">
              {PULL_FEE_ETH} ETH + Inco fees · private peek then claim NFT
            </p>
          </div>
        )}

        <StashStrip items={stash} />
      </div>
    </div>
  );
}
