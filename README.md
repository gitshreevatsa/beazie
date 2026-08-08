# Beazie

Confidential claw machine on **Base Sepolia**, powered by [Inco Lightning](https://docs.inco.org).

Forked from [Incasino](https://github.com/Inco-fhevm/incasino). Demo scope: `playPull` → opaque seed → claw animation → `settle` → tier reveal.

## Two-tx flow

1. **playPull** — pay `0.0001 ETH` + Inco fee; contract draws `e.rand()`, `allowThis`, `e.reveal`
2. **settle** — submit covalidator decryption attestation; `RarityMath.mapSeedToTier` → Common…Legendary

## Repo layout

```
beazie/
├── contracts/          # BeazieClaw.sol + RarityMath + Foundry/Hardhat
└── client/             # Next.js + wagmi + RainbowKit claw UI
```

## Contracts

```bash
cd contracts
npm install --legacy-peer-deps   # or restore from Incasino lockfile
npx hardhat compile
forge test -vvv                  # IncoTest unit tests (no Docker)
```

Deploy Base Sepolia:

```bash
cp .env.example .env   # set PRIVATE_KEY_BASE_SEPOLIA
npm run deploy:baseSepolia
# writes deployments/baseSepolia.json
```

Copy address into `client/.env.local`:

```
NEXT_PUBLIC_BEAZIE_CLAW_ADDRESS=0x...
NEXT_PUBLIC_WC_PROJECT_ID=...
```

## Frontend

```bash
cd client
npm install
npm run dev
# open /games/claw
```

## Rarity (basis points)

| Tier | Range | Odds |
|------|-------|------|
| Common | 0–5999 | 60% |
| Uncommon | 6000–8499 | 25% |
| Rare | 8500–9499 | 10% |
| Epic | 9500–9899 | 4% |
| Legendary | 9900–9999 | 1% |

## Honest framing

Provably fair via **TEE attestation**, not zk or FHE.
