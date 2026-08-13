// Inco Lightning BeazieClaw — Base Sepolia (chainId 84532).
// Address from contracts/deployments/baseSepolia.json (placeholder until deploy).
import type { Abi, Address } from "viem";
import { parseEther } from "viem";

import BeazieClawABI from "@/abi/beazieClaw.json";

export const beazieClawABI = BeazieClawABI as Abi;

/** Set via NEXT_PUBLIC_BEAZIE_CLAW_ADDRESS after deploy; falls back to Base Sepolia deploy. */
export const beazieClawAddress: Address = (process.env
  .NEXT_PUBLIC_BEAZIE_CLAW_ADDRESS ||
  "0x558e51069b72e922b081f3c29ac995484e66f721") as Address;

export const PULL_FEE_ETH = "0.0001";
export const PULL_FEE_WEI = parseEther(PULL_FEE_ETH);

export const TIER_NAMES: Record<number, string> = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Epic",
  5: "Legendary",
};

export const TIER_COLORS: Record<number, string> = {
  1: "#D4D4D4",
  2: "#7FCFB8",
  3: "#6EB5FF",
  4: "#FF8A8E",
  5: "#FFE566",
};

