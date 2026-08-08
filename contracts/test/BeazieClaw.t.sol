// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {IncoTest} from "@inco/lightning/src/test/IncoTest.sol";
import {euint256, inco} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
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

    function _playValue() internal view returns (uint256) {
        return PULL_FEE + inco.getFee();
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
        processAllOperations();
    }

    function test_playPull_createsGame() public {
        uint256 gameId = _playAsPlayer();

        (address p, uint8 machineId, bool settled, uint8 tier) = claw.getGame(gameId);
        assertEq(p, player);
        assertEq(machineId, 0);
        assertFalse(settled);
        assertEq(tier, 0);
        assertEq(claw.pendingGame(player), gameId);
    }

    function test_settle_mapsSeedToTier() public {
        uint256 gameId = _playAsPlayer();

        bytes32 handle = claw.getSeedHandle(gameId);
        (DecryptionAttestation memory attestation, bytes[] memory sigs) = _attest(handle);

        uint256 plaintext = uint256(attestation.value);
        uint8 expectedTier = RarityMath.mapSeedToTier(plaintext);

        vm.prank(player);
        claw.settle(gameId, attestation, sigs);

        (,, bool settled, uint8 tier) = claw.getGame(gameId);
        assertTrue(settled);
        assertEq(tier, expectedTier);
        assertEq(claw.pendingGame(player), 0);
    }

    function test_cannotSettleTwice() public {
        uint256 gameId = _playAsPlayer();

        (DecryptionAttestation memory attestation, bytes[] memory sigs) =
            _attest(claw.getSeedHandle(gameId));

        vm.prank(player);
        claw.settle(gameId, attestation, sigs);

        vm.prank(player);
        vm.expectRevert(BeazieClaw.AlreadySettled.selector);
        claw.settle(gameId, attestation, sigs);
    }

    function test_expireGame_refundsAfterTimeout() public {
        uint256 gameId = _playAsPlayer();

        uint256 balBefore = player.balance;
        vm.warp(block.timestamp + 15 minutes + 1);

        claw.expireGame(gameId);

        (,, bool settled,) = claw.getGame(gameId);
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
}
