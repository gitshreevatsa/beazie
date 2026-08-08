"use client";

import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

export function PlayButton({
  onPlay,
  isPlaying,
  disabled = false,
  label = "DROP",
}: {
  onPlay: () => void;
  isPlaying: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  if (!isConnected) {
    return (
      <button
        onClick={openConnectModal}
        className="w-full border-4 border-ink bg-butter px-4 py-3.5 font-display text-lg font-bold text-ink shadow-base transition-transform hover:-translate-y-0.5"
      >
        Connect to play
      </button>
    );
  }

  return (
    <button
      onClick={onPlay}
      disabled={disabled || isPlaying}
      className="flex w-full items-center justify-center gap-2 border-4 border-ink bg-main px-4 py-3.5 font-display text-lg font-bold text-ink shadow-base transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
    >
      {isPlaying ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" /> In play…
        </>
      ) : (
        label
      )}
    </button>
  );
}

export default PlayButton;
