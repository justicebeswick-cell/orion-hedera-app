// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Wallet/Hedera SDKs are browser-only here. Keep them out of the server bundle:
// the published server would otherwise load grpc and crash on startup.
const BROWSER_ONLY = /^@(hashgraph|hiero-ledger|walletconnect|reown)\//;
const STUB = "\0aurion-browser-only-stub";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      {
        name: "aurion-browser-only-sdks",
        enforce: "pre",
        resolveId(id, _importer, opts) {
          const envName: string | undefined = this.environment?.name;
          const server = opts?.ssr || (envName !== undefined && envName !== "client");
          if (server && BROWSER_ONLY.test(id)) return STUB;
          return null;
        },
        load(id) {
          if (id === STUB) return "export default {};";
          return null;
        },
      },
    ],
  },
});
