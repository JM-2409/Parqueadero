import { expect, test, describe } from "vitest";
import { sanitizeInput } from "./sanitize";

describe("sanitizeInput utility function", () => {
  test("should strip basic HTML tags", () => {
    const input = "<script>alert('XSS')</script>Hello";
    expect(sanitizeInput(input)).toBe("Hello");
  });

  test("should handle bold and italic tags by keeping inner text", () => {
    const input = "<b>Bold</b> and <i>Italic</i> text";
    expect(sanitizeInput(input)).toBe("Bold and Italic text");
  });

  test("should trim whitespace", () => {
    const input = "   Hello World   ";
    expect(sanitizeInput(input)).toBe("Hello World");
  });

  test("should return empty string for null", () => {
    expect(sanitizeInput(null)).toBe("");
  });

  test("should return empty string for undefined", () => {
    expect(sanitizeInput(undefined)).toBe("");
  });

  test("should return empty string for empty string", () => {
    expect(sanitizeInput("")).toBe("");
  });

  test("should handle plain text without changes", () => {
    const input = "A safe plain text observation.";
    expect(sanitizeInput(input)).toBe(input);
  });
});
