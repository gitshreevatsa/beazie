import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import * as dotenv from "dotenv";

dotenv.config();

const BASE_SEPOLIA_RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const PRIVATE_KEY_BASE_SEPOLIA = process.env.PRIVATE_KEY_BASE_SEPOLIA;
// NOTE: use "localhost" (not "127.0.0.1") so this resolves to the SAME node the
// Inco SDK + covalidator use. On machines where another anvil already squats
// IPv4 127.0.0.1:8545, the Docker node binds the IPv6/wildcard address and
// "localhost" (::1) reaches it; a hardcoded 127.0.0.1 would hit the wrong node.
const LOCAL_RPC_URL = process.env.LOCAL_RPC_URL || "http://localhost:8545";

// Default anvil/local-node key (from the Inco local-node docker image).
const LOCAL_PRIVATE_KEY =
  process.env.LOCAL_PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      evmVersion: "cancun",
      // viaIR avoids "stack too deep" in the multi-bet settlement loops.
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    // Inco local node (anvil + covalidator) started via `docker compose up -d`.
    anvil: {
      url: LOCAL_RPC_URL,
      chainId: 31337,
      accounts: [LOCAL_PRIVATE_KEY],
    },
    // Inco devnet runs on Base Sepolia (chainId 84532), devnet pepper.
    devnet: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: PRIVATE_KEY_BASE_SEPOLIA ? [PRIVATE_KEY_BASE_SEPOLIA] : [],
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: PRIVATE_KEY_BASE_SEPOLIA ? [PRIVATE_KEY_BASE_SEPOLIA] : [],
    },
  },
  // Basescan verification via the Etherscan V2 multichain API (one key, all chains).
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  sourcify: { enabled: false },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 600000,
  },
};

export default config;
