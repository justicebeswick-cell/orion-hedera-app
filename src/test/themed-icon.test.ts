import { expect, it } from "vitest";
import { themeIconPaths } from "@/lib/themed-icon";

it("uses permanent refined artwork URLs for Chrome shortcut installation", () => {
  expect(themeIconPaths("blue", [0, 93, 209])).toEqual({
    manifest: "/orion-refined/manifest-v38.webmanifest",
    apple: "/theme-icons/v37/default-180.png",
    favicon: "/theme-icons/v37/default-64.png",
  });
});

it("keeps the approved black and white icon across every preset", () => {
  for (const theme of ["dark", "moonlight", "royal", "amethyst", "lavender", "plum", "blue"]) {
    expect(themeIconPaths(theme, [255, 0, 0]).manifest).toBe("/orion-refined/manifest-v38.webmanifest");
  }
});

it("uses the same black sphere and white rings in light and dark themes", () => {
  expect(themeIconPaths("default", [137, 68, 230])).toEqual({
    manifest: "/orion-refined/manifest-v38.webmanifest",
    apple: "/theme-icons/v37/default-180.png",
    favicon: "/theme-icons/v37/default-64.png",
  });
  expect(themeIconPaths("dark", [122, 31, 218])).toEqual(themeIconPaths("default", [137, 68, 230]));
});

it("keeps custom app accents from changing the approved icon", () => {
  expect(themeIconPaths("custom", [255, 0, 0])).toEqual(themeIconPaths("custom", [0, 0, 255]));
});