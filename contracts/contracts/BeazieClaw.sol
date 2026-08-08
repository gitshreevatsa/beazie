// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {euint256, e, inco} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RarityMath} from "./libraries/RarityMath.sol";

/// @title BeazieClaw
/// @notice Confidential claw machine on Inco Lightning (Base Sepolia).
/// @dev Two-phase flow (Incasino pattern): playPull() draws a sealed seed via
///      e.rand() + e.reveal(); settle() verifies the covalidator attestation
///      and maps the plaintext seed to a rarity tier. v0 reveals tier only
///      (cardId = 0). No NFT mint / USDC / marketplace.
contract BeazieClaw is Ownable {
    using e for *;

    uint256 public constant PULL_FEE = 0.0001 ether;
    uint256 public constant GAME_TIMEOUT = 15 minutes;

    struct Game {
        address player;
        uint8 machineId;
        euint256 seed;
        uint64 createdAt;
        bool settled;
        uint8 tier; // 0 = unset, 1–5 after settle
    }

    uint256 public nextGameId;
    mapping(uint256 => Game) internal _games;
    mapping(address => uint256) internal _pendingGame; // 0 = none; else gameId+1

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
        bytes32 seedHandle
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

    /// @notice Inco fee charged by e.rand() (paid from contract balance).
    function getFee() external view returns (uint256) {
        return inco.getFee();
    }

    /// @notice ETH pull fee for a machine (v0: flat PULL_FEE).
    function pullFee(uint8 /* machineId */) external pure returns (uint256) {
        return PULL_FEE;
    }

    /// @notice Latest unsettled game for a player (0 if none).
    function pendingGame(address player) external view returns (uint256) {
        uint256 packed = _pendingGame[player];
        return packed == 0 ? 0 : packed - 1;
    }

    /// @notice Public game view (seed handle stays opaque until settle).
    function getGame(uint256 gameId)
        external
        view
        returns (address player, uint8 machineId, bool settled, uint8 tier)
    {
        Game storage g = _games[gameId];
        return (g.player, g.machineId, g.settled, g.tier);
    }

    /// @notice Seed handle for a game (for attestedReveal off-chain).
    function getSeedHandle(uint256 gameId) external view returns (bytes32) {
        Game storage g = _games[gameId];
        if (g.player == address(0)) revert UnknownGame();
        return euint256.unwrap(g.seed);
    }

    /// @notice Pay pull fee + Inco fee; draw confidential seed; queue reveal.
    function playPull(uint8 machineId) external payable nonReentrant returns (uint256 gameId) {
        uint256 incoFee = inco.getFee();
        if (msg.value < PULL_FEE + incoFee) revert InsufficientValue();

        euint256 seed = e.rand();
        e.allowThis(seed);
        e.reveal(seed);

        gameId = nextGameId++;
        _games[gameId] = Game({
            player: msg.sender,
            machineId: machineId,
            seed: seed,
            createdAt: uint64(block.timestamp),
            settled: false,
            tier: 0
        });
        _pendingGame[msg.sender] = gameId + 1;

        emit PullStarted(gameId, msg.sender, machineId, euint256.unwrap(seed));
    }

    /// @notice Verify covalidator attestation and reveal rarity tier (cardId=0 in v0).
    function settle(
        uint256 gameId,
        DecryptionAttestation calldata attestation,
        bytes[] calldata signatures
    ) external nonReentrant {
        Game storage game = _games[gameId];
        if (game.player == address(0)) revert UnknownGame();
        if (game.settled) revert AlreadySettled();
        if (attestation.handle != euint256.unwrap(game.seed)) revert HandleMismatch();
        if (!inco.incoVerifier().isValidDecryptionAttestation(attestation, signatures)) {
            revert InvalidAttestation();
        }

        uint256 plaintext = uint256(attestation.value);
        uint8 tier = RarityMath.mapSeedToTier(plaintext);

        game.settled = true;
        game.tier = tier;
        _clearPending(game.player, gameId);

        // v0: no payout, no NFT — fee stays in contract. cardId reserved for v1.
        emit PullSettled(gameId, game.player, tier, 0, plaintext);
    }

    /// @notice Refund pull fee after GAME_TIMEOUT if still unsettled.
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

    /// @notice Owner withdraw of accumulated pull fees (not Inco fees already spent).
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        if (amount > address(this).balance) revert ExceedsAvailable();
        _send(owner(), amount);
        emit Withdrawn(owner(), amount);
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
