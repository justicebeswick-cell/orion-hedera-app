import { describe, expect, it } from "vitest";
import { resolveDock } from "@/lib/preferences";

describe("tab bar position", () => {
  it("uses the side rail when chosen on a folded phone", () => expect(resolveDock("side", 390, 844)).toBe("side"));
  it("keeps the bottom bar when chosen on a wide screen", () => expect(resolveDock("bottom", 890, 900)).toBe("bottom"));
  it("auto keeps the bottom bar on folded phones", () => expect(resolveDock("auto", 390, 844)).toBe("bottom"));
  it("auto selects the rail at the specified 680px threshold", () => {
    expect(resolveDock("auto", 679, 1000)).toBe("bottom");
    expect(resolveDock("auto", 680, 1000)).toBe("side");
  });
  it("auto selects the rail only above the specified 4/5 aspect ratio", () => {
    expect(resolveDock("auto", 640, 800)).toBe("bottom");
    expect(resolveDock("auto", 641, 800)).toBe("side");
  });
});
