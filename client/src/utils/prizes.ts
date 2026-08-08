import { TIER_COLORS, TIER_NAMES } from "@/utils/contract";

export type PrizeTier = 1 | 2 | 3 | 4 | 5;

export interface PrizeDef {
  id: string;
  name: string;
  blurb: string;
}

/** Flavor prizes per rarity — UI collectibles until on-chain NFT (v1). */
export const PRIZE_POOL: Record<PrizeTier, PrizeDef[]> = {
  1: [
    { id: "c-stub", name: "Paper Stub", blurb: "A faded ticket. Still counts." },
    { id: "c-pebble", name: "Lucky Pebble", blurb: "Warm from someone’s pocket." },
    { id: "c-ribbon", name: "Twisted Ribbon", blurb: "Tied once. Never again." },
    { id: "c-coin", name: "Dull Token", blurb: "Looks valuable. Isn’t. Yet." },
  ],
  2: [
    { id: "u-charm", name: "Mint Charm", blurb: "Smells like a fresh open." },
    { id: "u-key", name: "Brass Keybit", blurb: "Fits a lock you haven’t found." },
    { id: "u-seal", name: "Wax Seal", blurb: "Someone meant this for you." },
    { id: "u-lens", name: "Fog Lens", blurb: "Makes the ordinary look strange." },
  ],
  3: [
    { id: "r-mirror", name: "Pocket Mirror", blurb: "Reflects what you almost won." },
    { id: "r-map", name: "Torn Map Corner", blurb: "Points somewhere interesting." },
    { id: "r-ring", name: "Signal Ring", blurb: "Hums when a rare pull is near." },
    { id: "r-flask", name: "Veil Flask", blurb: "Empty. Still somehow heavy." },
  ],
  4: [
    { id: "e-mask", name: "Night Mask", blurb: "Wear it and the room goes quiet." },
    { id: "e-compass", name: "Spin Compass", blurb: "Never points north. Always luck." },
    { id: "e-crown", name: "Wire Crown", blurb: "Thin metal. Heavy reputation." },
    { id: "e-orb", name: "Pulse Orb", blurb: "Thumps in time with the seal." },
  ],
  5: [
    { id: "l-core", name: "Golden Core", blurb: "The prize everyone pretends not to want." },
    { id: "l-shard", name: "Star Shard", blurb: "1% energy. 100% flex." },
    { id: "l-deed", name: "Vault Deed", blurb: "Placeholder for the real vault. Someday." },
    { id: "l-sigil", name: "Veil Sigil", blurb: "Legendary ink. Hard to scrub off." },
  ],
};

export const TIER_ODDS: Record<PrizeTier, string> = {
  1: "60%",
  2: "25%",
  3: "10%",
  4: "4%",
  5: "1%",
};

export const TIER_FLAIR: Record<PrizeTier, string> = {
  1: "Everyday find",
  2: "Nice pull",
  3: "Solid score",
  4: "Show this off",
  5: "Jackpot energy",
};

export interface UnlockedPrize {
  tier: PrizeTier;
  tierName: string;
  color: string;
  prize: PrizeDef;
  gameId: string;
  playTxHash: string;
  unlockedAt: number;
  boxLabel?: string;
}

/** Deterministic prize pick from on-chain seed so the same round always shows the same item. */
export function prizeFromSeed(
  tier: number,
  randomSeed: bigint | string | number
): PrizeDef {
  const t = (Math.min(5, Math.max(1, tier)) || 1) as PrizeTier;
  const pool = PRIZE_POOL[t];
  const seed =
    typeof randomSeed === "bigint"
      ? randomSeed
      : BigInt(randomSeed ?? 0);
  const idx = Number(seed % BigInt(pool.length));
  return pool[idx] ?? pool[0];
}

export function buildUnlockedPrize(input: {
  tier: number;
  tierName?: string;
  randomSeed: bigint | string | number;
  gameId: bigint | string | number;
  playTxHash: string;
  boxLabel?: string;
}): UnlockedPrize {
  const tier = (Math.min(5, Math.max(1, input.tier)) || 1) as PrizeTier;
  return {
    tier,
    tierName: input.tierName || TIER_NAMES[tier],
    color: TIER_COLORS[tier],
    prize: prizeFromSeed(tier, input.randomSeed),
    gameId: String(input.gameId),
    playTxHash: input.playTxHash,
    unlockedAt: Date.now(),
    boxLabel: input.boxLabel,
  };
}

const COLLECTION_KEY = "veil:collection";

export function loadCollection(): UnlockedPrize[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UnlockedPrize[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToCollection(prize: UnlockedPrize): UnlockedPrize[] {
  const prev = loadCollection().filter((p) => p.gameId !== prize.gameId);
  const next = [prize, ...prev].slice(0, 40);
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(next));
  return next;
}
