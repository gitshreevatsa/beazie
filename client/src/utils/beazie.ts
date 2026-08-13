import { Lightning } from "@inco/lightning-js/lite";
import { pad, parseEventLogs, toHex } from "viem";
import type { Hex, WalletClient } from "viem";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
  simulateContract,
} from "@wagmi/core";
import { wagmiConfig } from "@/wagmi/config";
import {
  beazieClawABI,
  beazieClawAddress,
  PULL_FEE_WEI,
  TIER_NAMES,
} from "./contract";
import type { GameContext } from "@/types";

/** Fired on `window` after a pull settles so balances can refresh. */
export const BALANCE_REFRESH_EVENT = "beazie:balance-refresh";

export type BeazieStage =
  | "betting"
  | "animating"
  | "peeking"
  | "revealing"
  | "settling"
  | "done";

export interface PullResult {
  gameId: bigint;
  tier: number;
  tierName: string;
  cardId: bigint;
  tokenId: bigint;
  randomSeed: bigint;
  playTxHash: Hex;
  settleTxHash: Hex;
  seedHandle: Hex;
  cardHandle: Hex;
  /** Private card slot seen before public settle (0–3). */
  peekedSlot: number | null;
}

type Zap = Awaited<ReturnType<typeof Lightning.baseSepoliaTestnet>>;
let zapPromise: Promise<Zap> | null = null;

export function getZap(): Promise<Zap> {
  if (!zapPromise) zapPromise = Lightning.baseSepoliaTestnet();
  return zapPromise;
}

export interface SolAttestation {
  handle: Hex;
  value: Hex;
}

function formatAttestation(res: {
  handle: string;
  plaintext: { value: bigint | boolean };
  covalidatorSignatures: Uint8Array[];
}): { attestation: SolAttestation; signatures: Hex[] } {
  const raw = res.plaintext.value;
  const value = pad(
    toHex(typeof raw === "boolean" ? (raw ? 1 : 0) : raw),
    { size: 32 }
  );
  const signatures = res.covalidatorSignatures.map((s: Uint8Array) => toHex(s));
  return {
    attestation: { handle: res.handle as Hex, value },
    signatures,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Attest public reveals (Model A — seed). */
export async function revealAndFormatMany(
  handles: Hex[],
  outerRetries = 40,
  delayMs = 3000
): Promise<{ attestation: SolAttestation; signatures: Hex[] }[]> {
  const zap = await getZap();
  let lastErr: Error | undefined;
  for (let i = 0; i < outerRetries; i++) {
    try {
      const results = await zap.attestedReveal(handles, {
        backoffConfig: {
          maxRetries: 8,
          baseDelayInMs: 2000,
          backoffFactor: 1.2,
        },
      });
      return results.map(formatAttestation);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      await sleep(delayMs);
    }
  }
  throw lastErr ?? new Error("attestedReveal failed after retries");
}

export async function revealAndFormat(
  seedHandle: Hex,
  outerRetries = 40,
  delayMs = 3000
): Promise<{ attestation: SolAttestation; signatures: Hex[] }> {
  const [one] = await revealAndFormatMany([seedHandle], outerRetries, delayMs);
  return one;
}

/**
 * Private decrypt (Model B) — player-signed EIP-712.
 * Used for card settle + optional peek / pity meter.
 */
export async function decryptAndFormat(
  walletClient: WalletClient,
  handles: Hex[],
  outerRetries = 40,
  delayMs = 3000
): Promise<{ attestation: SolAttestation; signatures: Hex[]; plaintext: bigint }[]> {
  const zap = await getZap();
  let lastErr: Error | undefined;
  for (let i = 0; i < outerRetries; i++) {
    try {
      const results = await zap.attestedDecrypt(walletClient as never, handles, {
        backoffConfig: {
          maxRetries: 8,
          baseDelayInMs: 2000,
          backoffFactor: 1.2,
        },
      });
      return results.map((res) => {
        const formatted = formatAttestation(res);
        const raw = res.plaintext.value;
        const plaintext =
          typeof raw === "boolean" ? (raw ? 1n : 0n) : (raw as bigint);
        return { ...formatted, plaintext };
      });
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      await sleep(delayMs);
    }
  }
  throw lastErr ?? new Error("attestedDecrypt failed after retries");
}

/** Read pity counter privately (0 if unset / decrypt fails). */
export async function peekPity(
  walletClient: WalletClient,
  player: Hex
): Promise<number | null> {
  const handle = (await readContract(wagmiConfig, {
    address: beazieClawAddress,
    abi: beazieClawABI,
    functionName: "getPityHandle",
    args: [player],
  })) as Hex;
  if (!handle || /^0x0+$/.test(handle)) return 0;
  try {
    const [dec] = await decryptAndFormat(walletClient, [handle], 8, 1500);
    return Number(dec.plaintext);
  } catch {
    return null;
  }
}

/**
 * playPull (e.rand + shuffledRange) → private card peek → public seed reveal
 * + private card decrypt → dual-attestation settle → ERC-721 mint.
 */
export async function runPull(
  ctx: GameContext,
  opts?: {
    machineId?: number;
    animateMs?: number;
    onStage?: (stage: BeazieStage) => void;
    onSeed?: (info: {
      gameId: bigint;
      seedHandle: Hex;
      cardHandle: Hex;
      playTxHash: Hex;
    }) => void;
    onPeek?: (slot: number) => void;
  }
): Promise<PullResult> {
  const machineId = opts?.machineId;
  if (machineId == null || machineId < 0 || machineId > 4) {
    throw new Error("Pick a box first");
  }
  if (!ctx.walletClient) {
    throw new Error("Wallet client required for private decrypt");
  }
  const animateMs = opts?.animateMs ?? 1400;
  const onStage = opts?.onStage;

  let value: bigint;
  try {
    value = (await readContract(wagmiConfig, {
      address: beazieClawAddress,
      abi: beazieClawABI,
      functionName: "playCost",
    })) as bigint;
  } catch {
    const fee = (await readContract(wagmiConfig, {
      address: beazieClawAddress,
      abi: beazieClawABI,
      functionName: "getFee",
    })) as bigint;
    // Fallback: rand + 2× elist fee for 4×uint256 ≈ 9×fee
    value = PULL_FEE_WEI + 9n * fee;
  }

  onStage?.("betting");
  const play = {
    address: beazieClawAddress,
    abi: beazieClawABI,
    functionName: "playPull",
    args: [machineId],
    value,
    account: ctx.address,
  } as const;
  await simulateContract(wagmiConfig, play);
  const playHash = await writeContract(wagmiConfig, play);
  const playReceipt = await waitForTransactionReceipt(wagmiConfig, {
    hash: playHash,
  });

  const started = parseEventLogs({
    abi: beazieClawABI,
    eventName: "PullStarted",
    logs: playReceipt.logs,
  });
  if (started.length === 0) throw new Error("no PullStarted event");
  const { gameId, seedHandle, cardHandle } = started[0].args as unknown as {
    gameId: bigint;
    seedHandle: Hex;
    cardHandle: Hex;
  };

  opts?.onSeed?.({ gameId, seedHandle, cardHandle, playTxHash: playHash });

  onStage?.("animating");
  await sleep(animateMs);

  // Private peek of the deck card (player-only) before public settle.
  onStage?.("peeking");
  let peekedSlot: number | null = null;
  let cardReveal: { attestation: SolAttestation; signatures: Hex[] } | null =
    null;
  try {
    const [cardDec] = await decryptAndFormat(ctx.walletClient, [cardHandle]);
    peekedSlot = Number(cardDec.plaintext % 4n);
    opts?.onPeek?.(peekedSlot);
    cardReveal = {
      attestation: cardDec.attestation,
      signatures: cardDec.signatures,
    };
  } catch {
    // Fall through — decrypt again after seed reveal
  }

  onStage?.("revealing");
  const [seedReveal] = await revealAndFormatMany([seedHandle]);
  if (!cardReveal) {
    const [cardDec] = await decryptAndFormat(ctx.walletClient, [cardHandle]);
    peekedSlot = Number(cardDec.plaintext % 4n);
    opts?.onPeek?.(peekedSlot);
    cardReveal = {
      attestation: cardDec.attestation,
      signatures: cardDec.signatures,
    };
  }

  onStage?.("settling");
  const settleHash = await writeContract(wagmiConfig, {
    address: beazieClawAddress,
    abi: beazieClawABI,
    functionName: "settle",
    args: [
      gameId,
      seedReveal.attestation,
      seedReveal.signatures,
      cardReveal.attestation,
      cardReveal.signatures,
    ],
  });
  const settleReceipt = await waitForTransactionReceipt(wagmiConfig, {
    hash: settleHash,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BALANCE_REFRESH_EVENT));
  }

  const settled = parseEventLogs({
    abi: beazieClawABI,
    eventName: "PullSettled",
    logs: settleReceipt.logs,
  });
  if (settled.length === 0) throw new Error("no PullSettled event");
  const args = settled[0].args as unknown as {
    tier: number;
    cardId: bigint;
    randomSeed: bigint;
    tokenId: bigint;
  };

  onStage?.("done");
  return {
    gameId,
    tier: Number(args.tier),
    tierName: TIER_NAMES[Number(args.tier)] ?? "Unknown",
    cardId: args.cardId,
    tokenId: args.tokenId,
    randomSeed: args.randomSeed,
    playTxHash: playHash,
    settleTxHash: settleHash,
    seedHandle,
    cardHandle,
    peekedSlot,
  };
}

export async function getIncoFee(): Promise<bigint> {
  return (await readContract(wagmiConfig, {
    address: beazieClawAddress,
    abi: beazieClawABI,
    functionName: "getFee",
  })) as bigint;
}
