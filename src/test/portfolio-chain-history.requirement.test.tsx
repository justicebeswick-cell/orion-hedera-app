import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PortfolioPerformance } from "@/components/portfolio-performance";
import { savePortfolioObservation } from "@/lib/use-portfolio-history";

const DAY = 86_400_000;

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("A wallet keeps its all-time portfolio price history even after re-adding it in watch-only mode", () => {
  it("Re-adding a watch-only wallet with empty device storage loads its all-time on-chain price history on the chart", async () => {
    const now = Date.now();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        accountId: "0.0.5000000",
        createdAt: now - 400 * DAY,
        points: [
          { at: now - 400 * DAY, value: 100 },
          { at: now - 200 * DAY, value: 180 },
          { at: now - 30 * DAY, value: 220 },
          { at: now - 60_000, value: 250 },
        ],
        source: "chain",
      }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PortfolioPerformance accountId="0.0.5000000" hidden={false} range="All" onRangeChange={() => {}} />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText("Awaiting performance history")).not.toBeInTheDocument();
      expect(screen.getByText("+150.00%")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/portfolio-history?account=0.0.5000000"),
      expect.anything(),
    );
    client.clear();
  });

  it("Live device observations stay combined with on-chain history without losing earlier points", async () => {
    const now = Date.now();
    savePortfolioObservation("0.0.5000000", 300, now - 5_000);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        accountId: "0.0.5000000",
        createdAt: now - 365 * DAY,
        points: [
          { at: now - 365 * DAY, value: 100 },
          { at: now - 10 * DAY, value: 200 },
        ],
        source: "chain",
      }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PortfolioPerformance accountId="0.0.5000000" hidden={false} range="All" onRangeChange={() => {}} />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("+200.00%")).toBeInTheDocument();
    });
    client.clear();
  });
});