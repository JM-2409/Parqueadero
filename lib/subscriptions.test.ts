import { describe, expect, it } from "vitest";
import {
  addDaysToSubscriptionDate,
  formatSubscriptionDate,
  formatSubscriptionPrice,
  getSubscriptionPeriodEnd,
} from "./subscriptions";

describe("subscription date and price helpers", () => {
  it("calculates monthly periods across month boundaries", () => {
    expect(getSubscriptionPeriodEnd("2026-01-31", "monthly")).toBe(
      "2026-02-27",
    );
  });

  it("calculates quarterly and annual periods", () => {
    expect(getSubscriptionPeriodEnd("2026-11-09", "quarterly")).toBe(
      "2027-02-08",
    );
    expect(getSubscriptionPeriodEnd("2024-02-29", "yearly")).toBe(
      "2025-02-27",
    );
  });

  it("adds days without relying on the computer time zone", () => {
    expect(addDaysToSubscriptionDate("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("formats timestamps in the parking platform time zone", () => {
    expect(formatSubscriptionDate("2026-11-09T05:00:00.000Z")).toBe(
      "2026-11-09",
    );
  });

  it("formats COP prices for the public price list", () => {
    expect(formatSubscriptionPrice(50000)).toContain("50.000");
  });
});
