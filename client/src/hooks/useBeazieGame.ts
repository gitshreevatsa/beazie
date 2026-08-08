"use client";

import { useCallback, useState } from "react";
import { useGameContext } from "./useGameContext";
import { runPull, type BeazieStage, type PullResult } from "@/utils/beazie";

function friendlyError(e: unknown): string {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes("user rejected") || msg.includes("user denied"))
    return "You backed out — try the drop again.";
  if (msg.includes("insufficient funds"))
    return "Not enough ETH for a credit.";
  if (msg.includes("insufficientvalue"))
    return "Need a bit more ETH for this drop.";
  if (msg.includes("attestedreveal") || msg.includes("covalidator"))
    return "Prize is still sealed — try claiming again.";
  if (msg.includes("alreadysettled"))
    return "You already claimed this prize.";
  return "The machine hiccuped. Try again.";
}

/** Manages drop → grab → claim lifecycle. */
export function useBeazieGame() {
  const { ctx, ready, isConnected } = useGameContext();
  const [stage, setStage] = useState<BeazieStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(async () => {
    if (!ctx) {
      setError("Connect a wallet to play.");
      return;
    }
    setError(null);
    setResult(null);
    setIsPlaying(true);
    setStage("betting");
    try {
      const res = await runPull(ctx, { onStage: setStage });
      setResult(res);
      setStage("done");
    } catch (e) {
      setError(friendlyError(e));
      setStage(null);
    } finally {
      setIsPlaying(false);
    }
  }, [ctx]);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setStage(null);
  }, []);

  return {
    ctx,
    ready,
    isConnected,
    stage,
    error,
    result,
    isPlaying,
    play,
    reset,
  };
}
