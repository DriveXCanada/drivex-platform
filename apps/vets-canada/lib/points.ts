/**
 * Points system helpers.
 *
 * - Each category has a `point_value`: the cost of taking one item from it.
 * - Each client has a `point_budget` used during a visit.
 * - The default budget formula is: 60 + (family_size - 1) * 5
 */

export const BASE_POINT_BUDGET = 60;
export const POINTS_PER_EXTRA_FAMILY_MEMBER = 5;

/**
 * Calculate the default point budget for a client based on family size.
 */
export function defaultPointBudget(familySize: number): number {
  const size = Math.max(1, Math.floor(familySize || 1));
  return BASE_POINT_BUDGET + (size - 1) * POINTS_PER_EXTRA_FAMILY_MEMBER;
}

export interface CartLine {
  itemId: number;
  quantity: number;
  pointValue: number;
}

/**
 * Total the points used by a set of cart lines.
 */
export function totalPoints(lines: CartLine[]): number {
  return lines.reduce(
    (sum, line) => sum + line.pointValue * line.quantity,
    0
  );
}
