// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.30;

/// @title RarityMath
/// @notice Maps a confidential RNG seed to a claw-machine rarity tier (basis points).
library RarityMath {
    /// @dev seed % 10000 → tier
    /// 0–5999   → 1 Common    (60%)
    /// 6000–8499 → 2 Uncommon  (25%)
    /// 8500–9499 → 3 Rare      (10%)
    /// 9500–9899 → 4 Epic      (4%)
    /// 9900–9999 → 5 Legendary (1%)
    function mapSeedToTier(uint256 seed) internal pure returns (uint8) {
        uint256 roll = seed % 10_000;
        if (roll < 6000) return 1;
        if (roll < 8500) return 2;
        if (roll < 9500) return 3;
        if (roll < 9900) return 4;
        return 5;
    }

    function tierName(uint8 tier) internal pure returns (string memory) {
        if (tier == 1) return "Common";
        if (tier == 2) return "Uncommon";
        if (tier == 3) return "Rare";
        if (tier == 4) return "Epic";
        if (tier == 5) return "Legendary";
        return "Unknown";
    }
}
