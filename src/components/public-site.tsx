import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { AurionLogo } from "@/components/aurion";
import { HederaMark } from "@/components/hbar";
import { Button } from "@/components/ui/button";

export function publicHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Orion` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Orion` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] };
}

export function PublicSite({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-screen max-w-5xl px-5 sm:px-10">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b py-6">
      <Link to="/company" className="flex items-center gap-3" aria-label="Orion company website">
        <AurionLogo className="h-12 w-12" />
        <span className="text-lg font-semibold">Orion</span>
      </Link>
      <Button asChild variant="outline"><Link to="/">Open wallet <ArrowUpRight size={16} /></Link></Button>
    </header>
    <main className="py-12 sm:py-16">{children}</main>
    <footer className="flex flex-wrap items-center justify-between gap-6 border-t py-8 text-sm text-muted-foreground">
      <p className="flex items-center gap-2"><HederaMark size={16} /> Powered by Hedera</p>
      <nav aria-label="Company and legal" className="flex flex-wrap gap-5">
        <Link to="/company" className="hover:text-foreground">Company</Link>
        <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-foreground">User Agreement</Link>
      </nav>
    </footer>
  </div>;
}

export function PolicyPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <PublicSite><article className="mx-auto max-w-3xl">
    <p className="mb-4 text-sm text-signal">Owner review draft · Prepared October 23, 2026</p>
    <h1 className="text-4xl font-display sm:text-5xl">{title}</h1>
    <p className="mt-5 text-base leading-7 text-muted-foreground">{intro}</p>
    <aside className="my-8 border-l-2 border-signal pl-5 text-sm leading-6">
      Not yet effective. The legal operator, contact email and applicable jurisdiction have not been supplied.
      These documents require owner approval and legal review before store submission.
    </aside>
    <div className="space-y-9 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-medium [&_p]:leading-7 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-muted-foreground">{children}</div>
  </article></PublicSite>;
}