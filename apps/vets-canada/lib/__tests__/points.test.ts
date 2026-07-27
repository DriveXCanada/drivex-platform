import { describe, it, expect } from "vitest";
import {
  defaultPointBudget,
  totalPoints,
  BASE_POINT_BUDGET,
  POINTS_PER_EXTRA_FAMILY_MEMBER,
  type CartLine,
} from "../points";

describe("defaultPointBudget", () => {
  it("gives the base budget for a single person", () => {
    expect(defaultPointBudget(1)).toBe(BASE_POINT_BUDGET); // 60
  });

  it("adds points per extra family member", () => {
    expect(defaultPointBudget(2)).toBe(65);
    expect(defaultPointBudget(5)).toBe(80);
    expect(defaultPointBudget(4)).toBe(
      BASE_POINT_BUDGET + 3 * POINTS_PER_EXTRA_FAMILY_MEMBER
    );
  });

  it("treats 0, negative, or missing family size as one person (never below base)", () => {
    expect(defaultPointBudget(0)).toBe(BASE_POINT_BUDGET);
    expect(defaultPointBudget(-3)).toBe(BASE_POINT_BUDGET);
    // @ts-expect-error exercising the runtime guard for bad input
    expect(defaultPointBudget(undefined)).toBe(BASE_POINT_BUDGET);
  });

  it("floors fractional family sizes", () => {
    expect(defaultPointBudget(2.9)).toBe(65); // floored to 2
  });
});

describe("totalPoints", () => {
  const line = (quantity: number, pointValue: number): CartLine => ({
    itemId: 1,
    quantity,
    pointValue,
  });

  it("is zero for an empty cart", () => {
    expect(totalPoints([])).toBe(0);
  });

  it("multiplies point value by quantity and sums lines", () => {
    expect(totalPoints([line(2, 3), line(1, 10)])).toBe(16);
  });

  it("handles a single line", () => {
    expect(totalPoints([line(4, 5)])).toBe(20);
  });
});
