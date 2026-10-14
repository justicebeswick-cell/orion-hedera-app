import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell, Panel, Label, AurionLogo } from "@/components/aurion";
import { HbarLogo } from "@/components/hbar";
import { AskActivity } from "@/components/ask";
import { SignBackIn } from "@/components/signin";
import { useAccount } from "@/lib/account";
import { getAccount, getTransactions, getLag, hbar, fmtTs, netAmount, txLabel, HASHSCAN } from "@/lib/hedera";

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

function Home() {
  const { id, ready, bind } = useAccount();
  const acct = useQuery({ queryKey: ["acct", id], queryFn: () => getAccount(id!), enabled: !!id, retry: false });
  const txs = useQuery({ queryKey: ["txs", id], queryFn: () => getTransactions(id!), enabled: !!id });
  const lag = useQuery({ queryKey: ["lag"], queryFn: getLag, refetchInterval: 30000 });

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

  return (
    <Shell title="Home">
      {lag.data !== undefined && lag.data > 120 && (
        <p className="mb-4 rounded-md border border-destructive/40 p-3 text-xs text-destructive">
          Mirror node is {Math.round(lag.data / 60)} minutes behind. Balances may be stale.
        </p>
      )}
      {lag.isError && <p className="mb-4 text-xs text-destructive">Hedera unreachable.</p>}
      <Panel>
        <p className="font-mono text-xs text-muted-foreground tnum">{id}</p>
        {acct.isError ? (
          <p className="mt-3 text-sm text-destructive">{(acct.error as Error).message}</p>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-4xl font-semibold tnum">
            {acct.data ? hbar(acct.data.tinybar) : "—"} <HbarLogo size={22} />
          </p>
        )}
        <div className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground">
          <Link to="/legacy" className="block">Switch not armed.</Link>
          <Link to="/stake" className="block">View staking.</Link>
          <Link to="/pact" className="block">No pact waiting on you.</Link>
        </div>
      </Panel>

      <AskActivity accountId={id} />

      <Label><span className="mt-8 block">Receipts</span></Label>
      <div className="panel divide-y overflow-hidden">
        {txs.data?.length === 0 && (
          <p className="px-4 py-5 font-display text-lg text-muted-foreground">No receipts yet.</p>
        )}
        {txs.data?.map((t) => {
          const n = netAmount(t, id);
          return (
            <a key={t.transaction_id + t.consensus_timestamp} href={`${HASHSCAN}/transaction/${t.consensus_timestamp}`}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-secondary/40">
              <div className="min-w-0">
                <p className="font-display text-xl leading-tight tracking-[0.015em] text-foreground">{txLabel(t.name)}</p>
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground tnum">{fmtTs(t.consensus_timestamp)}</p>
              </div>
              <span className={`text-base font-medium tnum tracking-tight ${n > 0 ? "text-flare" : "text-muted-foreground"}`}>
                {n > 0 ? "+" : ""}{hbar(n)}
              </span>
            </a>
          );
        })}
      </div>
      <button onClick={() => { if (confirm("Sign out of this account on this device? Your saved key stays, so you can sign back in.")) bind(null); }} className="mt-6 text-xs text-muted-foreground">Sign out</button>
    </Shell>
  );
}
