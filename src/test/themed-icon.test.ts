import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { themeIconPaths } from "@/lib/themed-icon";

it("uses permanent refined artwork URLs for Chrome shortcut installation", () => {
  expect(themeIconPaths("blue", [0, 93, 209])).toEqual({
    manifest: "/oreon/v43/manifest.webmanifest",
    apple: "/oreon/v43/icon-180.png",
    favicon: "/oreon/v43/icon-64.png",
  });
});

it("keeps the approved black and white icon across every preset", () => {
  for (const theme of ["dark", "moonlight", "royal", "amethyst", "lavender", "plum", "blue"]) {
    expect(themeIconPaths(theme, [255, 0, 0]).manifest).toBe("/oreon/v43/manifest.webmanifest");
  }
});

it("uses the same black sphere and white rings in light and dark themes", () => {
  expect(themeIconPaths("default", [137, 68, 230])).toEqual({
    manifest: "/oreon/v43/manifest.webmanifest",
    apple: "/oreon/v43/icon-180.png",
    favicon: "/oreon/v43/icon-64.png",
  });
  expect(themeIconPaths("dark", [122, 31, 218])).toEqual(themeIconPaths("default", [137, 68, 230]));
});

it("keeps custom app accents from changing the approved icon", () => {
  expect(themeIconPaths("custom", [255, 0, 0])).toEqual(themeIconPaths("custom", [0, 0, 255]));
});

it("serves the smaller logo mark from files the browser can fetch", () => {
  const manifest = JSON.parse(
    readFileSync(resolve("public/oreon/v43/manifest.webmanifest"), "utf8"),
  ) as { icons: { src: string }[] };
  expect(manifest.icons.map((i) => i.src)).toEqual([
    "/oreon/v43/icon-192.png",
    "/oreon/v43/icon-512.png",
    "/oreon/v43/icon-1024.png",
  ]);
  for (const icon of manifest.icons) {
    expect(existsSync(resolve("public", icon.src.replace(/^\//, ""))), icon.src).toBe(true);
  }
  for (const file of ["icon-64.png", "icon-180.png"]) {
    expect(existsSync(resolve("public/oreon/v43", file)), file).toBe(true);
  }
});
