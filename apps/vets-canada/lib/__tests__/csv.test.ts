import { describe, it, expect } from "vitest";
import { toCsv } from "../csv";

const BOM = "﻿";

describe("toCsv", () => {
  it("prepends a UTF-8 BOM and joins with CRLF", () => {
    const out = toCsv(["a", "b"], [["1", "2"]]);
    expect(out.startsWith(BOM)).toBe(true);
    expect(out).toBe(`${BOM}a,b\r\n1,2`);
  });

  it("renders null/undefined cells as empty", () => {
    const out = toCsv(["a", "b", "c"], [[null, undefined, "x"]]);
    expect(out).toBe(`${BOM}a,b,c\r\n,,x`);
  });

  it("quotes and escapes cells containing commas, quotes, or newlines", () => {
    const out = toCsv(
      ["name", "note"],
      [["Smith, John", 'He said "hi"'], ["multi\nline", "ok"]]
    );
    const lines = out.slice(BOM.length).split("\r\n");
    expect(lines[1]).toBe('"Smith, John","He said ""hi"""');
    expect(lines[2]).toBe('"multi\nline",ok');
  });

  it("handles a header-only export", () => {
    expect(toCsv(["h1", "h2"], [])).toBe(`${BOM}h1,h2`);
  });
});
