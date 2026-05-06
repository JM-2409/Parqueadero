import { expect, test, describe } from "bun:test";
import { calculateFee, TariffRule } from "./pricing";

describe("calculateFee", () => {
  const entryTime = new Date("2024-05-20T10:00:00Z");
  const exitTime = new Date("2024-05-20T11:00:00Z");

  test("should return 0 when rules is an empty array", () => {
    const rules: TariffRule[] = [];
    const result = calculateFee(entryTime, exitTime, rules);
    expect(result).toBe(0);
  });

  test("should return 0 when rules is null", () => {
    // @ts-ignore
    const result = calculateFee(entryTime, exitTime, null);
    expect(result).toBe(0);
  });

  test("should return 0 when rules is undefined", () => {
    // @ts-ignore
    const result = calculateFee(entryTime, exitTime, undefined);
    expect(result).toBe(0);
  });

  test("should return 0 when exitTime is before entryTime", () => {
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 }
    ];
    const earlierExitTime = new Date(entryTime.getTime() - 1000);
    const result = calculateFee(entryTime, earlierExitTime, rules);
    expect(result).toBe(0);
  });

  test("happy path: should calculate fee correctly for hourly rate", () => {
    const rules: TariffRule[] = [
      { vehicle_type: "car", rate_type: "hora", amount: 1000 }
    ];
    // 1 hour difference
    const result = calculateFee(entryTime, exitTime, rules);
    expect(result).toBe(1000);
  });
});
