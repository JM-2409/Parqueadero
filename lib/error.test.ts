import { expect, test, describe } from "vitest";
import { getErrorMessage } from "./error";

describe("getErrorMessage utility function", () => {
  test("should handle Error instances", () => {
    const error = new Error("This is an error");
    expect(getErrorMessage(error)).toBe("This is an error");
  });

  test("should handle PostgrestError-like objects with a message property", () => {
    const error = { message: "Database connection failed", code: "500" };
    expect(getErrorMessage(error)).toBe("Database connection failed");
  });

  test("should handle simple strings", () => {
    const error = "A string error message";
    expect(getErrorMessage(error)).toBe("A string error message");
  });

  test("should return 'Unknown error occurred' for null", () => {
    expect(getErrorMessage(null)).toBe("Unknown error occurred");
  });

  test("should return 'Unknown error occurred' for undefined", () => {
    expect(getErrorMessage(undefined)).toBe("Unknown error occurred");
  });

  test("should return 'Unknown error occurred' for numbers", () => {
    expect(getErrorMessage(404)).toBe("Unknown error occurred");
  });

  test("should return 'Unknown error occurred' for arrays or empty objects without message", () => {
    expect(getErrorMessage({})).toBe("Unknown error occurred");
    expect(getErrorMessage([])).toBe("Unknown error occurred");
  });
});
