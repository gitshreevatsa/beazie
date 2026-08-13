"use client";

import { useCallback, useEffect, useState } from "react";
import { useGameContext } from "./useGameContext";
import {
  peekPity,
  runPull,
  type BeazieStage,
  type PullResult,
} from "@/utils/beazie";
import type { Hex } from "viem";

function friendlyError(e: unknown): string {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes("user rejected") || msg.includes("user denied"))
    return "Cancelled — you can try again anytime.";
  if (msg.includes("insufficient funds") || msg.includes("insufficientvalue"))
    return "Not enough ETH for this round.";
  if (
    msg.includes("attestedreveal") ||
    msg.includes("attesteddecrypt") ||
    msg.includes("covalidator")
  )
    return "Still preparing your prize — please try again.";
  if (msg.includes("alreadysettled"))
    return "This round was already uncovered.";
  return "Something went wrong. Please try again.";
}

export type LiveSeed = {
  gameId: bigint;
  seedHandle: Hex;
  cardHandle: Hex;
  playTxHash: Hex;
};

export function useBeazieGame() {
  const { ctx, ready, isConnected } = useGameContext();
  const [stage, setStage] = useState<BeazieStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullResult | null>(null);
  const [liveSeed, setLiveSeed] = useState<LiveSeed | null>(null);
  const [peekedSlot, setPeekedSlot] = useState<number | null>(null);
  const [pity, setPity] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const refreshPity = useCallback(async () => {
    if (!ctx?.walletClient || !ctx.address) {
      setPity(null);
      return;
    }
    const n = await peekPity(ctx.walletClient, ctx.address);
    setPity(n);
  }, [ctx]);

  useEffect(() => {
    void refreshPity();
  }, [refreshPity]);

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
      setLiveSeed(null);
      setPeekedSlot(null);
      setIsPlaying(true);
      setStage("betting");
      try {
        const res = await runPull(ctx, {
          machineId,
          onStage: setStage,
          onSeed: setLiveSeed,
          onPeek: setPeekedSlot,
        });
        setResult(res);
        setStage("done");
        void refreshPity();
      } catch (e) {
        setError(friendlyError(e));
        setStage(null);
      } finally {
        setIsPlaying(false);
      }
    },
    [ctx, refreshPity]
  );

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setLiveSeed(null);
    setPeekedSlot(null);
    setStage(null);
  }, []);

  return {
    ctx,
    ready,
    isConnected,
    stage,
    error,
    result,
    liveSeed,
    peekedSlot,
    pity,
    isPlaying,
    play,
    reset,
    refreshPity,
  };
}
