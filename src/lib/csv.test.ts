import { describe, it, expect } from "vitest";

// Inline the function since it's defined inside ProductionHistory
const escapeCsv = (value: string): string => {
  const str = String(value);
  if (/^[\+\-\=@\t\r\n]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  if (str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(',')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

describe("escapeCsv", () => {
  it("returns plain text unchanged", () => {
    expect(escapeCsv("hello")).toBe("hello");
  });

  it("escapes formula injection with =", () => {
    expect(escapeCsv("=SUM(A1)")).toBe("\"'=SUM(A1)\"");
  });

  it("escapes formula injection with +", () => {
    expect(escapeCsv("+cmd")).toBe("\"'+cmd\"");
  });

  it("escapes formula injection with -", () => {
    expect(escapeCsv("-cmd")).toBe("\"'-cmd\"");
  });

  it("escapes formula injection with @", () => {
    expect(escapeCsv("@SUM")).toBe("\"'@SUM\"");
  });

  it("wraps values with commas in quotes", () => {
    expect(escapeCsv("a,b")).toBe('"a,b"');
  });

  it("escapes double quotes", () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });
});
