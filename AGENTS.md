# AGENTS.md

Guide for AI agents (and humans) working in this repo.

## What this is

**Incasino** — a confidential, provably-fair on-chain casino on **Inco Lightning** (TEE-based confidential compute, **not** FHE), running on **Base Sepolia**. Six games (Coin Flip, Dice, Mines, Plinko, Rock Paper Scissors, Slots). You bet with **native ETH** (no ERC20, no deposit step).

```
contracts/   Solidity Casino contract, Hardhat tests, deploy script (TypeScript)
client/      Next.js (App Router) frontend — wagmi + RainbowKit + viem
```

## Key facts

- **One contract**: `contracts/contracts/Casino.sol` holds a single ETH bankroll and implements all six games. Deployed at `0x5b5d7d4ad82bac6419c205c395fd208901592357` (chain id **84532**).
- **Inco SDK**: `@inco/lightning` (Solidity) + `@inco/lightning-js` (JS), both `1.0.2`. Executor `0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624`, verifier `0x867758FFe098fB0D74826A8DCf60127696440f09`, fee `1e12` wei/draw, **2-of-2 covalidator quorum**.
- **Two-phase per game** (there is no synchronous on-chain decrypt): `play*()` draws a sealed seed and reveals it → covalidator signs an attestation off-chain → `settle()` verifies it on-chain and pays out.
- **Caps**: `MAX_WAGER_PER_ROUND = 0.0005 ether`, `MAX_ROUNDS = 10`. Mines is single-board; the other five derive N rounds from one seed.
- **Never call Inco "FHE"** — it's a TEE. The API says "encrypted"; the mechanism is encrypt/decrypt in an enclave.

## Contract: the important snippets

All Inco usage lives in `Casino.sol`. `using e for *;` is declared.

**Imports + the three Inco primitives.**
```solidity
import {euint256, e, inco} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
```

**Open a bet — native ETH + sealed draw.** `msg.value` must cover the wager **and** the Inco fee. `e.rand()` pays the fee out of the contract's balance (not `msg.value`), so the wager stays as bankroll. `e.allowThis()` is mandatory or the contract loses the handle; `e.reveal()` requests the public decryption.
```solidity
function _open(uint256 wager, uint256 maxPayout, Kind kind, bytes memory params)
    internal returns (uint256 gameId)
{
    if (msg.value < wager + inco.getFee()) revert InsufficientValue();

    euint256 seed = e.rand();   // costs the Inco fee, drawn from this contract's balance
    e.allowThis(seed);          // REQUIRED — keep access to the handle
    e.reveal(seed);             // request public decryption

    // Fee has left; balance now backs the wager. Solvency check (wager already in balance).
    if (address(this).balance < totalActiveLiability + maxPayout) revert InsufficientBankroll();
    totalActiveLiability += maxPayout;

    gameId = nextGameId++;
    _games[gameId] = PendingGame({ player: msg.sender, wager: wager, maxPayout: maxPayout,
        seed: seed, createdAt: uint64(block.timestamp), settled: false, kind: kind, params: params });
    emit BetPlaced(gameId, msg.sender, wager, euint256.unwrap(seed), uint8(kind));
}
```
> Solvency uses `balance >= totalActiveLiability + maxPayout` (wager is already in `balance`). Do **not** subtract `msg.value` — every game has `maxPayout > wager`, so that form wrongly reverts.

**Settle — verify the attestation (the mandatory checks).** Always bind the attestation to the stored handle *and* verify the signatures. Effects (mark settled, release liability) happen here, before any payout.
```solidity
function _consume(uint256 gameId, DecryptionAttestation calldata attestation, bytes[] calldata signatures)
    internal returns (uint256 seed, PendingGame storage game)
{
    game = _games[gameId];
    if (game.player == address(0)) revert UnknownGame();
    if (game.settled) revert AlreadySettled();
    if (attestation.handle != euint256.unwrap(game.seed)) revert HandleMismatch();      // bind to this game
    if (!inco.incoVerifier().isValidDecryptionAttestation(attestation, signatures))
        revert InvalidAttestation();
    game.settled = true;                       // effect
    totalActiveLiability -= game.maxPayout;    // effect (release before send)
    seed = uint256(attestation.value);         // the revealed plaintext seed
}
```

**Pay out — checks-effects-interactions.** Liability was already released in `_consume`; cap to the reserved max, then send ETH last.
```solidity
function _pay(PendingGame storage game, uint256 payout) internal returns (uint256) {
    if (payout > game.maxPayout) payout = game.maxPayout;   // never exceed what was reserved
    if (payout > 0) { (bool ok,) = game.player.call{value: payout}(""); require(ok, "send failed"); }
    return payout;
}
```

**Multi-round from one seed.** Each round's randomness is `keccak(seed, i)` — zero block entropy, deterministic, one reveal covers all rounds.
```solidity
function _word(uint256 seed, uint256 index) internal pure returns (uint256) {
    return uint256(keccak256(abi.encode(seed, index)));
}
```

**Single `settle` dispatches by game kind.**
```solidity
function settle(uint256 gameId, DecryptionAttestation calldata attestation, bytes[] calldata signatures)
    external nonReentrant
{
    (uint256 seed, PendingGame storage game) = _consume(gameId, attestation, signatures);
    Kind k = game.kind;
    if (k == Kind.CoinFlip) _settleCoinFlip(gameId, seed, game);
    else if (k == Kind.Dice) _settleDice(gameId, seed, game);
    // ... Mines / Plinko / RPS / Slots
}
```

**Bankroll (owner).** `depositBankroll()` payable + `receive()` fund it; `availableBankroll() = balance - totalActiveLiability`; `withdraw(amount)` / `withdrawAll()` are `onlyOwner` and capped to available. `expireGame(gameId)` refunds a stuck wager after `GAME_TIMEOUT` (15 min).

**Events** consumed by the UI: `BetPlaced(gameId, player, wager, seedHandle, kind)`, `BetSettled(gameId, player, wager, payout, randomSeed, kind)`, plus per-game `*_Outcome_Event` carrying the per-round arrays (`payouts`, plus game-specific `outcomes`/`rolls`/`buckets`/`spins`/`houseActions`).

### Contract gotchas
- `play*` requires `msg.value >= wager + inco.getFee()` — a fresh `getFee()` read each time. Surplus is **not** refunded (buffer against fee bumps).
- Liability reserves the **worst-case** payout for `MAX_ROUNDS`. A maxed Plinko (16x) 10-round bet reserves `wager*16*10` — a small bankroll will legitimately revert with `InsufficientBankroll`. Keep the bankroll well above one bet's `maxPayout`, or lower rounds.
- `viaIR: true` + optimizer are on in `hardhat.config.ts` (needed for the settle loops; keeps the monolith ~20KB, under the 24KB limit).

## Frontend: the flow

- `client/src/utils/contract.ts` — single `casinoAddress` + `casinoABI` (regenerate the ABI from `contracts/artifacts/.../Casino.json` after any contract change). `MAX_WAGER_PER_ROUND_ETH`, `MAX_ROUNDS` mirror the contract.
- `client/src/utils/inco.ts` — `runGame()` is the shared engine. **No token/approve.** Simulate before sending so reverts surface a clear reason:
```ts
const play = { address: casinoAddress, abi: casinoABI, functionName,
  args: playArgs, value: wager + fee, account: ctx.address } as const;
await simulateContract(wagmiConfig, play);   // clear revert (InsufficientBankroll, WagerTooHigh...) before gas
const hash = await writeContract(wagmiConfig, play);
// -> read BetPlaced (gameId, seedHandle) -> reveal -> settle -> parse *_Outcome_Event
```
- Reveal (JS side, `@inco/lightning-js`): `zap.attestedReveal([seedHandle])` with retries (covalidator latency can be seconds→minutes); format `{ handle, value }` + `signatures` for `settle`.
- `runGame` returns a normalized `PlayResult`: `{ wager, payout, net, rounds: {won, payout}[], raw }`. **A round `won` only if `payout > perRoundWager`** (net profit) — sub-stake payouts (Slots pair, Plinko center) are losses, not wins.
- UX building blocks: `WagerRounds` (wager + quick-select chips + rounds), `PlayButton`, `GameStatus` (stage stepper + error/retry), `RoundResults` (live W/L strip + net; `count` prop for staged reveal), `InfoButton` (per-game rules). Hooks: `useCasinoGame` (drives play/stages/result), `useSequentialReveal` (spin→land per round + skip), `useWinFx` (confetti + `you-winn.mp3`). Owner deposit/withdraw UI at `/owner` (gated to `owner()`).
- Each game page keeps its own visual: Coin Flip (framer-motion H/T coin), Dice (0–100 track), Mines (5×5 board), Plinko (**canvas physics** in `modules/plinko/` driven by `utils/simulation.ts`), RPS (bobbing hand SVGs + `vs.svg`), Slots (`slot-machine.svg` + marquee reels).

### Frontend gotchas
- RPC: wagmi uses a viem `fallback` across several public Base Sepolia RPCs. `getLogs` ranges are capped (~2000 blocks on base.org); `publicnode` gates archive `getLogs` behind a token — the fallback skips it. Live-bets/stats read the last ~2000 blocks, so they decay over ~1h.
- Strict TypeScript: `strict` + `noUnusedLocals`, **zero `any`/`unknown`**. Contract calls use `@wagmi/core` typed actions with `wagmiConfig`.
- Style: neobrutalist (border-4 border-black, hard shadows), **Urbanist** font (Inco's), Tailwind.

## Commands

```bash
# contracts
cd contracts
npm run compile
npm run deploy:baseSepolia         # deploy + fund bankroll (BANKROLL_ETH, default 0.05)
npm test                           # play -> reveal -> settle for every game (Base Sepolia)
npm run test:local                 # docker node: npm run node:up first
ETHERSCAN_API_KEY=... npx hardhat verify --network baseSepolia <address>

# frontend
cd client
npm run dev
npm run build                      # must stay green; also `npx tsc --noEmit`
vercel deploy --prod               # from client/
```

## After changing the contract
1. `npm run compile`, confirm bytecode < 24KB, `npm test` on Base Sepolia (all games + safety).
2. `npm run deploy:baseSepolia`, verify on Basescan.
3. Copy the new ABI into `client/src/abi/casino.json` and update `casinoAddress` in `client/src/utils/contract.ts`.
4. `npm run build` the client, then deploy.

## Do not commit
Secrets stay out of git: `contracts/.env` (keys), `client/.env.local`, `.vercel/`, and the local seeding/sweep helpers (`contracts/.seed-*`, `scripts/seedBets.ts`, `scripts/sweepEth.ts`) are all gitignored. The `.agents/` skills dir is gitignored too.
