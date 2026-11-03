import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Eye, RefreshCw, Coins, Network, PenLine, Handshake, HeartHandshake } from "lucide-react";
import { Shell, AurionLogo } from "@/components/aurion";
import { HbarLogo } from "@/components/hbar";
import { AskActivity } from "@/components/ask";
import { SignBackIn } from "@/components/signin";
import { ClaimRewards } from "@/components/claim-rewards";
import { HelloGreeting } from "@/components/hello-greeting";
import { useAccount } from "@/lib/account";
import { MIRROR, getAccount, getTransactions, getLag, hbar, hbarUsd, fmtTs, netAmount, txLabel, HASHSCAN } from "@/lib/hedera";
import { HbarMarket } from "@/components/hbar-market";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HashBase — A future proof HBAR wallet on Hedera" },
      {
        name: "description",
        content:
          "A future proof HBAR wallet native to the Hedera network where you can safely store, stake, swap and agree on secure transactions. Keys stay on your device; every move needs your approval.",
      },
      { property: "og:title", content: "HashBase — A future proof HBAR wallet on Hedera" },
      {
        property: "og:description",
        content:
          "A future proof HBAR wallet native to the Hedera network where you can safely store, stake, swap and agree on secure transactions. Your keys never leave your device. Stake with any node and claim rewards on demand, swap across Hedera tokens, schedule payments up to 60 days ahead, and sign every move with a fingerprint or passphrase. No company holds your funds — you do.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const usd = (n: number) => fmtUsd(n);

function Home() {
  const { id, ready, bind } = useAccount();
  const acct = useQuery({ queryKey: ["acct", id], queryFn: () => { if (!id) throw new Error("No account selected"); return getAccount(id); }, enabled: !!id, retry: false, refetchInterval: 15_000 });
  const txs = useQuery({ queryKey: ["txs", id], queryFn: () => { if (!id) throw new Error("No account selected"); return getTransactions(id); }, enabled: !!id });
  const lag = useQuery({ queryKey: ["lag"], queryFn: getLag, refetchInterval: 30000 });
  const rate = useQuery({ queryKey: ["hbar-usd"], queryFn: hbarUsd, refetchInterval: 60000 });
  const tokenCount = useQuery({
    queryKey: ["tok-count", id],
    enabled: !!id,
    queryFn: async () => {
      const r = await fetch(`${MIRROR}/api/v1/accounts/${id}/tokens?limit=100`);
      if (!r.ok) throw new Error(`Mirror node returned ${r.status}`);
      const j = await r.json();
      return ((j.tokens ?? []) as { balance: number }[]).filter((t) => t.balance > 0).length;
    },
  });
  const [watchOnly, setWatchOnly] = useState(false);
  useEffect(() => {
    import("@/lib/signer").then((m) => setWatchOnly(m.signMode(id).kind === "none"));
  }, [id]);

  if (!ready) return <Shell title="Home"><div /></Shell>;
  if (!id)
    return (
      <Shell title="Home">
        <div className="relative mb-10 flex min-h-[18rem] items-center justify-center">
          <div className="relative text-center">
            <AurionLogo className="mx-auto mb-8 h-28 w-28" />
            <HelloGreeting />
            <p className="mt-5 text-sm text-muted-foreground">Prove it. Agree it. Hold it. On Hedera.</p>
          </div>
        </div>
        <div className="space-y-3">
          <SignBackIn onIn={bind} />
          <Link to="/wallet" className="btn w-full">Create or connect a wallet</Link>
          <button type="button" className="btn-ghost w-full text-sm" onClick={() => { bind("0.0.800"); toast("Demo: watching Hedera's public reward account. Read-only.") }}>
            Try a demo first
          </button>
          <p className="text-center text-xs text-muted-foreground">The demo shows a real public mainnet account. Nothing can be sent.</p>
        </div>
      </Shell>
    );

  const signOut = () => {
    if (confirm("Sign out of this account on this device? Your saved key stays, so you can sign back in.")) bind(null);
  };

  return (
    <Shell title="Home">
      {lag.data !== undefined && lag.data > 120 && (
        <p className="mb-4 rounded-md border border-destructive/40 p-3 text-xs text-destructive">
          Mirror node is {Math.round(lag.data / 60)} minutes behind. Balances may be stale.
        </p>
      )}
      {lag.isError && <p className="mb-4 text-xs text-destructive">Hedera unreachable.</p>}

      <div className="mb-5 flex flex-wrap items-center gap-2.5 animate-in fade-in duration-500">
        <button type="button" className="chip tnum" aria-label="Copy account ID"
          onClick={async () => { try { await navigator.clipboard.writeText(id); toast.success("Account ID copied"); } catch { toast.error("Copy failed"); } }}>
          {id}
        </button>
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${watchOnly ? "border-border text-muted-foreground" : "border-primary/50 text-signal"}`}>
          {watchOnly ? <><Eye size={12} /> Watch-only</> : <><PenLine size={12} /> Can sign</>}
        </span>
        <Link to="/wallet" className="ml-auto text-xs text-signal hover:underline">{watchOnly ? "Connect to sign" : "Switch account"}</Link>
      </div>

      <section className="hero-card hash-mark overflow-hidden p-6">
        <div className="flex items-start justify-between">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Balance</p>
        </div>
        {acct.isError ? (
          <p className="mt-4 text-sm text-destructive">{(acct.error as Error).message}</p>
        ) : (
          <p className="mt-3 flex items-baseline gap-2.5 text-5xl font-semibold tracking-tight tnum">
            {acct.data ? hbar(acct.data.tinybar) : "—"} <HbarLogo size={26} className="self-center text-signal" />
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground tnum">
          {acct.data && rate.data ? `≈ ${usd((acct.data.tinybar / 1e8) * rate.data)} · network rate` : "Fetching network rate…"}
        </p>
        <Updated at={acct.dataUpdatedAt} fetching={acct.isFetching} />
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          <div className="stat-tile">
            <Network size={16} className="text-signal" />
            <p className="mt-2 truncate text-sm font-semibold tnum">{acct.data?.stakedNode != null ? `Node ${acct.data.stakedNode}` : "—"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Staked to</p>
          </div>
          <ClaimRewards key={id} accountId={id} pendingReward={acct.isError ? undefined : acct.data?.pendingReward} />
          <div className="stat-tile">
            <Coins size={16} className="text-signal" />
            <p className="mt-2 truncate text-sm font-semibold tnum">{tokenCount.data ?? "—"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Tokens</p>
          </div>
        </div>
      </section>

      <HbarMarket />

      <AskActivity accountId={id} />

      <div className="mt-9 mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Recent activity</p>
        <button
          onClick={() => txs.refetch()}
          aria-label="Refresh activity"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCw size={16} className={txs.isFetching ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="panel divide-y overflow-hidden">
        {txs.isLoading && [0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4"><div className="h-5 w-5 animate-pulse rounded-full bg-muted/40" /><div className="flex-1 space-y-2"><div className="h-4 w-24 animate-pulse rounded bg-muted/40" /><div className="h-2.5 w-32 animate-pulse rounded bg-muted/30" /></div></div>
        ))}
        {txs.data?.length === 0 && (
          <div className="px-5 py-6">
            <p className="font-display text-lg text-muted-foreground">No receipts yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Sends, swaps and rewards appear here once Hedera records them. Share your account ID to receive HBAR.</p>
          </div>
        )}
        {txs.data?.map((t) => {
          const n = netAmount(t, id);
          const received = n > 0;
          return (
            <a key={t.transaction_id + t.consensus_timestamp} href={`${HASHSCAN}/transaction/${t.consensus_timestamp}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/40">
              <span className={`shrink-0 ${received ? "text-signal" : "text-muted-foreground"}`}>
                {received ? <ArrowDownLeft size={20} strokeWidth={1.8} /> : <ArrowUpRight size={20} strokeWidth={1.8} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-receipt receipt-label text-xl leading-tight text-foreground">
                  {received ? "Received" : n < 0 ? "Sent" : txLabel(t.name)}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground tnum">{fmtTs(t.consensus_timestamp)}</p>
              </div>
              <span className={`shrink-0 font-sans text-lg font-medium tracking-tight tnum ${received ? "text-success" : "text-muted-foreground"}`}>
                {received ? "+" : ""}{hbar(n)} ℏ
              </span>
            </a>
          );
        })}
      </div>

      <div className="mt-9 grid grid-cols-2 gap-2.5">
        <Link to="/pact" className="stat-tile transition-colors hover:border-primary">
          <Handshake size={16} className="text-signal" />
          <p className="mt-2 text-sm font-semibold">Pact</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Agree a deal, fingerprinted on Hedera</p>
        </Link>
        <Link to="/legacy" className="stat-tile transition-colors hover:border-primary">
          <HeartHandshake size={16} className="text-signal" />
          <p className="mt-2 text-sm font-semibold">Legacy</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Pass HBAR to one heir if you go quiet</p>
        </Link>
      </div>

      <button onClick={signOut} className="btn-ghost mt-9 w-full text-muted-foreground">
        Sign out
      </button>
    </Shell>
  );
}

function Updated({ at, fetching }: { at: number; fetching: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  if (!at) return null;
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground tnum">
      <span className={`h-1.5 w-1.5 rounded-full bg-success ${fetching ? "animate-ping" : ""}`} />
      {s < 5 ? "Updated just now" : `Updated ${s}s ago`}
    </p>
  );
}
