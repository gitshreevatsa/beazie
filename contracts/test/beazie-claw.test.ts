import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseEventLogs, type PublicClient, type Hex } from "viem";
import * as fs from "fs";
import * as path from "path";
import { initZap, revealAndFormat, sleep, type Zap } from "./helpers";

const PULL_FEE = parseEther("0.0001");

describe("BeazieClaw (Inco Lightning, ETH)", function () {
  let zap: Zap;
  let publicClient: PublicClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let claw: any;
  let fee: bigint;

  before(async function () {
    publicClient = (await hre.viem.getPublicClient()) as unknown as PublicClient;
    const chainId = await publicClient.getChainId();
    zap = await initZap(chainId);
    const [wallet] = await hre.viem.getWalletClients();

    if (chainId === 31337) {
      claw = await hre.viem.deployContract("BeazieClaw");
      const fundTx = await wallet.sendTransaction({
        to: claw.address,
        value: parseEther("0.05"),
      });
      await publicClient.waitForTransactionReceipt({ hash: fundTx });
    } else {
      const file = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
      const dep = JSON.parse(fs.readFileSync(file, "utf8"));
      claw = await hre.viem.getContractAt("BeazieClaw", dep.BeazieClaw);
    }

    try {
      fee = (await claw.read.getFee()) as bigint;
    } catch {
      fee = 1000000000000n;
    }
  });

  async function settleFrom(playHash: Hex): Promise<{ tier: number; gameId: bigint }> {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: playHash });
    const placed = parseEventLogs({
      abi: claw.abi,
      eventName: "PullStarted",
      logs: receipt.logs,
    });
    expect(placed.length).to.equal(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { gameId, seedHandle } = (placed[0] as any).args as {
      gameId: bigint;
      seedHandle: Hex;
    };

    const { attestation, signatures } = await revealAndFormat(zap, seedHandle);
    const sTx = await claw.write.settle([gameId, attestation, signatures]);
    const sReceipt = await publicClient.waitForTransactionReceipt({ hash: sTx });

    for (let i = 0; i < 30; i++) {
      const g = await claw.read.getGame([gameId]);
      if (g[2] === true) break; // settled
      await sleep(2000);
    }

    const settled = parseEventLogs({
      abi: claw.abi,
      eventName: "PullSettled",
      logs: sReceipt.logs,
    });
    expect(settled.length).to.equal(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tier = Number((settled[0] as any).args.tier);
    return { tier, gameId };
  }

  it("playPull → settle reveals a valid tier", async function () {
    const h = await claw.write.playPull([0], { value: PULL_FEE + fee });
    const { tier, gameId } = await settleFrom(h);
    expect(tier).to.be.gte(1);
    expect(tier).to.be.lte(5);

    const g = await claw.read.getGame([gameId]);
    expect(g[2]).to.equal(true); // settled
    expect(Number(g[3])).to.equal(tier);
  });

  it("rejects double settle", async function () {
    const h = await claw.write.playPull([0], { value: PULL_FEE + fee });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: h });
    const placed = parseEventLogs({
      abi: claw.abi,
      eventName: "PullStarted",
      logs: receipt.logs,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { gameId, seedHandle } = (placed[0] as any).args as {
      gameId: bigint;
      seedHandle: Hex;
    };
    const { attestation, signatures } = await revealAndFormat(zap, seedHandle);
    await claw.write.settle([gameId, attestation, signatures]);

    let reverted = false;
    try {
      await claw.write.settle([gameId, attestation, signatures]);
    } catch {
      reverted = true;
    }
    expect(reverted).to.equal(true);
  });

  it("rejects underpaid playPull", async function () {
    let reverted = false;
    try {
      await claw.write.playPull([0], { value: PULL_FEE });
    } catch {
      reverted = true;
    }
    expect(reverted).to.equal(true);
  });
});
