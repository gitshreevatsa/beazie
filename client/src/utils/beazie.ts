import { Lightning } from "@inco/lightning-js/lite";
import { pad, parseEventLogs, toHex } from "viem";
import type { Hex } from "viem";
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
  | "revealing"
  | "settling"
  | "done";

export interface PullResult {
  gameId: bigint;
  tier: number;
  tierName: string;
  cardId: bigint;
  randomSeed: bigint;
  playTxHash: Hex;
  settleTxHash: Hex;
  seedHandle: Hex;
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

export async function revealAndFormat(
  seedHandle: Hex,
  outerRetries = 40,
  delayMs = 3000
): Promise<{ attestation: SolAttestation; signatures: Hex[] }> {
  const zap = await getZap();
  let lastErr: Error | undefined;
  for (let i = 0; i < outerRetries; i++) {
    try {
      const [res] = await zap.attestedReveal([seedHandle], {
        backoffConfig: {
          maxRetries: 8,
          baseDelayInMs: 2000,
          backoffFactor: 1.2,
        },
      });
      const raw: bigint | boolean = res.plaintext.value;
      const value = pad(
        toHex(typeof raw === "boolean" ? (raw ? 1 : 0) : raw),
        { size: 32 }
      );
      const signatures = res.covalidatorSignatures.map((s: Uint8Array) =>
        toHex(s)
      );
      return { attestation: { handle: res.handle as Hex, value }, signatures };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr ?? new Error("attestedReveal failed after retries");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Full claw pull: playPull → animate → attestedReveal → settle → tier.
 */
export async function runPull(
  ctx: GameContext,
  opts?: {
    machineId?: number;
    animateMs?: number;
    onStage?: (stage: BeazieStage) => void;
  }
): Promise<PullResult> {
  const machineId = opts?.machineId;
  if (machineId == null || machineId < 0 || machineId > 4) {
    throw new Error("Pick a box first");
  }
  const animateMs = opts?.animateMs ?? 1400;
  const onStage = opts?.onStage;

  const fee = (await readContract(wagmiConfig, {
    address: beazieClawAddress,
    abi: beazieClawABI,
    functionName: "getFee",
  })) as bigint;

  onStage?.("betting");
  const play = {
    address: beazieClawAddress,
    abi: beazieClawABI,
    functionName: "playPull",
    args: [machineId],
    value: PULL_FEE_WEI + fee,
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
  const { gameId, seedHandle } = started[0].args as unknown as {
    gameId: bigint;
    seedHandle: Hex;
  };

  // Client-only wait — short; screen already moves on stage change.
  onStage?.("animating");
  await sleep(animateMs);

  onStage?.("revealing");
  const { attestation, signatures } = await revealAndFormat(seedHandle);

  onStage?.("settling");
  const settleHash = await writeContract(wagmiConfig, {
    address: beazieClawAddress,
    abi: beazieClawABI,
    functionName: "settle",
    args: [gameId, attestation, signatures],
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
  };

  onStage?.("done");
  return {
    gameId,
    tier: Number(args.tier),
    tierName: TIER_NAMES[Number(args.tier)] ?? "Unknown",
    cardId: args.cardId,
    randomSeed: args.randomSeed,
    playTxHash: playHash,
    settleTxHash: settleHash,
    seedHandle,
  };
}

export async function getIncoFee(): Promise<bigint> {
  return (await readContract(wagmiConfig, {
    address: beazieClawAddress,
    abi: beazieClawABI,
    functionName: "getFee",
  })) as bigint;
}
