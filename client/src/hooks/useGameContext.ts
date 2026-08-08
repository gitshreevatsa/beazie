"use client";

import { useAccount, useWalletClient } from "wagmi";
import type { GameContext } from "@/types";

/**
 * Wallet context for game actions, from wagmi. Transactions run via the wagmi
 * config's connected account; `ctx` is non-null only once a wallet is connected.
 */
export function useGameContext() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const ready = Boolean(isConnected && address && walletClient);
  const ctx: GameContext | null = ready && address ? { address } : null;

  return { ctx, ready, address, isConnected };
}
