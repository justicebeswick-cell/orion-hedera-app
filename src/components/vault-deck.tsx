import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "framer-motion";

export type VaultPage = { key: string; label: string; icon: LucideIcon; content: ReactNode };

export function VaultDeck({ pages, activeKey }: { pages: VaultPage[]; activeKey?: string }) {
  const reduce = useReducedMotion();
  const [ref, api] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps", dragThreshold: 6, watchDrag: (_api, event) => !(event.target instanceof Element && event.target.closest("input, select, textarea, [contenteditable], [data-no-swipe]")) });
  const [selected, setSelected] = useState(0);
  const [height, setHeight] = useState<number>();
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const update = useCallback(() => {
    if (!api) return;
    const index = api.selectedScrollSnap();
    setSelected(index);
    tabs.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [api]);
  useEffect(() => {
    if (!api) return;
    update(); api.on("select", update);
    return () => { api.off("select", update); };
  }, [api, update]);
  useEffect(() => {
    if (!api || !activeKey) return;
    const index = pages.findIndex((p) => p.key === activeKey);
    if (index >= 0) api.scrollTo(index, true);
  }, [api, activeKey]);
  useEffect(() => {
    const el = slides.current[selected];
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
    observer.observe(el); return () => observer.disconnect();
  }, [selected]);
  const page = pages[selected];
  return (
    <div className="vault-deck">
      <div className="deck-tabs" role="tablist" aria-label="Vault sections">
        {pages.map((p, i) => <Button key={p.key} ref={(el) => { tabs.current[i] = el; }} role="tab" tabIndex={selected === i ? 0 : -1} id={`tab-${p.key}`} aria-controls={`page-${p.key}`} aria-selected={selected === i} variant="ghost" className={`deck-tab ${selected === i ? "deck-tab-active" : ""}`} onClick={() => api?.scrollTo(i, !!reduce)} onKeyDown={(event) => { const next = event.key === "ArrowRight" ? Math.min(i + 1, pages.length - 1) : event.key === "ArrowLeft" ? Math.max(i - 1, 0) : event.key === "Home" ? 0 : event.key === "End" ? pages.length - 1 : null; if (next === null) return; event.preventDefault(); api?.scrollTo(next, !!reduce); tabs.current[next]?.focus(); }}><p.icon />{p.label}</Button>)}
      </div>
      <div className="mb-4 mt-6 flex items-center justify-between gap-4">
        <div><p className="mb-1 text-xs text-signal tnum">VAULT / {String(selected + 1).padStart(2, "0")}</p><h1 className="text-2xl font-semibold">{page?.label}</h1></div>
        <div className="flex gap-2"><Button size="icon" variant="outline" title="Previous section" aria-label="Previous section" disabled={selected === 0} onClick={() => api?.scrollPrev(!!reduce)}><ArrowLeft /></Button><Button size="icon" variant="outline" title="Next section" aria-label="Next section" disabled={selected === pages.length - 1} onClick={() => api?.scrollNext(!!reduce)}><ArrowRight /></Button></div>
      </div>
      <div ref={ref} className="deck-viewport" style={{ height }}>
        <div className="flex items-start touch-pan-y">
          {pages.map((p, i) => <div key={p.key} ref={(el) => { slides.current[i] = el; }} id={`page-${p.key}`} role="tabpanel" aria-labelledby={`tab-${p.key}`} aria-hidden={selected !== i} inert={selected !== i} className="deck-slide"><div className="deck-surface">{p.content}</div></div>)}
        </div>
      </div>
      <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">{pages.map((p, i) => <span key={p.key} className={`deck-dot ${i === selected ? "deck-dot-active" : ""}`} />)}</div>
    </div>
  );
}