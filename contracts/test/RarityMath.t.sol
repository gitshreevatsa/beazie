// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {RarityMath} from "../contracts/libraries/RarityMath.sol";

contract RarityMathTest is Test {
    function test_common() public pure {
        assertEq(RarityMath.mapSeedToTier(0), 1);
        assertEq(RarityMath.mapSeedToTier(5999), 1);
    }

    function test_uncommon() public pure {
        assertEq(RarityMath.mapSeedToTier(6000), 2);
        assertEq(RarityMath.mapSeedToTier(8499), 2);
    }

    function test_rare() public pure {
        assertEq(RarityMath.mapSeedToTier(8500), 3);
        assertEq(RarityMath.mapSeedToTier(9499), 3);
    }

    function test_epic() public pure {
        assertEq(RarityMath.mapSeedToTier(9500), 4);
        assertEq(RarityMath.mapSeedToTier(9899), 4);
    }

    function test_legendary() public pure {
        assertEq(RarityMath.mapSeedToTier(9900), 5);
        assertEq(RarityMath.mapSeedToTier(9999), 5);
    }

    function test_wraps_modulo() public pure {
        // 10_000 % 10000 = 0 → Common
        assertEq(RarityMath.mapSeedToTier(10_000), 1);
        // 19_900 % 10000 = 9900 → Legendary
        assertEq(RarityMath.mapSeedToTier(19_900), 5);
    }
}
