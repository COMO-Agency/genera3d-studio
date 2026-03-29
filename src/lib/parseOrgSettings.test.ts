import { describe, it, expect } from "vitest";
import { parseOrgSettings } from "@/lib/types";

describe("parseOrgSettings", () => {
  it("returns empty object for null", () => {
    expect(parseOrgSettings(null)).toEqual({});
  });

  it("returns empty object for undefined", () => {
    expect(parseOrgSettings(undefined)).toEqual({});
  });

  it("returns empty object for arrays", () => {
    expect(parseOrgSettings([])).toEqual({});
  });

  it("returns empty object for primitive values", () => {
    expect(parseOrgSettings("string" as any)).toEqual({});
    expect(parseOrgSettings(42 as any)).toEqual({});
  });

  it("parses valid settings object", () => {
    const input = { language: "de", printer_type: "generic" };
    const result = parseOrgSettings(input);
    expect(result.language).toBe("de");
    expect(result.printer_type).toBe("generic");
  });
});
