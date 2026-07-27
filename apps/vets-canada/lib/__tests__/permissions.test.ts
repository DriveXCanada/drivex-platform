import { describe, it, expect } from "vitest";
import { parsePermissions, PERMISSION_KEYS } from "../permissions";

describe("parsePermissions", () => {
  it("returns an empty list for null/undefined/empty", () => {
    expect(parsePermissions(null)).toEqual([]);
    expect(parsePermissions(undefined)).toEqual([]);
    expect(parsePermissions("")).toEqual([]);
  });

  it("returns an empty list for invalid JSON", () => {
    expect(parsePermissions("not json")).toEqual([]);
    expect(parsePermissions("{")).toEqual([]);
  });

  it("returns an empty list when the JSON is not an array", () => {
    expect(parsePermissions('{"clients":true}')).toEqual([]);
    expect(parsePermissions('"clients"')).toEqual([]);
  });

  it("keeps only recognized permission keys (drops unknown/garbage)", () => {
    expect(parsePermissions('["clients","not-a-key","reports"]')).toEqual([
      "clients",
      "reports",
    ]);
    expect(parsePermissions('["clients", 5, null, "clients"]')).toEqual([
      "clients",
      "clients",
    ]);
  });

  it("accepts a full valid set", () => {
    expect(parsePermissions(JSON.stringify(PERMISSION_KEYS))).toEqual(
      PERMISSION_KEYS
    );
  });
});
