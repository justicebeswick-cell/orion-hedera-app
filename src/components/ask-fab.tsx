import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

/** Floating shortcut to AI Studio on the main wallet screens. */
export function AskFab() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!["/", "/vault", "/stake"].includes(path)) return null;
  return (
    <Link
      to="/studio"
      aria-label="Ask AURION AI"
      className="fixed right-4 bottom-24 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-primary/50 bg-card text-signal shadow-[0_8px_30px_-8px_var(--color-primary)] transition-transform active:scale-95 hover:scale-105"
    >
      <Sparkles size={20} />
    </Link>
  );
}
