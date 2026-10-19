import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Eye, Plus, RefreshCw, Sparkles, Coins, Network, X } from "lucide-react";
import { Shell, AurionLogo } from "@/components/aurion";
import { HbarLogo } from "@/components/hbar";
import { AskActivity } from "@/components/ask";
import { SignBackIn } from "@/components/signin";
import { useAccount } from "@/lib/account";
import { MIRROR, getAccount, getTransactions, getLag, hbar, hbarUsd, fmtTs, netAmount, txLabel, HASHSCAN } from "@/lib/hedera";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURION — Prove it. Agree it. Hold it." },
      { name: "description", content: "A mainnet HBAR vault with staking, pacts and one heir transfer. On Hedera." },
      { property: "og:title", content: "AURION — On Hedera" },
      { property: "og:description", content: "Prove it. Agree it. Hold it. On Hedera." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 4 : 2 });

function Home() {
  const { id, ready, bind } = useAccount();
  const acct = useQuery({ queryKey: ["acct", id], queryFn: () => getAccount(id!), enabled: !!id, retry: false });
  const txs = useQuery({ queryKey: ["txs", id], queryFn: () => getTransactions(id!), enabled: !!id });
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
        <div className="relative mb-10 flex h-56 items-center justify-center">
          <div className="relative text-center">
            <AurionLogo className="mx-auto mb-4 h-28 w-28" />
            <h1 className="text-4xl font-semibold tracking-[0.3em]">AURION</h1>
            <p className="mt-4 text-sm text-muted-foreground">Prove it. Agree it. Hold it. On Hedera.</p>
          </div>
        </div>
        <div className="space-y-3">
          <SignBackIn onIn={bind} />
          <Link to="/wallet" className="btn w-full">Create or connect a wallet</Link>
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

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <span className="chip tnum">
          {id}
          <button onClick={signOut} aria-label="Sign out" className="text-muted-foreground transition-colors hover:text-foreground">
            <X size={14} />
          </button>
        </span>
        <Link to="/wallet" className="chip-ghost"><Plus size={14} /> Watch</Link>
      </div>

      <section className="hero-card p-6">
        <div className="flex items-start justify-between">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Balance</p>
          {watchOnly && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Eye size={13} /> Watch-only</p>
          )}
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
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          <div className="stat-tile">
            <Network size={16} className="text-signal" />
            <p className="mt-2 truncate text-sm font-semibold tnum">{acct.data?.stakedNode != null ? `Node ${acct.data.stakedNode}` : "—"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Staked to</p>
          </div>
          <div className="stat-tile">
            <Sparkles size={16} className="text-signal" />
            <p className="mt-2 truncate text-sm font-semibold tnum">{acct.data ? `${hbar(acct.data.pendingReward)} ℏ` : "—"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Pending reward</p>
          </div>
          <div className="stat-tile">
            <Coins size={16} className="text-signal" />
            <p className="mt-2 truncate text-sm font-semibold tnum">{tokenCount.data ?? "—"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Tokens</p>
          </div>
        </div>
      </section>

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
      <div className="panel divide-y overflow-hidden rounded-3xl">
        {txs.data?.length === 0 && (
          <p className="px-5 py-5 font-display text-lg text-muted-foreground">No receipts yet.</p>
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
    </Shell>
  );
}
