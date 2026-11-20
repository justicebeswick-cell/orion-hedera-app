import { useEffect, useState } from "react";
import { recordPoint, validPoints, type PortfolioPoint } from "@/lib/portfolio-history";

const EVENT = "orion:performance";
export function readPortfolioHistory(accountId: string): PortfolioPoint[] {
  try { return validPoints(JSON.parse(localStorage.getItem(`orion.performance.${accountId}`) ?? "[]")); } catch { return []; }
}
export function savePortfolioObservation(accountId: string, value: number, at = Date.now()) {
  const next = recordPoint(readPortfolioHistory(accountId), { at, value });
  try { localStorage.setItem(`orion.performance.${accountId}`, JSON.stringify(next)); window.dispatchEvent(new Event(EVENT)); } catch { /* Storage unavailable. */ }
  return next;
}
export function usePortfolioHistory(accountId: string) {
  const [points, setPoints] = useState<PortfolioPoint[]>([]);
  useEffect(() => {
    const update = () => setPoints(readPortfolioHistory(accountId));
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener("storage", update); };
  }, [accountId]);
  return points;
}