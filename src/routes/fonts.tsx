import { createFileRoute } from "@tanstack/react-router";
import { Shell, Panel, Label, AurionLogo } from "@/components/aurion";
import { HbarLogo } from "@/components/hbar";

const SERIFS = [
  { name: "Cormorant Garamond", stack: '"Cormorant Garamond", serif', note: "in use now — thin, refined" },
  { name: "Cinzel", stack: '"Cinzel", serif', note: "engraved Roman capitals" },
  { name: "Marcellus", stack: '"Marcellus", serif', note: "classical, understated" },
  { name: "Bodoni Moda", stack: '"Bodoni Moda", serif', note: "high contrast, fashion" },
  { name: "Prata", stack: '"Prata", serif', note: "delicate, old-world" },
  { name: "Playfair Display", stack: '"Playfair Display", serif', note: "magazine cover" },
  { name: "Instrument Serif", stack: '"Instrument Serif", serif', note: "very thin, high fashion" },
  { name: "Newsreader", stack: '"Newsreader", serif', note: "editorial, well-set" },
  { name: "Young Serif", stack: '"Young Serif", serif', note: "new-feeling, warm" },
  { name: "Fraunces", stack: '"Fraunces", serif', note: "modern with character" },
];

const SANS = [
  { name: "Sora", stack: '"Sora", sans-serif', note: "in use now — geometric" },
  { name: "Hanken Grotesk", stack: '"Hanken Grotesk", sans-serif', note: "friendly, grown-up" },
  { name: "Schibsted Grotesk", stack: '"Schibsted Grotesk", sans-serif', note: "crisp, Nordic" },
  { name: "Onest", stack: '"Onest", sans-serif', note: "modern, neutral" },
  { name: "Bricolage Grotesque", stack: '"Bricolage Grotesque", sans-serif', note: "has personality" },
  { name: "Jost", stack: '"Jost", sans-serif', note: "geometric, Futura-like" },
  { name: "Figtree", stack: '"Figtree", sans-serif', note: "soft, approachable" },
  { name: "Space Grotesk", stack: '"Space Grotesk", sans-serif', note: "techy, angular" },
  { name: "Syne", stack: '"Syne", sans-serif', note: "futuristic capitals" },
  { name: "Instrument Sans", stack: '"Instrument Sans", sans-serif', note: "quiet, very clean" },
];

const MONOS = [
  { name: "JetBrains Mono", stack: '"JetBrains Mono", monospace', note: "in use now — crisp" },
  { name: "Victor Mono", stack: '"Victor Mono", monospace', note: "elegant, has a real italic" },
  { name: "Spline Sans Mono", stack: '"Spline Sans Mono", monospace', note: "soft, easy on the eyes" },
  { name: "Azeret Mono", stack: '"Azeret Mono", monospace', note: "wide, fine instrumentation" },
  { name: "DM Mono", stack: '"DM Mono", monospace', note: "minimal, precise" },
  { name: "Chivo Mono", stack: '"Chivo Mono", monospace', note: "industrial, clear" },
  { name: "Share Tech Mono", stack: '"Share Tech Mono", monospace', note: "retro terminal" },
  { name: "Martian Mono", stack: '"Martian Mono", monospace', note: "very wide, striking" },
  { name: "IBM Plex Mono", stack: '"IBM Plex Mono", monospace', note: "data-focused" },
];

const PAIRS = [
  { name: "Monument", display: '"Cinzel", serif', sans: '"Hanken Grotesk", sans-serif', mono: '"Victor Mono", monospace' },
  { name: "Whisper", display: '"Marcellus", serif', sans: '"Onest", sans-serif', mono: '"DM Mono", monospace' },
  { name: "Editorial", display: '"Newsreader", serif', sans: '"Schibsted Grotesk", sans-serif', mono: '"Spline Sans Mono", monospace' },
  { name: "AURION today", display: '"Cormorant Garamond", serif', sans: '"Sora", sans-serif', mono: '"JetBrains Mono", monospace' },
];

export const Route = createFileRoute("/fonts")({
  head: () => ({
    meta: [
      { title: "AURION — Type samples" },
      { name: "description", content: "Font samples for AURION, shown inside the real wallet screens." },
    ],
    links: [
      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Cinzel:wght@400;500;600&family=Marcellus&family=Bodoni+Moda:opsz,wght@6..96,400;600&family=Prata&family=Playfair+Display:wght@400;500;600&family=Instrument+Serif&family=Newsreader:opsz,wght@6..72,400;600&family=Young+Serif&family=Fraunces:opsz,wght@9..144,400;600&display=swap",
      },
      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Schibsted+Grotesk:wght@400;500;600&family=Onest:wght@400;500;600&family=Bricolage+Grotesque:opsz,wght@12..96,400;600&family=Jost:wght@400;500;600&family=Figtree:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&family=Syne:wght@400;500;600&family=Instrument+Sans:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Victor+Mono:ital,wght@0,400;0,500&family=Spline+Sans+Mono:wght@400;500&family=Azeret+Mono:wght@400;500;600&family=DM+Mono:wght@400;500&family=Chivo+Mono:wght@400;500;600&family=Share+Tech+Mono&family=Martian+Mono:wdth,wght@75..100,400;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: Fonts,
});

function Fonts() {
  return (
    <Shell title="Type samples">
      <p className="mb-6 text-sm text-muted-foreground">
        Every font below is rendered inside a real AURION screen — the balance, a receipt, a button — so you can
        judge it the way you'll actually see it.
      </p>

      <Label><span className="mt-2 block">Serifs — the words that matter</span></Label>
      {SERIFS.map((f) => <Sample key={f.name} f={f} />)}

      <Label><span className="mt-8 block">Sans — buttons, menus, everything else</span></Label>
      {SANS.map((f) => <Sample key={f.name} f={f} />)}

      <Label><span className="mt-8 block">Monospace — numbers, dates, account ids</span></Label>
      {MONOS.map((f) => <Sample key={f.name} f={f} />)}

      <Label><span className="mt-8 block">Full looks — three fonts working together</span></Label>
      <div className="space-y-4">
        {PAIRS.map((p) => <Mock key={p.name} p={p} />)}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Tell me which name (or mix) you want and I'll make it the app. This page is only a sample board.
      </p>
    </Shell>
  );
}

function Sample({ f }: { f: { name: string; stack: string; note: string } }) {
  return (
    <div className="panel mt-4 p-4" style={{ fontFamily: f.stack }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg leading-tight">{f.name}</p>
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{f.note}</p>
      </div>
      <div className="mt-3 border-t pt-3">
        <p className="font-mono text-[11px] text-muted-foreground tnum">0.0.1006</p>
        <p className="mt-1 flex items-center gap-2 text-3xl tnum">
          1,204.88 <HbarLogo size={20} />
        </p>
        <div className="mt-3 flex items-center justify-between gap-4 border-t pt-3">
          <div>
            <p className="text-xl leading-tight">Transfer</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground tnum">
              2026-09-10 23:44:48 UTC
            </p>
          </div>
          <span className="text-base tnum text-flare">+10.5278018</span>
        </div>
        <button className="btn mt-3 w-full">Send HBAR</button>
        <p className="mt-3 text-sm text-muted-foreground">Prove it. Agree it. Hold it. On Hedera.</p>
      </div>
    </div>
  );
}

function Mock({ p }: { p: { name: string; display: string; sans: string; mono: string } }) {
  return (
    <Panel>
      <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-signal">{p.name}</p>
      <div className="mt-3 flex items-center gap-3" style={{ fontFamily: p.display }}>
        <AurionLogo className="h-10 w-10" />
        <div>
          <p className="text-2xl tracking-[0.22em]">AURION</p>
          <p className="mt-0.5 font-sans text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Powered by Hedera
          </p>
        </div>
      </div>
      <div className="mt-4 border-t pt-4" style={{ fontFamily: p.sans }}>
        <p className="text-sm text-muted-foreground" style={{ fontFamily: p.mono }}>0.0.1006</p>
        <p className="mt-1 flex items-center gap-2 text-3xl tnum">1,204.88 <HbarLogo size={20} /></p>
        <div className="mt-4 space-y-3 border-t pt-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg leading-tight" style={{ fontFamily: p.display }}>Transfer</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground tnum" style={{ fontFamily: p.mono }}>
                10 Sep 2026 · 23:44 UTC
              </p>
            </div>
            <span className="tnum text-flare" style={{ fontFamily: p.mono }}>+10.5278018</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg leading-tight" style={{ fontFamily: p.display }}>Scheduled payment</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground tnum" style={{ fontFamily: p.mono }}>
                20 Sep 2026 · 09:00 UTC
              </p>
            </div>
            <span className="tnum text-muted-foreground" style={{ fontFamily: p.mono }}>−5.0000000</span>
          </div>
        </div>
        <button className="btn mt-4 w-full">Send HBAR</button>
      </div>
    </Panel>
  );
}
