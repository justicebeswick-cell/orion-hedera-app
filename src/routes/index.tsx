import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ChevronDown, ChevronRight, Coins, Network, Copy, Pencil, ImageIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listSavedAccounts, rememberAccount, renameSavedAccount } from "@/lib/keystore";
import { HomeAssets } from "@/components/home-assets";
import { Shell, AurionLogo } from "@/components/aurion";
import { HbarLogo } from "@/components/hbar";
import { SignBackIn } from "@/components/signin";
import { ClaimRewards } from "@/components/claim-rewards";
import { HelloGreeting } from "@/components/hello-greeting";
import { OrionName } from "@/components/orion-name";
import { useAccount } from "@/lib/account";
import { MIRROR, getAccount, getLag, getTransactions, netAmount, txLabel, fmtTs, HASHSCAN, hbar, hbarUsdLive } from "@/lib/hedera";
import { fmtAmount, fmtUsd, fmtUsdParts } from "@/lib/display";
import { heldTokens, totalInHbar } from "@/lib/portfolio";

/** Last balance seen on this device, shown while a fresh read is retried. */
function cachedAcct(id: string | null) {
  if (!id || typeof window === "undefined") return undefined;
  try { const v = localStorage.getItem(`orion.lastAcct.${id}`); return v ? JSON.parse(v) as Awaited<ReturnType<typeof getAccount>> : undefined; } catch { return undefined; }
}
import { usePreferences } from "@/lib/preferences";
import { useSecurityPreferences } from "@/lib/security-preferences";
import { showTransaction } from "@/lib/event-display";
import { readAudit, readBlocklist } from "@/lib/guard";
import { REFRESH_MS } from "@/lib/refresh";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Orion — A future proof HBAR wallet on Hedera" },
      {
        name: "description",
        content:
          "A future proof HBAR wallet native to the Hedera network where you can safely store, stake, swap and agree on secure transactions. Keys stay on your device; every move needs your approval.",
      },
      { property: "og:title", content: "Orion — A future proof HBAR wallet on Hedera" },
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
  const prefs = usePreferences();
  const security = useSecurityPreferences();
  const { id, ready, bind } = useAccount();
  const acct = useQuery({ queryKey: ["acct", id], queryFn: () => { if (!id) throw new Error("No account selected"); return getAccount(id).then((a) => { try { localStorage.setItem(`orion.lastAcct.${id}`, JSON.stringify(a)); } catch { /* storage full */ } return a; }); }, enabled: !!id, retry: 5, retryDelay: (n) => Math.min(800 * 2 ** n, 8000), placeholderData: (prev) => prev ?? cachedAcct(id), refetchInterval: REFRESH_MS });
  const txs = useQuery({ queryKey: ["txs", id], queryFn: () => { if (!id) throw new Error("No account selected"); return getTransactions(id); }, enabled: !!id, refetchInterval: REFRESH_MS });
  const lag = useQuery({ queryKey: ["lag"], queryFn: getLag, refetchInterval: 30000 });
  const rate = useQuery({ queryKey: ["hbar-usd"], queryFn: hbarUsdLive, refetchInterval: REFRESH_MS, retry: 5, retryDelay: (n) => Math.min(800 * 2 ** n, 8000), placeholderData: (prev) => prev });
  const portfolio = useQuery({ queryKey: ["portfolio", id], enabled: !!id, queryFn: () => { if (!id) throw new Error("No account selected"); return heldTokens(id); }, refetchInterval: REFRESH_MS, retry: 3, retryDelay: (n) => Math.min(800 * 2 ** n, 8000), placeholderData: (prev) => prev });
  const tokenCount = useQuery({
    queryKey: ["tok-count", id],
    enabled: !!id,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const r = await fetch(`${MIRROR}/api/v1/accounts/${id}/tokens?limit=100`);
      if (!r.ok) throw new Error(`Mirror node returned ${r.status}`);
      const j = await r.json();
      return ((j.tokens ?? []) as { balance: number }[]).filter((t) => t.balance > 0).length;
    },
  });
  const [watchOnly, setWatchOnly] = useState(false);
  const [walletName, setWalletName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  useEffect(() => {
    setWalletName(id ? listSavedAccounts().find((account) => account.id === id)?.label ?? "" : "");
  }, [id]);
  useEffect(() => {
    import("@/lib/signer").then((m) => setWatchOnly(m.signMode(id).kind === "none"));
  }, [id]);

  if (!ready) return <Shell title="Home"><div /></Shell>;
  if (!id)
    return (
      <Shell title="Home" hideBranding>
        <div className="relative mb-10 flex min-h-[18rem] items-center justify-center">
          <div className="relative w-full text-center">
            <div className="mx-auto mb-7 flex w-full max-w-sm flex-col items-center justify-center gap-5">
              <OrionName className="welcome-wordmark relative -mt-12 mb-12 w-40 sm:w-44" />
              <AurionLogo className="h-28 w-28" sizes="112px" crisp />
            </div>
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

  const total = totalInHbar(acct.data ? acct.data.tinybar / 1e8 : null, portfolio.data ?? []);
  const parts = total !== null && rate.data ? fmtUsdParts(total * rate.data) : null;
  const hbarText = total !== null ? fmtAmount(total, { maximumFractionDigits: 2 }) : "—";
  const effChars = (parts ? parts.main.length : 1) + (parts ? parts.frac.length * 0.6 : 0) + hbarText.length;
  const numSize = effChars <= 18 ? "text-[clamp(1.1rem,5.2vw,1.85rem)]" : effChars <= 22 ? "text-[clamp(1rem,4.6vw,1.6rem)]" : effChars <= 26 ? "text-[clamp(0.9rem,4vw,1.35rem)]" : "text-[clamp(0.8rem,3.4vw,1.15rem)]";

  return (
    <Shell title="Home">
      {lag.data !== undefined && lag.data > 120 && (
        <p className="mb-4 rounded-md border border-destructive/40 p-3 text-xs text-destructive">
          Mirror node is {Math.round(lag.data / 60)} minutes behind. Balances may be stale.
        </p>
      )}
      {lag.isError && <p className="mb-4 text-xs text-destructive">Hedera unreachable.</p>}

      <div className="home-dashboard">
      <section aria-label="Wallet assets">
      <div className="home-account mb-2 flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2">
        <Link to="/wallet" className="min-w-0 flex-1" aria-label="Switch account">
          <span className="block break-words text-base font-semibold leading-tight">{walletName || id}</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">{walletName ? (watchOnly ? `${id} · Cold storage` : id) : watchOnly ? "Cold storage · watch-only" : "My Hedera wallet"}</span>
        </Link>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Name wallet" onClick={() => { setNameDraft(walletName); setEditingName(true); }}><Pencil size={13} /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Copy account ID" onClick={async () => { try { await navigator.clipboard.writeText(id); toast.success("Account ID copied"); } catch { toast.error("Copy failed"); } }}><Copy size={13} /></Button>
        <Button asChild variant="ghost" size="icon" className="h-7 w-7" aria-label="Choose wallet"><Link to="/wallet"><ChevronDown size={14} /></Link></Button>
      </div>
      <Dialog open={editingName} onOpenChange={setEditingName}>
        <DialogContent>
          <DialogTitle>Name your wallet</DialogTitle>
          <DialogDescription>Saved on this device. Your account ID stays the same.</DialogDescription>
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            const name = nameDraft.trim();
            rememberAccount(id);
            renameSavedAccount(id, name);
            setWalletName(name);
            setEditingName(false);
            toast.success("Wallet name saved");
          }}>
            <Input aria-label="Wallet name" placeholder="Wallet name" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} autoFocus />
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
      {prefs.showWorth && (
        <Link to="/vault" search={{ section: "holdings" }} className="home-balance group relative mb-5 block overflow-hidden rounded-[var(--card-radius)] border border-primary/15 px-5 pb-3 pt-2 transition-transform duration-300 active:scale-[0.99]">
          <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <span aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl transition-opacity duration-500 group-hover:opacity-80" />
          <span className="relative block">
            <span className="flex items-end justify-between gap-5">
              <span className="min-w-0 text-left">
                <span className={`block truncate bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text font-light leading-none tracking-tight text-transparent tnum ${numSize}`}>
                  {parts ? <>{parts.main}{parts.frac ? <span className="text-[0.6em] font-extralight">{parts.frac}</span> : null}</> : "—"}
                </span>
                <span className="mt-1 block text-[10px] uppercase tracking-[0.28em] text-muted-foreground">US dollars</span>
              </span>
              <span className="min-w-0 text-right">
                <span className={`flex items-center justify-end gap-2 leading-none tnum ${numSize}`}>
                  <HbarLogo size={16} /><span className="truncate bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text font-light text-transparent">{hbarText.split(".")[0]}{hbarText.includes(".") ? <span className="text-[0.6em] font-extralight">.{hbarText.split(".")[1]}</span> : null}</span>
                </span>
                <span className="mt-1 block text-[10px] uppercase tracking-[0.28em] text-muted-foreground">HBAR + tokens</span>
              </span>
            </span>
          </span>
        </Link>
      )}

      <div className="mb-6 grid grid-cols-3 gap-2">
        <Button asChild variant="send" className="h-12 rounded-lg"><Link to="/vault" search={{ section: "send" }}><ArrowUpRight />Send</Link></Button>
        <Button asChild variant="swap" className="h-12 rounded-lg"><Link to="/vault" search={{ section: "swap" }}><ArrowLeftRight />Swap</Link></Button>
        <Button asChild variant="receive" className="h-12 rounded-lg"><Link to="/vault" search={{ section: "receive" }}><ArrowDownLeft />Receive</Link></Button>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-1"><Button asChild variant="secondary" size="sm" className="rounded-lg"><Link to="/vault" search={{ section: "holdings" }}><Coins size={16} />Tokens{tokenCount.data ? <span className="tnum text-muted-foreground">{tokenCount.data}</span> : null}</Link></Button>
        <Button asChild variant="ghost" size="sm"><Link to="/vault" search={{ section: "nfts" }}><ImageIcon size={16} />NFTs</Link></Button></div>
        <Button asChild variant="ghost" size="sm"><Link to="/vault" search={{ section: "buy" }}>Buy HBAR<ChevronRight size={14} /></Link></Button>
      </div>
      {acct.isError && <p className="py-4 text-xs text-destructive">{(acct.error as Error).message}</p>}
      <Link to="/vault" search={{ section: "market" }} aria-label="HBAR price chart and history" className="home-asset pt-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center text-primary"><HbarLogo size={32} /></span>
        <span className="shrink-0"><span className="block font-semibold">HBAR</span><span className="block text-xs text-muted-foreground">Hedera</span></span>
        <span className="min-w-0 flex-1 text-right"><span className="block text-sm font-semibold tnum [overflow-wrap:anywhere] sm:text-lg">{acct.data ? hbar(acct.data.tinybar) : "—"} ℏ</span>{prefs.showPrices && <span className="block text-xs text-muted-foreground tnum">{rate.data ? `${usd(rate.data)} per HBAR` : "—"}</span>}</span>
        <ChevronRight size={14} className="text-muted-foreground" />
      </Link>
      <HomeAssets accountId={id} />
      {prefs.showReserve && <div className="flex justify-between border-b border-border py-4 text-sm"><span className="text-muted-foreground">Required HBAR reserve</span><span className="text-xs text-muted-foreground">Not applicable on Hedera</span></div>}
      <div className="mt-4 border-t border-border">
        <Link to="/stake" className="flex items-center gap-3 py-3 text-sm"><Network size={16} className="text-primary" /><span className="flex-1">{acct.data?.stakedNode != null ? `Staked to node ${acct.data.stakedNode}` : "Choose a staking node"}</span><ChevronRight size={15} className="text-muted-foreground" /></Link>
        <ClaimRewards key={id} compact accountId={id} pendingReward={acct.isError ? undefined : acct.data?.pendingReward} />
      </div>
      <Updated at={acct.dataUpdatedAt} fetching={acct.isFetching} />
      </section>
      <section className="home-activity" aria-label="Recent activity">
      <div className="home-activity-heading mb-3 mt-9 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Recent activity</h2>
        <Button variant="ghost" size="icon" aria-label="Refresh activity" disabled={txs.isFetching} onClick={() => txs.refetch()}>
          <RefreshCw size={16} className={txs.isFetching ? "animate-spin" : ""} />
        </Button>
      </div>
      <div className="panel divide-y divide-border overflow-hidden">
        {txs.isPending && <p className="px-5 py-5 text-sm text-muted-foreground">Loading receipts…</p>}
        {txs.isError && <p className="px-5 py-5 text-sm text-destructive">{(txs.error as Error).message}</p>}
        {txs.data?.length === 0 && <p className="px-5 py-5 font-receipt receipt-label text-lg text-muted-foreground">No receipts yet.</p>}
        {txs.data?.filter((t) => showTransaction(t, id, prefs, readBlocklist(), readAudit().filter((r) => r.action === "swap fee" && r.ok).flatMap((r) => r.txId ? [r.txId] : []))).map((t) => {
          const n = netAmount(t, id);
          const received = n > 0;
          return (
            <a key={t.transaction_id + t.consensus_timestamp} href={`${HASHSCAN}/transaction/${t.consensus_timestamp}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/40">
              <span className={`shrink-0 ${received ? "text-foreground" : "text-muted-foreground"}`}>
                {received ? <ArrowDownLeft size={20} strokeWidth={1.8} /> : <ArrowUpRight size={20} strokeWidth={1.8} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-receipt receipt-label text-lg leading-tight text-foreground">{received ? "Received" : n < 0 ? "Sent" : txLabel(t.name)}</p>
                <p className="mt-1 break-words font-mono text-[10px] text-muted-foreground tnum">{fmtTs(t.consensus_timestamp)}</p>
              </div>
              <span className={`min-w-0 max-w-[48%] break-words text-right font-sans text-sm font-medium tnum ${received ? "text-success" : "text-muted-foreground"}`}>
                {received ? "+" : ""}{hbar(n)} ℏ
              </span>
            </a>
          );
        })}
      </div>
      </section>
      </div>
      <Button variant="outline" onClick={signOut} className="mt-9 w-full text-muted-foreground">
        Sign out
      </Button>
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
