import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { nodeCompany, NodeLogo } from "@/components/node-logo";
import { Button } from "@/components/ui/button";
import { HbarLogo } from "@/components/hbar";
import { Shell, Panel, Label, BindAccount, SealRing } from "@/components/aurion";
import { useAccount } from "@/lib/account";
import { readKeystoreMeta } from "@/lib/keystore";
import { connectedWallet } from "@/lib/walletconnect";
import { hbar, fmtTs, HASHSCAN } from "@/lib/hedera";
import { REFRESH_MS } from "@/lib/refresh";
import { getStakeInfo, getRewards, getNodes, apr, redelegate, waitForConsensus, MAX_FEE_HBAR, type Node } from "@/lib/staking";

export const Route = createFileRoute("/stake")({
  head: () => ({
    meta: [
      { title: "Stake — Orion" },
      { name: "description", content: "See which Hedera node you stake to, track rewards, and redelegate on mainnet." },
      { property: "og:title", content: "Stake — Orion" },
      { property: "og:description", content: "Stake HBAR to a mainnet node. Your HBAR never leaves your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stake,
});

const fill = (n: Node) => (n.max_stake > 0 ? Math.min(100, (n.stake / n.max_stake) * 100) : 0);
const M = (t: number) => (t / 1e8 / 1e6).toFixed(0) + "M";

function StakeFill({ n }: { n: Node }) {
  const pct = fill(n);
  const full = pct >= 99.5;
  return (
    <div className="mt-1.5">
      <div className="h-1 w-full overflow-hidden rounded-full bg-graphite">
        <div className={`h-full rounded-full ${full ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1 text-[11px] tnum ${full ? "text-destructive" : "text-muted-foreground"}`}>
        {full ? "At max stake" : `${pct.toFixed(0)}% of max`} · {M(n.stake)} / {M(n.max_stake)} ℏ
      </p>
    </div>
  );
}

const nodeName = (n?: Node) => nodeCompany(n?.description) || n?.description?.trim() || (n ? `Node ${n.node_id}` : "");

function Stake() {
  const { id, ready, bind } = useAccount();
  const [hasKey, setHasKey] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  useEffect(() => {
    setHasKey(readKeystoreMeta()?.accountId === id && !!id);
    const w = connectedWallet();
    setWallet(w && w.id === id ? w.wallet : null);
  }, [id]);
  const info = useQuery({ queryKey: ["stake", id], queryFn: () => getStakeInfo(id!), enabled: !!id, refetchInterval: REFRESH_MS });
  const rewards = useQuery({ queryKey: ["rewards", id], queryFn: () => getRewards(id!), enabled: !!id, refetchInterval: 30_000 });
  const nodes = useQuery({ queryKey: ["nodes"], queryFn: getNodes, staleTime: 600_000 });
  const [pick, setPick] = useState<Node | null>(null);

  if (!ready) return <Shell title="Stake"><div /></Shell>;
  if (!id) return <Shell title="Stake"><BindAccount onBind={bind} /></Shell>;

  const current = nodes.data?.find((n) => n.node_id === info.data?.stakedNodeId);
  const paid = rewards.data?.reduce((s, r) => s + r.amount, 0) ?? 0;

  return (
    <Shell title="Stake">
      <Panel>
        <Label>Staking to</Label>
        {info.isError ? (
          <p className="text-sm text-destructive">{(info.error as Error).message}</p>
        ) : info.data?.stakedNodeId != null ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <NodeLogo description={current?.description} size={64} />
            <p className="text-2xl font-semibold break-words">{nodeName(current) || `Node ${info.data.stakedNodeId}`}</p>
            <p className="text-xs text-muted-foreground tnum">
              Node {info.data.stakedNodeId}{current && ` · ~${apr(current)} yearly`}
            </p>
          </div>
        ) : info.data?.stakedAccountId ? (
          <p className="text-lg">Account {info.data.stakedAccountId}</p>
        ) : (
          <p className="text-lg text-muted-foreground">{info.data ? "Not staking" : "—"}</p>
        )}
        {info.data?.declineReward && <p className="mt-2 text-xs text-destructive">Rewards are declined on this account.</p>}

        <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Pending reward</p>
            <p className="flex items-center gap-1.5 text-lg font-semibold text-flare tnum">{info.data ? hbar(info.data.pendingReward) : "—"} <HbarLogo size={16} /></p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid (last 25)</p>
            <p className="flex items-center gap-1.5 text-lg font-semibold tnum">{hbar(paid)} <HbarLogo size={16} /></p>
          </div>
        </div>
        {info.data?.stakePeriodStart && (
          <p className="mt-3 text-xs text-muted-foreground tnum">Staking since {fmtTs(info.data.stakePeriodStart)}</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Your HBAR stays in your account. Rewards are paid on your next transaction after each 24-hour period.
        </p>
      </Panel>

      {pick ? (
        <Redelegate accountId={id} node={pick} hasKey={hasKey} wallet={wallet} onClose={() => setPick(null)} />
      ) : (
        <>
          <Label><span className="mt-8 block">Redelegate to a node</span></Label>
          <div className="panel divide-y">
            {nodes.isLoading && <p className="p-4 text-sm text-muted-foreground">Reading nodes…</p>}
            {nodes.isError && <p className="p-4 text-sm text-destructive">Hedera unreachable</p>}
            {nodes.data?.map((n) => {
              const mine = n.node_id === info.data?.stakedNodeId;
              return (
                <Button key={n.node_id} disabled={mine} onClick={() => setPick(n)}
                  className="flex h-auto w-full items-center justify-between gap-0 rounded-none px-4 py-4 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-100" variant="ghost">
                  <span className="mr-4 flex shrink-0 items-center"><NodeLogo description={n.description} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal font-medium">{nodeName(n)}</p>
                    <p className="text-xs text-muted-foreground tnum">Node {n.node_id}</p>
                    <StakeFill n={n} />
                  </div>
                  <span className={`ml-3 shrink-0 text-xs tnum ${mine ? "text-primary" : "text-muted-foreground"}`}>
                    {mine ? "Current" : `~${apr(n)}`}
                  </span>
                </Button>
              );
            })}
          </div>
        </>
      )}

      <Label><span className="mt-8 block">Reward history</span></Label>
      <div className="panel divide-y">
        {rewards.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No rewards paid yet.</p>}
        {rewards.data?.map((r) => (
          <a key={r.timestamp} href={`${HASHSCAN}/transaction/${r.timestamp}`} target="_blank" rel="noreferrer"
            className="flex justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground tnum">{fmtTs(r.timestamp)}</span>
            <span className="text-flare tnum">+{hbar(r.amount)}</span>
          </a>
        ))}
      </div>
    </Shell>
  );
}

function Redelegate({ accountId, node, hasKey, wallet, onClose }: { accountId: string; node: Node; hasKey: boolean; wallet: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [pass, setPass] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ txId: string; ts: string | null } | null>(null);

  const [bio, setBio] = useState(false);
  useEffect(() => { import("@/lib/biometric").then((b) => setBio(b.bioEnrolled())); }, []);
  const go = async (useBio = false) => {
    setState("busy"); setErr("");
    try {
      const p = useBio ? await (await import("@/lib/biometric")).bioPassphrase() : pass;
      const txId = await redelegate(accountId, node.node_id, p);
      const c = await waitForConsensus(txId);
      setResult({ txId, ts: c?.consensus_timestamp ?? null });
      setState("done");
      qc.invalidateQueries({ queryKey: ["stake", accountId] });
      qc.invalidateQueries({ queryKey: ["rewards", accountId] });
      import("@/lib/guard").then((g) => g.audit({ action: "stake", detail: `Moved stake to node ${node.node_id}`, ok: true, txId }));
    } catch (e) {
      setErr((e as Error).message); setState("err");
    }
  };

  if (state === "done" && result)
    return (
      <Panel className="mt-6">
        <SealRing>
          <p className="font-semibold text-success">Now staking to {nodeName(node)}</p>
          {result.ts && <p className="mt-2 text-sm tnum">{fmtTs(result.ts)}</p>}
          <a className="mt-1 block break-all text-xs text-signal" target="_blank" rel="noreferrer"
            href={`${HASHSCAN}/transaction/${result.ts ?? ""}`}>{result.txId}</a>
          <p className="mt-3 text-sm font-medium">Sealed on Hedera</p>
          <button className="btn-ghost mt-4" onClick={onClose}>Done</button>
        </SealRing>
      </Panel>
    );

  return (
    <Panel className="mt-6">
      <Label>Redelegate</Label>
      <p className="flex items-center gap-4 text-lg font-semibold"><NodeLogo description={node.description} size={56} /><span className="min-w-0 break-words">{nodeName(node)}</span></p>
      <p className="text-xs text-muted-foreground tnum">Node {node.node_id} · ~{apr(node)} yearly</p>
      <StakeFill n={node} />
      {fill(node) >= 99.5 && <p className="mt-2 text-xs text-destructive">This node is at its max stake. Stake above the max earns no extra rewards.</p>}
      <div className="mt-4 space-y-1 rounded-md bg-graphite p-3 text-xs text-muted-foreground">
        <p>Max fee: {MAX_FEE_HBAR} ℏ (typical cost is under 0.001 ℏ)</p>
        <p>Public: your account id and the node you stake to.</p>
        <p>Your HBAR does not move. Pending rewards are paid out with this change.</p>
      </div>
      {wallet ? (
        <button className="btn mt-4 w-full" disabled={state === "busy"} onClick={() => go(false)}>
          {state === "busy" ? `Approve in ${wallet}…` : `Update stake on mainnet with ${wallet}`}
        </button>
      ) : hasKey ? (
        <>
          {bio && <button className="btn mt-4 w-full" disabled={state === "busy"} onClick={() => go(true)}>Update stake with Face ID / fingerprint</button>}
          <input type="password" className="field mt-4" placeholder="Device passphrase" value={pass} onChange={(e) => setPass(e.target.value)} />
          <button className="btn mt-3 w-full" disabled={!pass || state === "busy"} onClick={() => go(false)}>
            {state === "busy" ? "Waiting for consensus…" : "Update stake on mainnet"}
          </button>
        </>
      ) : (
        <p className="mt-4 text-sm">
          This account is watch-only. <Link to="/wallet" className="text-signal">Connect its key</Link> to redelegate.
        </p>
      )}
      {state === "err" && <p className="mt-3 text-sm text-destructive">{err}</p>}
      <button className="mt-4 w-full text-xs text-muted-foreground" onClick={onClose}>Cancel</button>
    </Panel>
  );
}
