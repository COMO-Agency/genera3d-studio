import { describe, it, expect } from "vitest";
import { toParenthesisedGs1 } from "@/components/Gs1DataMatrix";

describe("toParenthesisedGs1", () => {
  it("returns already-parenthesised strings as-is", () => {
    const input = "(01)04812345678901(11)260326(21)SN001";
    expect(toParenthesisedGs1(input)).toBe(input);
  });

  it("converts raw GS1 with GS separators to parenthesised format", () => {
    const input = "0104812345678901\x1D11260326\x1D21SN001";
    const expected = "(01)04812345678901(11)260326(21)SN001";
    expect(toParenthesisedGs1(input)).toBe(expected);
  });

  it("handles string with leading AI digits", () => {
    const input = "0104812345678901";
    const result = toParenthesisedGs1(input);
    expect(result.startsWith("(01)")).toBe(true);
  });
});
