import hre from "hardhat";
import { formatEther, parseEther } from "viem";
import * as fs from "fs";
import * as path from "path";

/** Optional pre-fund so the contract can sponsor Inco fees (D7). */
const SPONSOR = parseEther(process.env.SPONSOR_ETH || "0.01");

async function main() {
  const networkName = hre.network.name;
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("──────────────────────────────────────────────");
  console.log(`Network : ${networkName}`);
  console.log(`Deployer: ${deployer.account.address}`);
  console.log("──────────────────────────────────────────────");

  const claw = await hre.viem.deployContract("BeazieClaw");
  console.log(`BeazieClaw: ${claw.address}`);

  if (SPONSOR > 0n) {
    const tx = await deployer.sendTransaction({ to: claw.address, value: SPONSOR });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`Sponsored: ${formatEther(SPONSOR)} ETH`);
  }

  const out = {
    network: networkName,
    chainId: hre.network.config.chainId,
    deployer: deployer.account.address,
    BeazieClaw: claw.address,
    timestamp: new Date().toISOString(),
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${networkName}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));

  console.log("──────────────────────────────────────────────");
  console.log(`Saved deployment to ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
