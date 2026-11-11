import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { SignButton } from "@/components/aurion";
import { useAccount } from "@/lib/account";
import { MIRROR, HASHSCAN } from "@/lib/hedera";
import { autoAssociateOn } from "@/lib/airdrops";
import { REFRESH_MS } from "@/lib/refresh";

/** On-chain account setting; the toggle only proposes a change, the user signs it. */
export function AutoAssociate({ accountId }: { accountId?: string } = {}) {
  const account = useAccount();
  const id = accountId ?? account.id;
  const cache = useQueryClient();
  const q = useQuery({ queryKey: ["auto-assoc", id], enabled: !!id, refetchInterval: REFRESH_MS, queryFn: async () => { const r = await fetch(`${MIRROR}/api/v1/accounts/${id}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error("Account mirror unavailable"); return (await r.json()).max_automatic_token_associations as number; } });
  const [want, setWant] = useState<boolean | null>(null);
  if (!id) return null;
  const on = autoAssociateOn(q.data);
  return <div className="py-2">
    <div className="flex min-h-16 items-center justify-between gap-4 text-sm"><span>Automatically receive tokens & NFTs</span><Switch aria-label="Automatically receive tokens and NFTs" checked={want ?? on} disabled={q.isPending || q.isError} onCheckedChange={(v) => setWant(v === on ? null : v)} /></div>
    <p className="pb-3 text-xs text-muted-foreground">On: any sender can add tokens and NFTs, including unknown collections. Off: direct transfers need an existing association or an available automatic slot; only airdrops can wait for acceptance. Your approval changes this account on Hedera. Network fees apply, capped at 2 HBAR for this update.</p>
    {q.isError && <p role="alert" className="pb-3 text-xs text-destructive">{q.error.message}</p>}
    {want !== null && <SignButton accountId={id} verb={want ? "Turn on auto-associate" : "Turn off auto-associate"} run={async (pass) => { const { setAutoAssociations } = await import("@/lib/signer"); const tx = await setAutoAssociations(id, want, pass); await Promise.all([cache.invalidateQueries({ queryKey: ["auto-assoc", id] }), cache.invalidateQueries({ queryKey: ["nft-receive", id] }), cache.invalidateQueries({ queryKey: ["acct", id] })]); return tx; }} done={(tx) => <><p className="font-semibold text-success">Setting saved on Hedera</p><a href={`${HASHSCAN}/transaction/${tx}`} target="_blank" rel="noreferrer" className="mt-2 block text-xs">View transaction ↗</a></>} />}
  </div>;
}
