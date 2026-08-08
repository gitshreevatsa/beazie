import {
  HEIGHT,
  NUM_SINKS,
  WIDTH,
  obstacleRadius,
  sinkWidth,
} from "./constants";
import { pad } from "./padding";

export interface Obstacle {
  x: number;
  y: number;
  radius: number;
  originalRadius?: number;
  isGrowing?: boolean;
  growStartTime?: number | null;
  isChangingColor?: boolean;
  colorChangeStartTime?: number;
}

export interface Sink {
  x: number;
  y: number;
  width: number;
  height: number;
  multiplier?: number;
  isChangingColor?: boolean;
  colorChangeStartTime?: number | null;
}

const MULTIPLIERS: Record<number, number> = {
  1: 16,
  2: 8,
  3: 4,
  4: 2,
  5: 1,
  6: 0.5,
  7: 0.25,
  8: 0.125,
  9: 0.0625,
  10: 0.125,
  11: 0.25,
  12: 0.5,
  13: 1,
  14: 2,
  15: 4,
  16: 8,
  17: 16,
};

export const createObstacles = (): Obstacle[] => {
  const obstacles: Obstacle[] = [];
  const rows = 16;
  for (let row = 2; row < rows; row++) {
    const numObstacles = row + 1;
    const y = 0 + row * 35;
    const spacing = 40;
    for (let col = 0; col < numObstacles; col++) {
      const x = WIDTH / 2 - spacing * (row / 2 - col);
      obstacles.push({ x: pad(x), y: pad(y), radius: obstacleRadius });
    }
  }
  return obstacles;
};

export const createSinks = (): Sink[] => {
  const sinks: Sink[] = [];
  const SPACING = obstacleRadius * 2;

  for (let i = 0; i < NUM_SINKS; i++) {
    const x =
      WIDTH / 2 + sinkWidth * (i - Math.floor(NUM_SINKS / 2)) - SPACING * 1.5;
    const y = HEIGHT - 225;
    const width = sinkWidth;
    const height = width - 14;
    sinks.push({ x, y, width, height, multiplier: MULTIPLIERS[i + 1] });
  }

  return sinks;
};
