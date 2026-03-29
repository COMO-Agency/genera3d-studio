import { describe, it, expect } from "vitest";
import {
  stripHtml,
  sanitizeHtml,
  detectXss,
  sanitizeText,
  sanitizeForCsv,
  sanitizeFilename,
  isValidEmail,
  isValidSerialNumber,
  truncate,
  sanitizeSearchQuery,
  isPotentiallyDangerous,
} from "./sanitize";

describe("sanitize", () => {
  describe("stripHtml", () => {
    it("should remove HTML tags", () => {
      expect(stripHtml("<p>Hello</p>")).toBe("Hello");
      expect(stripHtml("<script>alert(1)</script>")).toBe("alert(1)");
      expect(stripHtml("<div>Text<br/>More</div>")).toBe("TextMore");
    });

    it("should handle empty and null inputs", () => {
      expect(stripHtml("")).toBe("");
      expect(stripHtml(null as unknown as string)).toBe("");
      expect(stripHtml(undefined as unknown as string)).toBe("");
    });

    it("should return plain text unchanged", () => {
      expect(stripHtml("Hello World")).toBe("Hello World");
      expect(stripHtml("Text with < angle brackets")).toBe(
        "Text with < angle brackets",
      );
    });
  });

  describe("sanitizeHtml", () => {
    it("should allow specified tags", () => {
      expect(sanitizeHtml("<p>Hello</p>", ["p"])).toBe("<p>Hello</p>");
      expect(sanitizeHtml("<b>Bold</b> <i>Italic</i>", ["b", "i"])).toBe(
        "<b>Bold</b> <i>Italic</i>",
      );
    });

    it("should remove non-allowed tags", () => {
      expect(sanitizeHtml("<script>alert(1)</script>Hello", ["p"])).toBe(
        "alert(1)Hello",
      );
      expect(sanitizeHtml("<div><p>Text</p></div>", ["p"])).toBe("<p>Text</p>");
    });

    it("should handle empty inputs", () => {
      expect(sanitizeHtml("")).toBe("");
      expect(sanitizeHtml(null as unknown as string)).toBe("");
    });
  });

  describe("detectXss", () => {
    it("should detect script tags", () => {
      expect(detectXss("<script>alert(1)</script>")).toBe(true);
      expect(detectXss("<SCRIPT>alert(1)</SCRIPT>")).toBe(true);
    });

    it("should detect javascript protocol", () => {
      expect(detectXss("javascript:alert(1)")).toBe(true);
      expect(detectXss("JaVaScRiPt:alert(1)")).toBe(true);
    });

    it("should detect event handlers", () => {
      expect(detectXss('<div onclick="alert(1)">')).toBe(true);
      expect(detectXss('<img onerror="alert(1)" />')).toBe(true);
    });

    it("should allow safe content", () => {
      expect(detectXss("Hello World")).toBe(false);
      expect(detectXss("<p>Safe paragraph</p>")).toBe(false);
      expect(detectXss("")).toBe(false);
    });

    it("should handle empty inputs", () => {
      expect(detectXss("")).toBe(false);
      expect(detectXss(null as unknown as string)).toBe(false);
    });
  });

  describe("sanitizeText", () => {
    it("should strip HTML tags and return plain text", () => {
      expect(sanitizeText('<>&"')).toBe('&"');
      expect(sanitizeText("<script>")).toBe("");
    });

    it("should handle empty inputs", () => {
      expect(sanitizeText("")).toBe("");
      expect(sanitizeText(null as unknown as string)).toBe("");
      expect(sanitizeText(undefined as unknown as string)).toBe("");
    });

    it("should return plain text unchanged", () => {
      expect(sanitizeText("Hello World")).toBe("Hello World");
      expect(sanitizeText("Special chars: @#$%")).toBe("Special chars: @#$%");
    });
  });

  describe("sanitizeForCsv", () => {
    it("should prefix formula injection characters", () => {
      expect(sanitizeForCsv("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeForCsv("+1234567890")).toBe("'+1234567890");
      expect(sanitizeForCsv("-1234567890")).toBe("'-1234567890");
      expect(sanitizeForCsv("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
    });

    it("should not prefix mid-string newlines and tabs", () => {
      expect(sanitizeForCsv("Line\nBreak")).toBe("Line\nBreak");
      expect(sanitizeForCsv("Tab\tSeparated")).toBe("Tab\tSeparated");
    });

    it("should return safe text unchanged", () => {
      expect(sanitizeForCsv("Normal text")).toBe("Normal text");
      expect(sanitizeForCsv("Hello World")).toBe("Hello World");
    });

    it("should handle empty inputs", () => {
      expect(sanitizeForCsv("")).toBe("");
    });
  });

  describe("sanitizeFilename", () => {
    it("should remove invalid characters", () => {
      expect(sanitizeFilename("file<name>.txt")).toBe("file_name_.txt");
      expect(sanitizeFilename("file:name|?*.txt")).toBe("file_name___.txt");
    });

    it("should replace spaces with underscores", () => {
      expect(sanitizeFilename("my file name.txt")).toBe("my_file_name.txt");
    });

    it("should handle long names", () => {
      const longName = "a".repeat(300);
      expect(sanitizeFilename(longName).length).toBe(255);
    });

    it("should handle empty or invalid inputs", () => {
      expect(sanitizeFilename("")).toBe("untitled");
      expect(sanitizeFilename(null as unknown as string)).toBe("untitled");
    });
  });

  describe("isValidEmail", () => {
    it("should validate correct emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
      expect(isValidEmail("user+tag@example.com")).toBe(true);
    });

    it("should reject invalid emails", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("user@domain")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("isValidSerialNumber", () => {
    it("should validate correct serial numbers", () => {
      expect(isValidSerialNumber("ABC123")).toBe(true);
      expect(isValidSerialNumber("123-456-789")).toBe(true);
      expect(isValidSerialNumber("SN_2024_001")).toBe(true);
    });

    it("should reject invalid serial numbers", () => {
      expect(isValidSerialNumber("AB")).toBe(false); // Too short
      expect(isValidSerialNumber("")).toBe(false);
      expect(isValidSerialNumber("ABC!@#")).toBe(false); // Special chars
      expect(isValidSerialNumber("ABC 123")).toBe(false); // Space
    });
  });

  describe("truncate", () => {
    it("should truncate long strings", () => {
      expect(truncate("Hello World", 5)).toBe("Hello");
      expect(truncate("This is a very long text", 10)).toBe("This is a ");
    });

    it("should return short strings unchanged", () => {
      expect(truncate("Hi", 10)).toBe("Hi");
      expect(truncate("Hello", 5)).toBe("Hello");
    });

    it("should handle empty inputs", () => {
      expect(truncate("", 10)).toBe("");
      expect(truncate(null as unknown as string, 10)).toBe("");
    });
  });

  describe("sanitizeSearchQuery", () => {
    it("should remove SQL wildcards", () => {
      expect(sanitizeSearchQuery("%test%")).toBe("test");
      expect(sanitizeSearchQuery("_underscore")).toBe("underscore");
    });

    it("should remove dangerous characters", () => {
      expect(sanitizeSearchQuery("'single'\"double\"")).toBe("singledouble");
      expect(sanitizeSearchQuery("test;drop")).toBe("testdrop");
    });

    it("should trim whitespace", () => {
      expect(sanitizeSearchQuery("  test  ")).toBe("test");
    });

    it("should handle empty inputs", () => {
      expect(sanitizeSearchQuery("")).toBe("");
    });
  });

  describe("isPotentiallyDangerous", () => {
    it("should detect XSS patterns", () => {
      expect(isPotentiallyDangerous("<script>alert(1)</script>")).toEqual({
        safe: false,
        reason: "XSS patterns detected",
      });
    });

    it("should detect very long strings", () => {
      const longString = "a".repeat(10001);
      expect(isPotentiallyDangerous(longString)).toEqual({
        safe: false,
        reason: "Input too long",
      });
    });

    it("should allow safe strings", () => {
      expect(isPotentiallyDangerous("Hello World")).toEqual({ safe: true });
      expect(isPotentiallyDangerous("")).toEqual({ safe: true });
    });
  });
});
