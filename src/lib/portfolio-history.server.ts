import {
  buildCheckpoints,
  reconstructPortfolioPoints,
  type BalanceCheckpoint,
  type PortfolioPoint,
  type PriceCandle,
} from "./portfolio-history";

const MIRROR = "https://mainnet-public.mirrornode.hedera.com";
export const ACCOUNT_ID_RE = /^0\.0\.\d{1,12}$/;

export type ChainPortfolioHistory = {
  accountId: string;
  createdAt: number;
  points: PortfolioPoint[];
  source: "chain";
};

async function fetchJson(url: string, timeoutMs = 7000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "OrionWallet/1.0" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchHourlyCandles(): Promise<PriceCandle[]> {
  const kraken = await fetchJson("https://api.kraken.com/0/public/OHLC?pair=HBARUSD&interval=60") as {
    result?: Record<string, unknown>;
  } | null;
  if (kraken?.result) {
    const key = Object.keys(kraken.result).find((k) => k !== "last");
    const rows = key ? kraken.result[key] : null;
    if (Array.isArray(rows) && rows.length > 0) {
      const parsed = rows
        .map((r) => (Array.isArray(r) ? { at: Number(r[0]) * 1000, price: Number(r[4]) } : null))
        .filter((c): c is PriceCandle => !!c && Number.isFinite(c.at) && c.at > 0 && Number.isFinite(c.price) && c.price > 0);
      if (parsed.length > 0) return parsed;
    }
  }
  const binance = await fetchJson("https://api.binance.us/api/v3/klines?symbol=HBARUSD&interval=1h&limit=720");
  if (Array.isArray(binance)) {
    return binance
      .map((r) => (Array.isArray(r) ? { at: Number(r[0]), price: Number(r[4]) } : null))
      .filter((c): c is PriceCandle => !!c && Number.isFinite(c.at) && c.at > 0 && Number.isFinite(c.price) && c.price > 0);
  }
  return [];
}

async function fetchDailyCandles(sinceMs: number): Promise<PriceCandle[]> {
  const parseBinance = (rows: unknown): PriceCandle[] =>
    Array.isArray(rows)
      ? rows
          .map((r) => (Array.isArray(r) ? { at: Number(r[0]), price: Number(r[4]) } : null))
          .filter((c): c is PriceCandle => !!c && Number.isFinite(c.at) && c.at > 0 && Number.isFinite(c.price) && c.price > 0)
      : [];

  const page1 = parseBinance(await fetchJson("https://api.binance.us/api/v3/klines?symbol=HBARUSD&interval=1d&limit=1000"));
  if (page1.length > 0) {
    const firstAt = page1[0]?.at ?? Infinity;
    if (sinceMs < firstAt) {
      const page2 = parseBinance(
        await fetchJson(`https://api.binance.us/api/v3/klines?symbol=HBARUSD&interval=1d&limit=1000&endTime=${firstAt - 1}`),
      );
      return [...page2, ...page1];
    }
    return page1;
  }

  const kraken = await fetchJson("https://api.kraken.com/0/public/OHLC?pair=HBARUSD&interval=1440") as {
    result?: Record<string, unknown>;
  } | null;
  if (kraken?.result) {
    const key = Object.keys(kraken.result).find((k) => k !== "last");
    const rows = key ? kraken.result[key] : null;
    if (Array.isArray(rows)) {
      return rows
        .map((r) => (Array.isArray(r) ? { at: Number(r[0]) * 1000, price: Number(r[4]) } : null))
        .filter((c): c is PriceCandle => !!c && Number.isFinite(c.at) && c.at > 0 && Number.isFinite(c.price) && c.price > 0);
    }
  }
  return [];
}

async function fetchBalanceCheckpoints(accountId: string, timestamps: number[]): Promise<BalanceCheckpoint[]> {
  const out: BalanceCheckpoint[] = [];
  const batchSize = 6;
  for (let i = 0; i < timestamps.length; i += batchSize) {
    const batch = timestamps.slice(i, i + batchSize);
    const settled = await Promise.all(
      batch.map(async (tsMs): Promise<BalanceCheckpoint | null> => {
        const sec = Math.floor(tsMs / 1000);
        const data = await fetchJson(
          `${MIRROR}/api/v1/balances?account.id=${accountId}&timestamp=lte:${sec}.000000000`,
          6000,
        ) as { balances?: { balance?: number }[] } | null;
        const row = data?.balances?.[0];
        if (!row || typeof row.balance !== "number" || !Number.isFinite(row.balance) || row.balance < 0) return null;
        return { at: tsMs, hbar: row.balance / 1e8 };
      }),
    );
    for (const item of settled) {
      if (item) out.push(item);
    }
  }
  return out;
}

/** Reconstruct an account's real all-time HBAR USD portfolio history from public Mirror Node + market candles. */
export async function fetchWalletChainHistory(accountId: string, now = Date.now()): Promise<ChainPortfolioHistory | null> {
  if (!ACCOUNT_ID_RE.test(accountId)) return null;

  const acct = await fetchJson(`${MIRROR}/api/v1/accounts/${accountId}?transactions=false`, 7000) as {
    created_timestamp?: string | null;
    balance?: { balance?: number };
  } | null;
  if (!acct || typeof acct.balance?.balance !== "number") return null;

  const currentHbar = acct.balance.balance / 1e8;
  const parsedCreated = acct.created_timestamp ? Math.floor(Number(acct.created_timestamp) * 1000) : NaN;
  const hasCreated = Number.isFinite(parsedCreated) && parsedCreated > 0 && parsedCreated < now;
  const earliestFallback = now - 5 * 365 * 86_400_000;
  const createdAt = hasCreated ? parsedCreated : earliestFallback;

  const checkpointTimes = buildCheckpoints(createdAt, now);
  const [hourly, daily, sampled] = await Promise.all([
    fetchHourlyCandles(),
    fetchDailyCandles(createdAt),
    fetchBalanceCheckpoints(accountId, checkpointTimes),
  ]);

  const earliestHourly = hourly[0]?.at ?? Infinity;
  const candles: PriceCandle[] = [
    ...daily.filter((c) => c.at < earliestHourly),
    ...hourly,
  ].sort((a, b) => a.at - b.at);

  const checkpoints: BalanceCheckpoint[] = [...sampled, { at: now, hbar: currentHbar }];
  const effectiveCreatedAt = hasCreated ? createdAt : (candles[0]?.at ?? createdAt);
  const points = reconstructPortfolioPoints(candles, checkpoints, now);

  return { accountId, createdAt: effectiveCreatedAt, points, source: "chain" };
}