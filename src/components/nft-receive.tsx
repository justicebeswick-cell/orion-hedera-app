import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SignButton } from "@/components/aurion";
import { AutoAssociate } from "@/components/auto-associate";
import { ACCOUNT_RE, HASHSCAN } from "@/lib/hedera";
import { getNftReceiveState } from "@/lib/nft-receive";
import { REFRESH_MS } from "@/lib/refresh";

export function NftReceive({ accountId }: { accountId: string }) {
  const [token, setToken] = useState("");
  const [reviewed, setReviewed] = useState<string | null>(null);
  const cache = useQueryClient();
  const status = useQuery({ queryKey: ["nft-receive", accountId], queryFn: () => getNftReceiveState(accountId), refetchInterval: REFRESH_MS });
  const collection = useQuery({ queryKey: ["nft-receive", accountId, reviewed], enabled: reviewed !== null, queryFn: () => getNftReceiveState(accountId, reviewed ?? undefined), refetchInterval: REFRESH_MS });
  return <div className="mt-5 space-y-3 border-t border-border pt-4">
    <h3 className="text-sm font-semibold">Receive NFTs</h3>
    <p className="text-xs text-muted-foreground">Send from HashPack to your numbered Hedera account: <span className="break-all font-mono text-foreground">{accountId}</span>. Do not use an EVM address for this NFT transfer.</p>
    {status.isPending && <p className="text-xs text-muted-foreground">Checking receiving settings…</p>}
    {status.isError && <><p role="alert" className="text-xs text-destructive">{status.error.message}</p><Button variant="outline" size="sm" onClick={() => status.refetch()}>Retry</Button></>}
    {status.data && <p className="text-xs text-muted-foreground">{status.data.unlimited ? "Unlimited automatic associations are enabled." : status.data.freeSlots > 0 ? `${status.data.freeSlots} automatic association slots available.` : "No automatic slots available. Associate the NFT collection below before sending."}</p>}
    {status.data?.receiverSignature && <p role="alert" className="text-xs text-destructive">This account requires a receiver signature. A standard HashPack transfer cannot complete without your co-signature.</p>}
    <AutoAssociate accountId={accountId} />
    <label className="block space-y-2 text-xs"><span>NFT collection ID</span><input className="field font-mono" placeholder="0.0.123456" value={token} onChange={(e) => { setToken(e.target.value); setReviewed(null); }} /></label>
    <Button variant="outline" className="w-full" disabled={!ACCOUNT_RE.test(token.trim())} onClick={() => setReviewed(token.trim())}>Check collection</Button>
    {reviewed && collection.isPending && <p className="text-xs text-muted-foreground">Checking collection…</p>}
    {reviewed && collection.isError && <p role="alert" className="text-xs text-destructive">{collection.error.message}</p>}
    {reviewed && collection.data && (collection.data.associated ? <p className="text-sm text-success">Collection associated. You can receive NFTs from {reviewed}.</p> : <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Associate {reviewed} with {accountId}. This does not move an NFT. Network fees apply, capped at 2 HBAR; transfers may also charge collection fees.</p>
      <SignButton key={`${accountId}:${reviewed}`} accountId={accountId} verb="Associate NFT collection" run={async (pass) => {
        const { associateNftCollection } = await import("@/lib/signer");
        const tx = await associateNftCollection(accountId, reviewed, pass);
        await Promise.all([cache.invalidateQueries({ queryKey: ["nft-receive", accountId] }), cache.invalidateQueries({ queryKey: ["acct", accountId] }), cache.invalidateQueries({ queryKey: ["nfts", accountId] })]);
        return tx;
      }} done={(tx) => <><p className="text-sm font-semibold text-success">NFT collection associated on Hedera</p><a className="mt-2 block text-xs" href={`${HASHSCAN}/transaction/${tx}`} target="_blank" rel="noreferrer">View transaction ↗</a></>} />
    </div>)}
  </div>;
}