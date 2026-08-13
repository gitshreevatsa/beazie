// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {IncoTest} from "@inco/lightning/src/test/IncoTest.sol";
import {inco, ETypes} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {Vm} from "forge-std/Vm.sol";
import {BeazieClaw} from "../contracts/BeazieClaw.sol";
import {RarityMath} from "../contracts/libraries/RarityMath.sol";

contract BeazieClawTest is IncoTest {
    BeazieClaw internal claw;
    address internal player = makeAddr("player");

    uint256 internal constant PULL_FEE = 0.0001 ether;

    function setUp() public override {
        super.setUp();
        claw = new BeazieClaw();
        vm.deal(player, 10 ether);
        vm.deal(address(claw), 1 ether);
    }

    /// @dev Foundry mock resolves scalar ops only. elist range/shuffle/get emit
    ///      unsupported selectors — skip those so rand/add/select still resolve.
    function _processOpsSkippingElist() internal {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter != address(inco)) continue;
            try this.tryHandleIncoLog(logs[i]) {} catch {}
        }
    }

    /// @dev External wrapper so try/catch can swallow unsupported elist selectors.
    function tryHandleIncoLog(Vm.Log calldata log) external {
        handleIncoLog(log);
    }

    function _playValue() internal pure returns (uint256) {
        uint256 elistFee = inco.getEListFee(4, ETypes.Uint256);
        return PULL_FEE + inco.getFee() + 2 * elistFee;
    }

    function _attest(bytes32 handle)
        internal
        returns (DecryptionAttestation memory attestation, bytes[] memory sigs)
    {
        return getDecryptionAttestation(
            player, HandleWithProof({handle: handle, proof: _emptyAllowanceProof()})
        );
    }

    function _playAsPlayer() internal returns (uint256 gameId) {
        uint256 value = _playValue();
        vm.prank(player);
        gameId = claw.playPull{value: value}(0);
        _processOpsSkippingElist();
        // Mock doesn't materialize elist draws — seed a deterministic slot for attest.
        set(claw.getCardHandle(gameId), bytes32(uint256(2)));
        vm.recordLogs();
    }

    function _settle(uint256 gameId) internal {
        (DecryptionAttestation memory seedAtt, bytes[] memory seedSigs) =
            _attest(claw.getSeedHandle(gameId));
        (DecryptionAttestation memory cardAtt, bytes[] memory cardSigs) =
            _attest(claw.getCardHandle(gameId));
        vm.prank(player);
        claw.settle(gameId, seedAtt, seedSigs, cardAtt, cardSigs);
    }

    function test_playPull_createsGame() public {
        uint256 gameId = _playAsPlayer();

        (address p, uint8 machineId, bool settled, uint8 tier, uint256 cardId, uint256 tokenId) =
            claw.getGame(gameId);
        assertEq(p, player);
        assertEq(machineId, 0);
        assertFalse(settled);
        assertEq(tier, 0);
        assertEq(cardId, 0);
        assertEq(tokenId, 0);
        assertEq(claw.pendingGame(player), gameId);
        assertTrue(claw.getCardHandle(gameId) != bytes32(0));
    }

    function test_settle_mapsSeedAndCard_mintsNFT() public {
        uint256 gameId = _playAsPlayer();

        bytes32 seedHandle = claw.getSeedHandle(gameId);
        bytes32 cardHandle = claw.getCardHandle(gameId);
        (DecryptionAttestation memory seedAtt, bytes[] memory seedSigs) = _attest(seedHandle);
        (DecryptionAttestation memory cardAtt, bytes[] memory cardSigs) = _attest(cardHandle);

        uint256 plaintext = uint256(seedAtt.value);
        uint8 expectedTier = RarityMath.mapSeedToTier(plaintext);
        uint256 slot = uint256(cardAtt.value) % 4;
        uint256 expectedCard = uint256(expectedTier - 1) * 4 + slot + 1;

        vm.prank(player);
        claw.settle(gameId, seedAtt, seedSigs, cardAtt, cardSigs);

        (,, bool settled, uint8 tier, uint256 cardId, uint256 tokenId) = claw.getGame(gameId);
        assertTrue(settled);
        assertEq(tier, expectedTier);
        assertEq(cardId, expectedCard);
        assertEq(tokenId, 1);
        assertEq(claw.pendingGame(player), 0);
        assertEq(claw.ownerOf(tokenId), player);
        assertEq(claw.balanceOf(player), 1);

        (uint8 metaTier, uint256 metaCard, uint256 metaGame) = claw.prizeOf(tokenId);
        assertEq(metaTier, expectedTier);
        assertEq(metaCard, expectedCard);
        assertEq(metaGame, gameId);
    }

    function test_cannotSettleTwice() public {
        uint256 gameId = _playAsPlayer();
        _settle(gameId);

        (DecryptionAttestation memory seedAtt, bytes[] memory seedSigs) =
            _attest(claw.getSeedHandle(gameId));
        (DecryptionAttestation memory cardAtt, bytes[] memory cardSigs) =
            _attest(claw.getCardHandle(gameId));

        vm.prank(player);
        vm.expectRevert(BeazieClaw.AlreadySettled.selector);
        claw.settle(gameId, seedAtt, seedSigs, cardAtt, cardSigs);
    }

    function test_expireGame_refundsAfterTimeout() public {
        uint256 gameId = _playAsPlayer();

        uint256 balBefore = player.balance;
        vm.warp(block.timestamp + 15 minutes + 1);

        claw.expireGame(gameId);

        (,, bool settled,,,) = claw.getGame(gameId);
        assertTrue(settled);
        assertEq(player.balance, balBefore + PULL_FEE);
        assertEq(claw.pendingGame(player), 0);
    }

    function test_expireGame_revertsBeforeTimeout() public {
        uint256 gameId = _playAsPlayer();

        vm.expectRevert(BeazieClaw.NotExpired.selector);
        claw.expireGame(gameId);
    }

    function test_playPull_revertsOnInsufficientValue() public {
        vm.prank(player);
        vm.expectRevert(BeazieClaw.InsufficientValue.selector);
        claw.playPull{value: PULL_FEE}(0);
    }

    function test_playCost_coversRandAndShuffledRange() public {
        uint256 elistFee = inco.getEListFee(4, ETypes.Uint256);
        assertEq(claw.playCost(), PULL_FEE + inco.getFee() + 2 * elistFee);
    }
}
