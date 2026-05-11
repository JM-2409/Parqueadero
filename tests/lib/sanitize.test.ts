import { expect, test, describe } from "bun:test";
import { sanitizeInput } from "../../lib/sanitize";

describe("sanitizeInput utility function", () => {
  test("returns empty string when input is falsy", () => {
    expect(sanitizeInput("")).toBe("");

    // Testing edge cases that bypass TypeScript types
    // @ts-expect-error testing invalid input types
    expect(sanitizeInput(null)).toBe("");
    // @ts-expect-error testing invalid input types
    expect(sanitizeInput(undefined)).toBe("");
  });

  test("trims whitespace from start and end", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
    expect(sanitizeInput(" \t hello world \n ")).toBe("hello world");
  });

  test("removes < and > characters", () => {
    expect(sanitizeInput("<script>")).toBe("script");
    expect(sanitizeInput("hello < world >")).toBe("hello  world");
    expect(sanitizeInput("<<multiple>>")).toBe("multiple");
  });

  test("handles combinations of spaces and tags", () => {
    expect(sanitizeInput("  <script>alert(1)</script>  ")).toBe("scriptalert(1)/script");
    expect(sanitizeInput(" < > ")).toBe("");
  });

  test("leaves normal text unchanged", () => {
    expect(sanitizeInput("hello world")).toBe("hello world");
    expect(sanitizeInput("normal string with numbers 123 and punctuation !@#$()")).toBe("normal string with numbers 123 and punctuation !@#$()");
  });
});
