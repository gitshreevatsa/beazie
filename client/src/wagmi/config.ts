import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";
import { fallback, http } from "viem";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "inco_casino_dev";

const RPC_URLS = [
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC, // optional private/keyed RPC first
  "https://base-sepolia.drpc.org",
  "https://sepolia.base.org",
  "https://base-sepolia-rpc.publicnode.com",
  "https://base-sepolia.gateway.tenderly.co",
  "https://1rpc.io/base-sepolia",
].filter((u): u is string => Boolean(u));

export const wagmiConfig = getDefaultConfig({
  appName: "Veil",
  projectId,
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: fallback(
      RPC_URLS.map((url) => http(url, { retryCount: 2, timeout: 15_000 })),
      { rank: false }
    ),
  },
  pollingInterval: 30_000,
  ssr: true,
});

export { baseSepolia };
