import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { SignButton } from "@/components/aurion";
import { getPendingAirdrops, getTokenInfo, tokenAmount, type PendingAirdrop } from "@/lib/airdrops";
import { audit } from "@/lib/guard";
import { HASHSCAN } from "@/lib/hedera";
import { fmtAmount } from "@/lib/display";
import { REFRESH_MS } from "@/lib/refresh";

function Row({ a }: { a: PendingAirdrop }) {
  const info = useQuery({ queryKey: ["token-info", a.token_id], queryFn: () => getTokenInfo(a.token_id), staleTime: 3600000 });
  const name = info.data?.name || a.token_id;
  const what = a.serial_number ? `NFT #${a.serial_number}` : info.data ? `${fmtAmount(tokenAmount(a.amount, info.data.decimals))} ${info.data.symbol}` : "…";
  return <li className="flex items-center justify-between gap-3 py-2 text-sm">
    <div className="min-w-0"><p className="truncate font-semibold">New Token Received: {name}</p><p className="truncate text-xs text-muted-foreground">{what} · from {a.sender_id}</p></div>
    <span className="shrink-0 font-mono text-xs text-muted-foreground">{a.token_id}</span>
  </li>;
}

export function IncomingTokens({ accountId }: { accountId: string }) {
  const cache = useQueryClient();
  const q = useQuery({ queryKey: ["airdrops", accountId], queryFn: () => getPendingAirdrops(accountId), refetchInterval: REFRESH_MS, retry: 1 });
  const items = (q.data ?? []).slice(0, 10);
  if (!items.length) return null;
  return <section aria-label="Incoming tokens" className="panel mb-4 border-primary/40 bg-primary/10 backdrop-blur-xl">
    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Gift size={17} />{items.length === 1 ? "A token is waiting for you" : `${items.length} tokens are waiting for you`}</div>
    <ul className="divide-y divide-border">{items.map((a) => <Row key={`${a.sender_id}/${a.token_id}/${a.serial_number ?? 0}`} a={a} />)}</ul>
    <p className="mb-3 mt-2 text-xs text-muted-foreground">Accepting adds the token to your account and moves it in, in one step. Only accept tokens you recognize. Fee cap: 2 HBAR.</p>
    <SignButton accountId={accountId} verb="Accept & Associate" run={async (pass) => {
      const { claimAirdrops } = await import("@/lib/signer");
      const detail = items.map((a) => a.serial_number ? `${a.token_id} #${a.serial_number}` : a.token_id).join(", ");
      try {
        const txId = await claimAirdrops(accountId, items, pass);
        audit({ action: "Token claim", detail, ok: true, txId });
        for (const key of [["airdrops", accountId], ["acct", accountId], ["nfts", accountId]]) await cache.invalidateQueries({ queryKey: key });
        return txId;
      } catch (e) { audit({ action: "Token claim", detail: `${detail} · ${(e as Error).message}`, ok: false }); throw e; }
    }} done={(txId) => <><p className="font-semibold text-success">Tokens added to your account</p><a href={`${HASHSCAN}/transaction/${txId}`} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs text-foreground">View transaction ↗</a></>} />
  </section>;
}
