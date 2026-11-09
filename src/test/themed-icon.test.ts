import { expect, it } from "vitest";
import { themeIconPaths } from "@/lib/themed-icon";
import { THEME_ICON_PALETTE } from "@/lib/theme-icon-palette";

it("uses permanent blue URLs for Chrome shortcut installation", () => {
  expect(themeIconPaths("blue", [0, 93, 209])).toEqual({
    manifest: "/theme-icons/v35/blue.webmanifest",
    apple: "/theme-icons/v35/blue-180.png",
    favicon: "/theme-icons/v35/blue-64.png",
  });
});

it("keeps each preset paired with its own icon set", () => {
  for (const theme of ["dark", "moonlight", "royal", "amethyst", "lavender", "plum", "blue"]) {
    expect(themeIconPaths(theme, [255, 0, 0]).manifest).toBe(`/theme-icons/v35/${theme}.webmanifest`);
  }
});

it("uses the black sphere and white rings icon set only for the white theme", () => {
  expect(themeIconPaths("default", [137, 68, 230])).toEqual({
    manifest: "/theme-icons/v36/default.webmanifest",
    apple: "/theme-icons/v36/default-180.png",
    favicon: "/theme-icons/v36/default-64.png",
  });
  expect(themeIconPaths("dark", [122, 31, 218]).manifest).toBe("/theme-icons/v35/dark.webmanifest");
});

it("maps custom colors to permanent nearest-color icons", () => {
  expect(themeIconPaths("custom", [255, 0, 0]).manifest).toBe("/theme-icons/v35/custom-00.webmanifest");
  expect(themeIconPaths("custom", [128, 128, 128]).manifest).toBe("/theme-icons/v35/neutral.webmanifest");
  for (const entry of THEME_ICON_PALETTE) {
    const result = themeIconPaths("custom", entry.rgb);
    expect(result.manifest).toMatch(/^\/theme-icons\/v35\/[\w-]+\.webmanifest$/);
  }
});