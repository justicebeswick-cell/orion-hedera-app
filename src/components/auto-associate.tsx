import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { SignButton } from "@/components/aurion";
import { useAccount } from "@/lib/account";
import { MIRROR, HASHSCAN } from "@/lib/hedera";
import { autoAssociateOn } from "@/lib/airdrops";

/** On-chain account setting; the toggle only proposes a change, the user signs it. */
export function AutoAssociate() {
  const { id } = useAccount();
  const cache = useQueryClient();
  const q = useQuery({ queryKey: ["auto-assoc", id], enabled: !!id, queryFn: async () => { const r = await fetch(`${MIRROR}/api/v1/accounts/${id}`); if (!r.ok) throw new Error("Account mirror unavailable"); return (await r.json()).max_automatic_token_associations as number; } });
  const [want, setWant] = useState<boolean | null>(null);
  if (!id) return null;
  const on = autoAssociateOn(q.data);
  return <div className="py-2">
    <div className="flex min-h-16 items-center justify-between gap-4 text-sm"><span>Auto-associate trusted tokens/NFTs</span><Switch aria-label="Auto-associate trusted tokens/NFTs" checked={want ?? on} disabled={q.isPending || q.isError} onCheckedChange={(v) => setWant(v === on ? null : v)} /></div>
    <p className="pb-3 text-xs text-muted-foreground">On: incoming tokens and NFTs land in your account without a separate accept step. Off: they wait for you in Vault. Hedera applies this to every sender, so unknown tokens can arrive too. Stored on your account, not this device.</p>
    {want !== null && <SignButton accountId={id} verb={want ? "Turn on auto-associate" : "Turn off auto-associate"} run={async (pass) => { const { setAutoAssociations } = await import("@/lib/signer"); const tx = await setAutoAssociations(id, want, pass); await cache.invalidateQueries({ queryKey: ["auto-assoc", id] }); setWant(null); return tx; }} done={(tx) => <><p className="font-semibold text-success">Setting saved on Hedera</p><a href={`${HASHSCAN}/transaction/${tx}`} target="_blank" rel="noreferrer" className="mt-2 block text-xs">View transaction ↗</a></>} />}
  </div>;
}
