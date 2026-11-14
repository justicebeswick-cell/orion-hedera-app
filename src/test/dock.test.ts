import { describe, expect, it } from "vitest";
import { resolveDock } from "@/lib/preferences";

describe("tab bar position", () => {
  it("uses the side rail when chosen", () => expect(resolveDock("side", 1024, 0, 0)).toBe("side"));
  it("keeps the bottom bar when chosen", () => expect(resolveDock("bottom", 382, 0, 60)).toBe("bottom"));
  it("auto picks the rail on a narrow screen with a large right-only inset", () => expect(resolveDock("auto", 382, 0, 44)).toBe("side"));
  it("auto keeps the bottom bar on normal phones", () => expect(resolveDock("auto", 390, 0, 0)).toBe("bottom"));
  it("auto keeps the bottom bar for symmetric landscape insets", () => expect(resolveDock("auto", 430, 47, 47)).toBe("bottom"));
});
