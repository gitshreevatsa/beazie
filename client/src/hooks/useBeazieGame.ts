"use client";

import { useCallback, useState } from "react";
import { useGameContext } from "./useGameContext";
import { runPull, type BeazieStage, type PullResult } from "@/utils/beazie";

function friendlyError(e: unknown): string {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes("user rejected") || msg.includes("user denied"))
    return "Cancelled — you can try again anytime.";
  if (msg.includes("insufficient funds") || msg.includes("insufficientvalue"))
    return "Not enough ETH for this round.";
  if (msg.includes("attestedreveal") || msg.includes("covalidator"))
    return "Still preparing your prize — please try again.";
  if (msg.includes("alreadysettled"))
    return "This round was already uncovered.";
  return "Something went wrong. Please try again.";
}

export function useBeazieGame() {
  const { ctx, ready, isConnected } = useGameContext();
  const [stage, setStage] = useState<BeazieStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(
    async (machineId: number) => {
      if (!ctx) {
        setError("Connect a wallet to play.");
        return;
      }
      if (machineId < 0 || machineId > 4) {
        setError("Pick a box first — tap A through E.");
        return;
      }
      setError(null);
      setResult(null);
      setIsPlaying(true);
      setStage("betting");
      try {
        const res = await runPull(ctx, { machineId, onStage: setStage });
        setResult(res);
        setStage("done");
      } catch (e) {
        setError(friendlyError(e));
        setStage(null);
      } finally {
        setIsPlaying(false);
      }
    },
    [ctx]
  );

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
