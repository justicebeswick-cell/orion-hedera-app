import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { mergePortfolioHistory, recordPoint, validPoints, type PortfolioPoint } from "@/lib/portfolio-history";

const EVENT = "orion:performance";
const ACCOUNT_RE = /^0\.0\.\d{1,12}$/;

export function readPortfolioHistory(accountId: string): PortfolioPoint[] {
  try { return validPoints(JSON.parse(localStorage.getItem(`orion.performance.${accountId}`) ?? "[]")); } catch { return []; }
}
function readChainCache(accountId: string): PortfolioPoint[] {
  try { return validPoints(JSON.parse(localStorage.getItem(`orion.chainHistory.${accountId}`) ?? "[]")); } catch { return []; }
}
export function savePortfolioObservation(accountId: string, value: number, at = Date.now()) {
  const next = recordPoint(readPortfolioHistory(accountId), { at, value });
  try { localStorage.setItem(`orion.performance.${accountId}`, JSON.stringify(next)); window.dispatchEvent(new Event(EVENT)); } catch { /* Storage unavailable. */ }
  return next;
}
async function fetchChainHistory(accountId: string): Promise<PortfolioPoint[]> {
  const res = await fetch(`/api/portfolio-history?account=${encodeURIComponent(accountId)}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = await res.json() as { points?: unknown };
  return validPoints(json.points);
}
export function usePortfolioHistoryDetails(accountId: string) {
  const [localPoints, setLocalPoints] = useState<PortfolioPoint[]>([]);
  const [cachedChain, setCachedChain] = useState<PortfolioPoint[]>([]);
  useEffect(() => {
    const update = () => {
      setLocalPoints(readPortfolioHistory(accountId));
      setCachedChain(readChainCache(accountId));
    };
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener("storage", update); };
  }, [accountId]);

  const validAccount = ACCOUNT_RE.test(accountId);
  const chainQuery = useQuery({
    queryKey: ["portfolio-chain-history", accountId],
    queryFn: () => fetchChainHistory(accountId),
    enabled: validAccount,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!validAccount || !chainQuery.data?.length) return;
    try { localStorage.setItem(`orion.chainHistory.${accountId}`, JSON.stringify(chainQuery.data)); } catch { /* Storage unavailable. */ }
  }, [accountId, validAccount, chainQuery.data]);

  const chainPoints = chainQuery.data?.length ? chainQuery.data : cachedChain;
  const points = useMemo(() => mergePortfolioHistory(chainPoints, localPoints), [chainPoints, localPoints]);
  const isLoading = validAccount && chainQuery.isPending && localPoints.length === 0 && cachedChain.length === 0;
  return { points, hasChainHistory: chainPoints.length > 0, isLoading };
}
export function usePortfolioHistory(accountId: string) {
  return usePortfolioHistoryDetails(accountId).points;
}