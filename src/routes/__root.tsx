import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LaunchScreen } from "@/components/launch-screen";
import { LockScreen } from "@/components/lock-screen";
import { needsUnlock } from "@/lib/lock";
import { Toaster } from "@/components/ui/sonner";
import { GeneralPreferences } from "@/components/general-preferences";
import { useSecurityPreferences } from "@/lib/security-preferences";
import { UNLOCKED } from "@/lib/lock";
import { handleHapticClick } from "@/lib/haptics";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
      { name: "apple-mobile-web-app-title", content: "Orion" },
      { name: "theme-color", content: "#050308" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Josefin+Sans:wght@300;400&family=Montserrat:wght@400;500;600;700&family=Sora:wght@400;500;600&display=swap" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon-v33.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon-v33.png" },
      { rel: "manifest", href: "/manifest.webmanifest?v=29" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Public pages anyone may read without unlocking the wallet.
const PUBLIC_PATHS = ["/company", "/privacy", "/terms", "/about", "/fonts"];

function LockGate({ children }: { children: ReactNode }) {
  const security = useSecurityPreferences();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // null = still checking storage (avoids flashing the wallet before the lock appears)
  const [locked, setLocked] = useState<boolean | null>(null);
  useEffect(() => {
    setLocked(PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ? false : needsUnlock());
  }, [pathname]);
  useEffect(() => {
    if (!security.autoLock || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return;
    let lastActivity = Date.now();
    const touch = () => { lastActivity = Date.now(); };
    const check = () => { if (Date.now() - lastActivity < security.autoLock * 60_000 || locked) return; if (!localStorage.getItem("aurion.account") || !localStorage.getItem("aurion.keystore")) return; sessionStorage.removeItem(UNLOCKED); setLocked(true); };
    const timer = window.setInterval(check, 1000);
    document.addEventListener("pointerdown", touch); document.addEventListener("keydown", touch); document.addEventListener("visibilitychange", check);
    return () => { clearInterval(timer); document.removeEventListener("pointerdown", touch); document.removeEventListener("keydown", touch); document.removeEventListener("visibilitychange", check); };
  }, [security.autoLock, pathname, locked]);
  if (locked === null) return null;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;
  return <>{children}</>;
}

function RootComponent() {
  useEffect(() => {
    document.addEventListener("click", handleHapticClick, true);
    return () => document.removeEventListener("click", handleHapticClick, true);
  }, []);
  // Ask the browser never to clear this device's saved account and key on its own.
  useEffect(() => { navigator.storage?.persist?.().catch(() => {}); }, []);
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <GeneralPreferences />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <LockGate>
        <Outlet />
      </LockGate>

      <Toaster theme="dark" position="top-center" />
      <LaunchScreen />
    </QueryClientProvider>
  );
}
