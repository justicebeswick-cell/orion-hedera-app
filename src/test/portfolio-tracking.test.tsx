import { afterEach, expect, it, vi } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PortfolioTracker } from "@/components/portfolio-tracker";
import { readPortfolioHistory, savePortfolioObservation } from "@/lib/use-portfolio-history";
import { savePreferences } from "@/lib/preferences";

vi.mock("@/lib/hedera", () => ({ getAccount: async () => ({ tinybar: 10_000_000_000 }), hbarUsdLive: async () => 0.05 }));
vi.mock("@/lib/portfolio", () => ({ heldTokens: async () => [], totalInHbar: (value: number) => value }));
afterEach(() => { cleanup(); localStorage.clear(); });
it("records with the chart off and preserves those observations when enabled", async () => {
  savePortfolioObservation("0.0.123", 4, Date.now() - 20_000);
  savePreferences({ showChart: false });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><PortfolioTracker accountId="0.0.123" /></QueryClientProvider>);
  await waitFor(() => expect(readPortfolioHistory("0.0.123").map(p => p.value)).toEqual([4, 5]));
  savePreferences({ showChart: true });
  expect(readPortfolioHistory("0.0.123").map(p => p.value)).toEqual([4, 5]);
  client.clear();
});