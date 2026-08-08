import type { Address } from "viem";

export interface GameContext {
  address: Address;
}

// Stages the two-phase ETH flow moves through (no token approval anymore).
export type GameStage = "betting" | "revealing" | "settling" | "done";

export type ContractArg =
  | string
  | number
  | bigint
  | boolean
  | readonly ContractArg[];

export type PlayArgs = readonly ContractArg[];

// One round's result, used by the inline results strip.
export interface RoundResult {
  won: boolean;
  payout: bigint; // wei paid for this round (0 = loss)
}

// Normalised outcome returned by runGame, shared by every game.
export interface PlayResult<TRaw = unknown> {
  wager: bigint; // total wager (perRound * rounds)
  payout: bigint; // total paid out
  net: bigint; // payout - wager (can be negative)
  rounds: RoundResult[];
  raw: TRaw; // game-specific outcome-event args for the visual
}
