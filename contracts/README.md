# Incasino — Contracts (Inco Lightning)

A single `Casino.sol` contract on the Inco Lightning SDK. It holds one native ETH
bankroll and implements all six games (CoinFlip, Dice, Mines, Plinko,
RockPaperScissors, SlotMachine), with a TypeScript deploy script and Hardhat tests
that run on Base Sepolia.

## How a round works

Inco has no synchronous on-chain decryption, so each game is two steps:

1. A `play...` function locks the wager (sent as ETH) and draws a random seed with `e.rand()`.
2. `settle(gameId, attestation, signatures)` submits the covalidator attestation. The contract checks it matches the stored seed, derives the outcome, and pays out.

## Design

- Native ETH: `play` is payable with `msg.value = wager + fee`. The wager stays as bankroll; the Inco fee is spent by `e.rand()`.
- One bankroll: the contract's ETH balance backs every game. `availableBankroll()` is the balance minus reserved liability. The owner funds it (`depositBankroll()` / `receive()`) and withdraws non-reserved ETH (`withdraw`, `withdrawAll`).
- Caps: `MAX_WAGER_PER_ROUND = 0.0005 ether`, `MAX_ROUNDS = 10`.
- Multi-round: CoinFlip, Dice, Plinko, RPS and Slots derive N rounds from one seed. Mines is a single board.
- Safety: worst-case payout is reserved before each bet, payout is released before the ETH send (checks-effects-interactions), one `nonReentrant` guard, and `expireGame` refunds a stuck wager after 15 minutes.

## Run on Base Sepolia

```bash
npm install
cp .env.example .env          # set PRIVATE_KEY_BASE_SEPOLIA
npm run compile
npm run deploy:baseSepolia    # deploy + fund the bankroll, writes deployments/baseSepolia.json
npm test                      # play -> reveal -> settle for every game
```

Override the initial bankroll with `BANKROLL_ETH` (default 0.05).

## Verify on Basescan

```bash
npx hardhat verify --network baseSepolia <address>
```

## Local node (alternative)

```bash
npm run node:up      # docker compose up -d (anvil + covalidator)
npm run test:local
npm run node:down
```
