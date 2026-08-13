// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {euint256, ebool, e, inco} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RarityMath} from "./libraries/RarityMath.sol";

/// @title BeazieClaw
/// @notice Confidential mystery-box pulls on Inco Lightning (Base Sepolia).
/// @dev Inco surface area used deliberately:
///      - e.rand()              full-width confidential seed (tier entropy)
///      - e.randBounded(n)      confidential card slot in [0, CARD_POOL)
///      - e.add                 mix machineId into seed without plaintext branch
///      - e.ge / e.select       encrypted pity force-legendary (no if on ebool)
///      - e.allowThis / e.allow contract + player access (selective decrypt)
///      - e.reveal              queue public attestations for Model A settle
///      - isValidDecryptionAttestation  dual-handle settle (seed + card)
contract BeazieClaw is Ownable {
    using e for *;

    uint256 public constant PULL_FEE = 0.0001 ether;
    uint256 public constant GAME_TIMEOUT = 15 minutes;
    /// @dev Prize variants per rarity tier (matches client PRIZE_POOL length).
    uint256 public constant CARD_POOL = 4;
    /// @dev After this many non-legendary settles, next pull forces legendary via e.select.
    uint256 public constant PITY_THRESHOLD = 8;

    struct Game {
        address player;
        uint8 machineId;
        euint256 seed; // salted seed handle (revealed)
        euint256 cardSlot; // [0, CARD_POOL) (revealed)
        uint64 createdAt;
        bool settled;
        uint8 tier; // 0 unset, 1–5 after settle
        uint256 cardId; // 0 unset; (tier-1)*CARD_POOL + slot + 1 after settle
    }

    uint256 public nextGameId;
    mapping(uint256 => Game) internal _games;
    mapping(address => uint256) internal _pendingGame; // 0 = none; else gameId+1
    /// @dev Encrypted consecutive non-legendary count (updated at settle).
    mapping(address => euint256) internal _pity;

    uint8 private constant _NOT_ENTERED = 1;
    uint8 private constant _ENTERED = 2;
    uint8 private _entered = _NOT_ENTERED;

    error InsufficientValue();
    error UnknownGame();
    error AlreadySettled();
    error HandleMismatch();
    error InvalidAttestation();
    error NotExpired();
    error NotPlayer();
    error ExceedsAvailable();

    event PullStarted(
        uint256 indexed gameId,
        address indexed player,
        uint8 machineId,
        bytes32 seedHandle,
        bytes32 cardHandle
    );
    event PullSettled(
        uint256 indexed gameId,
        address indexed player,
        uint8 tier,
        uint256 cardId,
        uint256 randomSeed
    );
    event PullExpired(uint256 indexed gameId, address indexed player, uint256 refund);
    event Funded(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    modifier nonReentrant() {
        require(_entered != _ENTERED, "reentrant");
        _entered = _ENTERED;
        _;
        _entered = _NOT_ENTERED;
    }

    constructor() Ownable(msg.sender) {}

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    /// @notice Inco fee for one randomness op (rand / randBounded).
    function getFee() external view returns (uint256) {
        return inco.getFee();
    }

    /// @notice ETH pull fee + fees for two randomness ops.
    function playCost() external view returns (uint256) {
        return PULL_FEE + 2 * inco.getFee();
    }

    function pullFee(uint8 /* machineId */) external pure returns (uint256) {
        return PULL_FEE;
    }

    function pendingGame(address player) external view returns (uint256) {
        uint256 packed = _pendingGame[player];
        return packed == 0 ? 0 : packed - 1;
    }

    function getGame(uint256 gameId)
        external
        view
        returns (address player, uint8 machineId, bool settled, uint8 tier, uint256 cardId)
    {
        Game storage g = _games[gameId];
        return (g.player, g.machineId, g.settled, g.tier, g.cardId);
    }

    function getSeedHandle(uint256 gameId) external view returns (bytes32) {
        Game storage g = _games[gameId];
        if (g.player == address(0)) revert UnknownGame();
        return euint256.unwrap(g.seed);
    }

    function getCardHandle(uint256 gameId) external view returns (bytes32) {
        Game storage g = _games[gameId];
        if (g.player == address(0)) revert UnknownGame();
        return euint256.unwrap(g.cardSlot);
    }

    /// @notice Pity handle (player may privately decrypt via e.allow).
    function getPityHandle(address player) external view returns (bytes32) {
        return euint256.unwrap(_pity[player]);
    }

    /// @notice Draw confidential seed + card; grant player decrypt; queue public reveals.
    function playPull(uint8 machineId) external payable nonReentrant returns (uint256 gameId) {
        uint256 incoFee = inco.getFee();
        // Two fee-charging draws: e.rand + e.randBounded
        if (msg.value < PULL_FEE + 2 * incoFee) revert InsufficientValue();

        // --- confidential RNG ---
        euint256 rawSeed = e.rand();
        euint256 cardSlot = e.randBounded(CARD_POOL);

        // Mix box id into seed with encrypted add (no plaintext branch on outcome).
        euint256 salted = rawSeed.add(e.asEuint256(uint256(machineId)));

        // Encrypted pity: force a legendary-mapped seed without if(ebool).
        euint256 pity = _pity[msg.sender];
        if (euint256.unwrap(pity) == bytes32(0)) {
            pity = e.asEuint256(0);
            e.allowThis(pity);
            e.allow(pity, msg.sender);
            _pity[msg.sender] = pity;
        }
        ebool forceLeg = e.ge(pity, e.asEuint256(PITY_THRESHOLD));
        // 9950 % 10000 → Legendary in RarityMath
        euint256 forced = e.asEuint256(9950);
        euint256 seed = e.select(forceLeg, forced, salted);

        // Access control: contract retains ops; player can privately decrypt (Model B).
        e.allowThis(seed);
        e.allowThis(cardSlot);
        e.allowThis(pity);
        e.allow(seed, msg.sender);
        e.allow(cardSlot, msg.sender);

        // Public reveal queue for Model A settle (attestation verify on-chain).
        e.reveal(seed);
        e.reveal(cardSlot);

        gameId = nextGameId++;
        _games[gameId] = Game({
            player: msg.sender,
            machineId: machineId,
            seed: seed,
            cardSlot: cardSlot,
            createdAt: uint64(block.timestamp),
            settled: false,
            tier: 0,
            cardId: 0
        });
        _pendingGame[msg.sender] = gameId + 1;

        emit PullStarted(
            gameId, msg.sender, machineId, euint256.unwrap(seed), euint256.unwrap(cardSlot)
        );
    }

    /// @notice Dual attestation settle: seed → tier, cardSlot → cardId.
    function settle(
        uint256 gameId,
        DecryptionAttestation calldata seedAttestation,
        bytes[] calldata seedSignatures,
        DecryptionAttestation calldata cardAttestation,
        bytes[] calldata cardSignatures
    ) external nonReentrant {
        Game storage game = _games[gameId];
        if (game.player == address(0)) revert UnknownGame();
        if (game.settled) revert AlreadySettled();

        if (seedAttestation.handle != euint256.unwrap(game.seed)) revert HandleMismatch();
        if (cardAttestation.handle != euint256.unwrap(game.cardSlot)) revert HandleMismatch();

        if (!inco.incoVerifier().isValidDecryptionAttestation(seedAttestation, seedSignatures)) {
            revert InvalidAttestation();
        }
        if (!inco.incoVerifier().isValidDecryptionAttestation(cardAttestation, cardSignatures)) {
            revert InvalidAttestation();
        }

        uint256 plaintextSeed = uint256(seedAttestation.value);
        uint256 slot = uint256(cardAttestation.value) % CARD_POOL;
        uint8 tier = RarityMath.mapSeedToTier(plaintextSeed);
        // Stable card id space: per-tier pools of CARD_POOL
        uint256 cardId = uint256(tier - 1) * CARD_POOL + slot + 1;

        game.settled = true;
        game.tier = tier;
        game.cardId = cardId;
        _clearPending(game.player, gameId);
        _updatePity(game.player, tier);

        emit PullSettled(gameId, game.player, tier, cardId, plaintextSeed);
    }

    function expireGame(uint256 gameId) external nonReentrant {
        Game storage game = _games[gameId];
        if (game.player == address(0)) revert UnknownGame();
        if (game.settled) revert AlreadySettled();
        if (block.timestamp < game.createdAt + GAME_TIMEOUT) revert NotExpired();

        game.settled = true;
        _clearPending(game.player, gameId);

        uint256 refund = PULL_FEE;
        _send(game.player, refund);
        emit PullExpired(gameId, game.player, refund);
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        if (amount > address(this).balance) revert ExceedsAvailable();
        _send(owner(), amount);
        emit Withdrawn(owner(), amount);
    }

    /// @dev After public tier is known, refresh encrypted pity with e.select-free plaintext branch
    ///      (tier is attested plaintext here — confidential phase already ended).
    function _updatePity(address player, uint8 tier) private {
        if (tier == 5) {
            euint256 reset = e.asEuint256(0);
            e.allowThis(reset);
            e.allow(reset, player);
            _pity[player] = reset;
            return;
        }
        euint256 next = _pity[player].add(e.asEuint256(1));
        e.allowThis(next);
        e.allow(next, player);
        _pity[player] = next;
    }

    function _clearPending(address player, uint256 gameId) private {
        if (_pendingGame[player] == gameId + 1) {
            _pendingGame[player] = 0;
        }
    }

    function _send(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        require(ok, "send failed");
    }
}
