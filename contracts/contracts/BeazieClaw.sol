// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {euint256, ebool, e, inco, elist, ETypes} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {RarityMath} from "./libraries/RarityMath.sol";

/// @title BeazieClaw (Veil)
/// @notice Confidential mystery-box pulls on Inco Lightning (Base Sepolia).
/// @dev Inco surface deliberately used:
///      - e.rand()                         confidential tier seed
///      - e.shuffledRange + e.getEuint256  encrypted deck draw (card slot)
///      - e.add / e.ge / e.select          salt + encrypted pity force-legendary
///      - e.allowThis / e.allow            contract + player ACL
///      - e.reveal(seed only)              public Model A settle for tier
///      - card stays private until player attestedDecrypt → settle
///      - ERC-721 mint on settle
contract BeazieClaw is ERC721, Ownable {
    using e for *;
    using Strings for uint256;

    uint256 public constant PULL_FEE = 0.0001 ether;
    uint256 public constant GAME_TIMEOUT = 15 minutes;
    /// @dev Prize variants per rarity tier (matches client PRIZE_POOL length).
    uint256 public constant CARD_POOL = 4;
    /// @dev After this many non-legendary settles, next pull forces legendary via e.select.
    uint256 public constant PITY_THRESHOLD = 8;

    struct Game {
        address player;
        uint8 machineId;
        euint256 seed; // salted seed (public reveal)
        euint256 cardSlot; // [0, CARD_POOL) — private until player decrypt
        uint64 createdAt;
        bool settled;
        uint8 tier; // 0 unset, 1–5 after settle
        uint256 cardId; // flavor id: (tier-1)*CARD_POOL + slot + 1
        uint256 tokenId; // ERC-721 id minted on settle (0 unset)
    }

    struct PrizeMeta {
        uint8 tier;
        uint256 cardId;
        uint256 gameId;
    }

    uint256 public nextGameId;
    uint256 public nextTokenId;
    mapping(uint256 => Game) internal _games;
    mapping(address => uint256) internal _pendingGame; // 0 = none; else gameId+1
    /// @dev Encrypted consecutive non-legendary count (updated at settle).
    mapping(address => euint256) internal _pity;
    mapping(uint256 => PrizeMeta) internal _prizeOf;

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
        uint256 randomSeed,
        uint256 tokenId
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

    constructor() ERC721("Veil Prize", "VEIL") Ownable(msg.sender) {}

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    /// @notice Inco fee for one randomness op (e.rand).
    function getFee() external view returns (uint256) {
        return inco.getFee();
    }

    /// @notice ETH pull fee + e.rand + shuffledRange (range + shuffle elist fees).
    function playCost() external view returns (uint256) {
        return PULL_FEE + _incoDrawCost();
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
        returns (
            address player,
            uint8 machineId,
            bool settled,
            uint8 tier,
            uint256 cardId,
            uint256 tokenId
        )
    {
        Game storage g = _games[gameId];
        return (g.player, g.machineId, g.settled, g.tier, g.cardId, g.tokenId);
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

    function prizeOf(uint256 tokenId) external view returns (uint8 tier, uint256 cardId, uint256 gameId) {
        PrizeMeta memory m = _prizeOf[tokenId];
        return (m.tier, m.cardId, m.gameId);
    }

    /// @notice Draw confidential seed + deck card; grant player decrypt; reveal seed only.
    function playPull(uint8 machineId) external payable nonReentrant returns (uint256 gameId) {
        uint256 drawCost = _incoDrawCost();
        if (msg.value < PULL_FEE + drawCost) revert InsufficientValue();

        // --- confidential RNG ---
        euint256 rawSeed = e.rand();

        // Encrypted 4-card deck, deal top card (uniform slot in [0, CARD_POOL)).
        elist deck = e.shuffledRange(0, uint16(CARD_POOL), ETypes.Uint256);
        e.allowThis(deck);
        euint256 cardSlot = e.getEuint256(deck, 0);

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

        // Access: contract retains ops; player can privately decrypt card + seed.
        e.allowThis(seed);
        e.allowThis(cardSlot);
        e.allowThis(pity);
        e.allow(seed, msg.sender);
        e.allow(cardSlot, msg.sender);

        // Public reveal queue for Model A settle on seed only.
        // Card stays private — settle uses player attestedDecrypt attestation.
        e.reveal(seed);

        gameId = nextGameId++;
        _games[gameId] = Game({
            player: msg.sender,
            machineId: machineId,
            seed: seed,
            cardSlot: cardSlot,
            createdAt: uint64(block.timestamp),
            settled: false,
            tier: 0,
            cardId: 0,
            tokenId: 0
        });
        _pendingGame[msg.sender] = gameId + 1;

        emit PullStarted(
            gameId, msg.sender, machineId, euint256.unwrap(seed), euint256.unwrap(cardSlot)
        );
    }

    /// @notice Dual attestation settle: public seed reveal + private card decrypt → mint NFT.
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
        uint256 cardId = uint256(tier - 1) * CARD_POOL + slot + 1;

        uint256 tokenId = ++nextTokenId;
        _safeMint(game.player, tokenId);
        _prizeOf[tokenId] = PrizeMeta({tier: tier, cardId: cardId, gameId: gameId});

        game.settled = true;
        game.tier = tier;
        game.cardId = cardId;
        game.tokenId = tokenId;
        _clearPending(game.player, gameId);
        _updatePity(game.player, tier);

        emit PullSettled(gameId, game.player, tier, cardId, plaintextSeed, tokenId);
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

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        PrizeMeta memory m = _prizeOf[tokenId];
        string memory name_ = string.concat("Veil Prize #", tokenId.toString());
        string memory desc = string.concat(
            "Confidential mystery-box prize. Tier ",
            uint256(m.tier).toString(),
            ", card ",
            m.cardId.toString(),
            ", game ",
            m.gameId.toString(),
            "."
        );
        string memory json = string.concat(
            '{"name":"',
            name_,
            '","description":"',
            desc,
            '","attributes":[{"trait_type":"tier","value":',
            uint256(m.tier).toString(),
            '},{"trait_type":"cardId","value":',
            m.cardId.toString(),
            '},{"trait_type":"gameId","value":',
            m.gameId.toString(),
            "}]}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @dev e.rand fee + 2× elist fee for shuffledRange(range + shuffle).
    function _incoDrawCost() private view returns (uint256) {
        uint256 elistFee = inco.getEListFee(uint16(CARD_POOL), ETypes.Uint256);
        return inco.getFee() + 2 * elistFee;
    }

    /// @dev After public tier is known, refresh encrypted pity.
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
