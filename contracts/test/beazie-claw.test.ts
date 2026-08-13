import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseEventLogs, type PublicClient, type Hex, type WalletClient } from "viem";
import * as fs from "fs";
import * as path from "path";
import { initZap, revealAndFormat, decryptAndFormat, sleep, type Zap } from "./helpers";

const PULL_FEE = parseEther("0.0001");

describe("BeazieClaw (Inco Lightning, ETH)", function () {
  let zap: Zap;
  let publicClient: PublicClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let claw: any;
  let wallet: WalletClient;
  let playValue: bigint;

  before(async function () {
    publicClient = (await hre.viem.getPublicClient()) as unknown as PublicClient;
    const chainId = await publicClient.getChainId();
    zap = await initZap(chainId);
    [wallet] = await hre.viem.getWalletClients();

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
      playValue = (await claw.read.playCost()) as bigint;
    } catch {
      playValue = PULL_FEE + 9n * 1000000000000n;
    }
  });

  async function settleFrom(
    playHash: Hex
  ): Promise<{ tier: number; cardId: bigint; gameId: bigint; tokenId: bigint }> {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: playHash });
    const placed = parseEventLogs({
      abi: claw.abi,
      eventName: "PullStarted",
      logs: receipt.logs,
    });
    expect(placed.length).to.equal(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { gameId, seedHandle, cardHandle } = (placed[0] as any).args as {
      gameId: bigint;
      seedHandle: Hex;
      cardHandle: Hex;
    };

    const seed = await revealAndFormat(zap, seedHandle);
    const card = await decryptAndFormat(zap, wallet, cardHandle);
    const sTx = await claw.write.settle([
      gameId,
      seed.attestation,
      seed.signatures,
      card.attestation,
      card.signatures,
    ]);
    const sReceipt = await publicClient.waitForTransactionReceipt({ hash: sTx });

    for (let i = 0; i < 30; i++) {
      const g = await claw.read.getGame([gameId]);
      if (g[2] === true) break;
      await sleep(2000);
    }

    const settled = parseEventLogs({
      abi: claw.abi,
      eventName: "PullSettled",
      logs: sReceipt.logs,
    });
    expect(settled.length).to.equal(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = (settled[0] as any).args;
    return {
      tier: Number(args.tier),
      cardId: args.cardId as bigint,
      gameId,
      tokenId: args.tokenId as bigint,
    };
  }

  it("playPull → settle reveals tier + cardId + mints NFT", async function () {
    const h = await claw.write.playPull([0], { value: playValue });
    const { tier, cardId, gameId, tokenId } = await settleFrom(h);
    expect(tier).to.be.gte(1);
    expect(tier).to.be.lte(5);
    expect(cardId).to.be.gte(1n);
    expect(tokenId).to.be.gte(1n);

    const g = await claw.read.getGame([gameId]);
    expect(g[2]).to.equal(true);
    expect(Number(g[3])).to.equal(tier);
    expect(g[4]).to.equal(cardId);
    expect(g[5]).to.equal(tokenId);
  });

  it("rejects double settle", async function () {
    const h = await claw.write.playPull([0], { value: playValue });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: h });
    const placed = parseEventLogs({
      abi: claw.abi,
      eventName: "PullStarted",
      logs: receipt.logs,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { gameId, seedHandle, cardHandle } = (placed[0] as any).args as {
      gameId: bigint;
      seedHandle: Hex;
      cardHandle: Hex;
    };
    const seed = await revealAndFormat(zap, seedHandle);
    const card = await decryptAndFormat(zap, wallet, cardHandle);
    const args = [
      gameId,
      seed.attestation,
      seed.signatures,
      card.attestation,
      card.signatures,
    ];
    await claw.write.settle(args);

    let reverted = false;
    try {
      await claw.write.settle(args);
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
