import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shell, Panel, Label } from "@/components/aurion";
import { AskActivity } from "@/components/ask";
import { useAccount } from "@/lib/account";
import { getAccount, getTransactions, getLag, hbar, fmtTs, netAmount, HASHSCAN } from "@/lib/hedera";

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
          <div className="bloom absolute inset-0" />
          <div className="relative text-center">
            <h1 className="text-4xl font-semibold tracking-[0.3em]">AURION</h1>
            <p className="mt-4 text-sm text-muted-foreground">Prove it. Agree it. Hold it. On Hedera.</p>
          </div>
        </div>
        <div className="space-y-3">
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
          <p className="mt-3 text-4xl font-semibold tnum">
            {acct.data ? hbar(acct.data.tinybar) : "—"} <span className="text-base text-muted-foreground">ℏ</span>
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
      <div className="panel divide-y">
        {txs.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No transactions.</p>}
        {txs.data?.map((t) => {
          const n = netAmount(t, id);
          return (
            <a key={t.transaction_id + t.consensus_timestamp} href={`${HASHSCAN}/transaction/${t.consensus_timestamp}`}
              target="_blank" rel="noreferrer" className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p>{t.name.replace(/([A-Z])/g, " $1").trim().toLowerCase()}</p>
                <p className="text-xs text-muted-foreground tnum">{fmtTs(t.consensus_timestamp)}</p>
              </div>
              <span className={`tnum ${n > 0 ? "text-flare" : "text-muted-foreground"}`}>
                {n > 0 ? "+" : ""}{hbar(n)}
              </span>
            </a>
          );
        })}
      </div>
      <button onClick={() => bind(null)} className="mt-6 text-xs text-muted-foreground">Unbind account</button>
    </Shell>
  );
}
