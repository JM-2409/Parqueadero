import { expect, test, describe } from "vitest";
import { cn, formatElapsedDuration, getSessionVehicle } from "./utils";

describe("cn utility function", () => {
  test("should merge tailwind classes correctly", () => {
    // Expected behavior of tailwind-merge: resolving conflicting classes
    const result = cn("p-2", "p-4");
    expect(result).toBe("p-4");
  });

  test("should handle clsx conditional classes correctly", () => {
    // Expected behavior of clsx: resolving conditional objects
    const isActive = true;
    const isError = false;
    const result = cn("btn", { "btn-active": isActive, "btn-error": isError });
    expect(result).toBe("btn btn-active");
  });

  test("should handle arrays of classes", () => {
    const result = cn(["flex", "items-center"], "justify-between");
    expect(result).toBe("flex items-center justify-between");
  });

  test("should ignore undefined, null, or false values", () => {
    const result = cn("text-red-500", undefined, null, false, "bg-blue-500");
    expect(result).toBe("text-red-500 bg-blue-500");
  });

  test("should combine both clsx conditionals and twMerge correctly", () => {
    // Conditionals output: "px-2 py-1 bg-red-500"
    // TwMerge input: "px-2 py-1 bg-red-500 p-4" -> resolves to "bg-red-500 p-4"
    const isDanger = true;
    const result = cn("px-2 py-1", { "bg-red-500": isDanger }, "p-4");
    expect(result).toBe("bg-red-500 p-4");
  });
});

describe("getSessionVehicle", () => {
  test("lee la placa cuando vehicles es un objeto", () => {
    const vehicle = getSessionVehicle({
      vehicles: { plate: "ABC123", type: "carros" },
    });
    expect(vehicle.plate).toBe("ABC123");
    expect(vehicle.type).toBe("carros");
  });

  test("lee la placa cuando vehicles llega como arreglo", () => {
    const vehicle = getSessionVehicle({
      vehicles: [{ plate: "XYZ99", type: "motos" }],
    });
    expect(vehicle.plate).toBe("XYZ99");
    expect(vehicle.type).toBe("motos");
  });

  test("devuelve valores vacíos si no hay vehículo", () => {
    expect(getSessionVehicle({ vehicles: null })).toEqual({
      plate: "",
      type: "",
    });
  });
});

describe("formatElapsedDuration", () => {
  test("formatea horas y minutos transcurridos", () => {
    const entry = new Date("2026-11-05T10:00:00");
    const now = new Date("2026-11-05T12:15:00");
    expect(formatElapsedDuration(entry, now)).toBe("2 h 15 min");
  });
});
