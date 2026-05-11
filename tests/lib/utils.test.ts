import { expect, test, describe } from "bun:test";
import { cn } from "../../lib/utils";

describe("cn utility function", () => {
  test("merges basic class names", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  test("handles conditional classes with objects", () => {
    expect(cn("class1", { class2: true, class3: false })).toBe("class1 class2");
  });

  test("handles arrays of classes", () => {
    expect(cn(["class1", "class2"], "class3")).toBe("class1 class2 class3");
  });

  test("handles conditional classes with logical operators", () => {
    const isTrue = true;
    const isFalse = false;
    expect(cn("class1", isTrue && "class2", isFalse && "class3")).toBe("class1 class2");
  });

  test("merges conflicting Tailwind CSS classes", () => {
    // twMerge should resolve conflicts like p-2 and p-4, keeping the last one
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("px-2 py-1", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  test("handles complex combinations", () => {
    const isActive = true;
    expect(
      cn(
        "base-class text-sm",
        isActive ? "bg-blue-500" : "bg-gray-200",
        { "font-bold": isActive, "text-gray-500": !isActive },
        ["px-4", "py-2"],
        "text-lg" // Should override text-sm
      )
    ).toBe("base-class bg-blue-500 font-bold px-4 py-2 text-lg");
  });

  test("ignores undefined, null, and empty string values", () => {
    expect(cn("class1", undefined, null, "", "class2")).toBe("class1 class2");
  });
});
