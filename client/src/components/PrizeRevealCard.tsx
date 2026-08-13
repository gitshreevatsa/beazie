"use client";

import { motion } from "framer-motion";
import { ExternalLink, Sparkles } from "lucide-react";
import {
  TIER_FLAIR,
  TIER_ODDS,
  type UnlockedPrize,
} from "@/utils/prizes";
import { beazieClawAddress } from "@/utils/contract";

export function PrizeRevealCard({
  prize,
  onAgain,
}: {
  prize: UnlockedPrize;
  onAgain: () => void;
}) {
  const basescan = `https://sepolia.basescan.org/tx/${prize.playTxHash}`;
  const isHot = prize.tier >= 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="overflow-hidden border-4 border-ink bg-ink shadow-base"
    >
      <div
        className="border-b-4 border-ink px-4 py-2 text-center"
        style={{ backgroundColor: prize.color }}
      >
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-ink/60">
          {TIER_FLAIR[prize.tier]} · {TIER_ODDS[prize.tier]} drop
        </p>
        <p className="font-display text-lg font-extrabold text-ink">
          {prize.tierName}
        </p>
      </div>

      <div className="relative px-5 pb-5 pt-6 text-center">
        {isHot && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,229,102,0.25),transparent_55%)]"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}

        <div
          className="relative mx-auto flex h-28 w-28 items-center justify-center border-4 border-butter shadow-[6px_6px_0_0_#FFE566]"
          style={{ backgroundColor: prize.color }}
        >
          <Sparkles className="absolute right-2 top-2 h-4 w-4 text-ink/50" />
          <span className="font-display text-4xl font-extrabold text-ink">
            {prize.prize.name.charAt(0)}
          </span>
        </div>

        <h2 className="relative mt-5 font-display text-3xl font-extrabold tracking-tight text-butter">
          {prize.prize.name}
        </h2>
        <p className="relative mt-2 font-body text-sm font-medium leading-snug text-butter/65">
          {prize.prize.blurb}
        </p>

        <p className="relative mt-4 font-body text-xs text-butter/40">
          {prize.boxLabel ? `From Box ${prize.boxLabel} · ` : ""}
          {prize.tokenId ? `NFT #${prize.tokenId} · ` : ""}
          Saved to your stash on this device
        </p>

        <div className="relative mt-3 flex flex-wrap items-center justify-center gap-3">
          <a
            href={basescan}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-body text-xs font-semibold text-butter/50 underline"
          >
            Play tx <ExternalLink className="h-3 w-3" />
          </a>
          {prize.tokenId && (
            <a
              href={`https://sepolia.basescan.org/token/${beazieClawAddress}?a=${prize.tokenId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-body text-xs font-semibold text-butter/50 underline"
            >
              NFT on Basescan <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <button
          onClick={onAgain}
          className="relative mt-5 block w-full border-2 border-butter bg-butter px-3 py-3 font-display text-sm font-bold text-ink"
        >
          Open another box
        </button>
      </div>
    </motion.div>
  );
}

export function StashStrip({
  items,
}: {
  items: UnlockedPrize[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="border-4 border-ink bg-white px-3 py-3 shadow-base">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="font-display text-xs font-extrabold uppercase tracking-[0.2em] text-ink">
          Your stash
        </p>
        <p className="font-body text-[11px] text-ink/45">{items.length} finds</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.slice(0, 12).map((item) => (
          <div
            key={`${item.gameId}-${item.prize.id}`}
            className="flex w-[72px] shrink-0 flex-col items-center border-2 border-ink px-1 py-2"
            style={{ backgroundColor: item.color }}
            title={`${item.prize.name} (${item.tierName})`}
          >
            <span className="font-display text-lg font-extrabold text-ink">
              {item.prize.name.charAt(0)}
            </span>
            <span className="mt-1 line-clamp-2 text-center font-display text-[9px] font-bold leading-tight text-ink">
              {item.prize.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
