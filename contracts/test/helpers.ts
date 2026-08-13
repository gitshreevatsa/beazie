import { Lightning } from "@inco/lightning-js/lite";
import { pad, toHex, bytesToHex } from "viem";
import type { WalletClient } from "viem";

export type Zap = Awaited<ReturnType<typeof Lightning.localNode>>;

// Solidity DecryptionAttestation { bytes32 handle; bytes32 value; }.
export interface SolAttestation {
  handle: `0x${string}`;
  value: `0x${string}`;
}

// Local node for chain 31337, else Inco Base Sepolia testnet (default 2-of-2 quorum).
export async function initZap(chainId: number): Promise<Zap> {
  if (chainId === 31337) return Lightning.localNode("mainnet");
  return Lightning.baseSepoliaTestnet();
}

function formatResult(res: {
  handle: string;
  plaintext: { value: bigint | boolean };
  covalidatorSignatures: Uint8Array[];
}): { attestation: SolAttestation; signatures: `0x${string}`[] } {
  const rawValue = (res.plaintext as { value: bigint | boolean }).value;
  const value = pad(toHex(typeof rawValue === "boolean" ? (rawValue ? 1 : 0) : rawValue), {
    size: 32,
  });
  const signatures = res.covalidatorSignatures.map((s) => bytesToHex(s));
  return { attestation: { handle: res.handle as `0x${string}`, value }, signatures };
}

// Fetch the attestation for a revealed handle, formatted for settle().
export async function revealAndFormat(
  zap: Zap,
  handle: `0x${string}`,
  maxRetries = 20,
  retryDelayMs = 3000
): Promise<{ attestation: SolAttestation; signatures: `0x${string}`[] }> {
  let lastErr: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const [res] = await zap.attestedReveal([handle]);
      return formatResult(res);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  throw lastErr ?? new Error("attestedReveal failed after retries");
}

/** Private decrypt attestation (card — not publicly revealed). */
export async function decryptAndFormat(
  zap: Zap,
  walletClient: WalletClient,
  handle: `0x${string}`,
  maxRetries = 20,
  retryDelayMs = 3000
): Promise<{ attestation: SolAttestation; signatures: `0x${string}`[] }> {
  let lastErr: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const [res] = await zap.attestedDecrypt(walletClient as never, [handle]);
      return formatResult(res);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  throw lastErr ?? new Error("attestedDecrypt failed after retries");
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
