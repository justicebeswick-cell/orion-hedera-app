import { useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ExternalLink, ImageIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Panel, Label, SignButton } from "@/components/aurion";
import { RecipientField } from "@/components/contacts";
import { ACCOUNT_RE, HASHSCAN } from "@/lib/hedera";
import { getTokenInfo, royaltyPercent } from "@/lib/airdrops";
import { getNfts, getNftMetadata, type Nft } from "@/lib/nfts";
import { audit } from "@/lib/guard";
import { REFRESH_MS } from "@/lib/refresh";
import { NftReceive } from "@/components/nft-receive";

function Artwork({ image, name, className = "" }: { image: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={`flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-secondary ${className}`}>
    {image && !failed ? <img src={image} alt={name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" onError={() => setFailed(true)} /> : <ImageIcon className="h-10 w-10 text-muted-foreground" />}
  </div>;
}

function NftTile({ nft, onOpen }: { nft: Nft; onOpen: () => void }) {
  const meta = useQuery({ queryKey: ["nft-meta", nft.token_id, nft.serial_number, nft.metadata], queryFn: () => getNftMetadata(nft), staleTime: 3600000 });
  return <Button variant="ghost" onClick={onOpen} aria-label={`View NFT ${nft.token_id} #${nft.serial_number}`} className="h-auto min-w-0 flex-col items-stretch gap-2 p-0 text-left hover:bg-transparent">
    <Artwork image={meta.data?.image ?? null} name={meta.data?.name ?? "NFT"} />
    <span className="truncate text-sm font-semibold">{meta.data?.name ?? nft.token_id}</span>
    <span className="text-xs text-muted-foreground">#{nft.serial_number}</span>
  </Button>;
}

export function NftGallery({ accountId }: { accountId: string }) {
  const [selected, setSelected] = useState<Nft | null>(null);
  const nfts = useInfiniteQuery({ queryKey: ["nfts", accountId], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getNfts(accountId, pageParam), getNextPageParam: (last) => last.links.next ?? undefined,
    refetchInterval: REFRESH_MS, retry: 1 });
  const rows = nfts.data?.pages.flatMap((page) => page.nfts) ?? [];
  return <Panel>
    <div className="mb-4 flex items-center justify-between"><Label>NFTs</Label><Button variant="ghost" size="icon" aria-label="Refresh NFTs" disabled={nfts.isFetching} onClick={() => nfts.refetch()}><RefreshCw size={17} className={nfts.isFetching ? "animate-spin" : ""} /></Button></div>
    {nfts.isPending && <div className="grid grid-cols-2 gap-4">{[0, 1].map((key) => <div key={key} className="aspect-square animate-pulse rounded-lg bg-secondary" />)}</div>}
    {nfts.isError && <p role="alert" className="mb-4 text-sm text-destructive">{nfts.error.message}</p>}
    {!nfts.isPending && !nfts.isError && rows.length === 0 && <div className="py-10 text-center"><ImageIcon className="mx-auto mb-3 text-muted-foreground" /><p className="text-sm">No NFTs in this wallet yet.</p><p className="mt-2 break-all font-mono text-xs text-muted-foreground">{accountId}</p></div>}
    <div className="grid grid-cols-2 gap-x-4 gap-y-6">{rows.map((nft) => <NftTile key={`${nft.token_id}/${nft.serial_number}`} nft={nft} onOpen={() => setSelected(nft)} />)}</div>
    {nfts.hasNextPage && <Button variant="outline" className="mt-5 w-full" disabled={nfts.isFetchingNextPage} onClick={() => nfts.fetchNextPage()}>{nfts.isFetchingNextPage ? "Loading…" : "Load more"}</Button>}
    <NftReceive key={accountId} accountId={accountId} />
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto">{selected && <NftDetails key={`${selected.token_id}/${selected.serial_number}`} nft={selected} accountId={accountId} />}</DialogContent></Dialog>
  </Panel>;
}

function NftDetails({ nft, accountId }: { nft: Nft; accountId: string }) {
  const meta = useQuery({ queryKey: ["nft-meta", nft.token_id, nft.serial_number, nft.metadata], queryFn: () => getNftMetadata(nft), staleTime: 3600000 });
  const cache = useQueryClient();
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const name = meta.data?.name ?? `${nft.token_id} #${nft.serial_number}`;
  const recipient = to.trim();
  const valid = ACCOUNT_RE.test(recipient) && recipient !== accountId;
  return <>
    <DialogTitle className="break-words">{name}</DialogTitle>
    <DialogDescription>{nft.token_id} · Serial #{nft.serial_number}</DialogDescription>
    <Artwork image={meta.data?.image ?? null} name={name} className="mx-auto w-full max-w-72" />
    {meta.data?.description && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{meta.data.description}</p>}
    <TokenFacts tokenId={nft.token_id} serial={nft.serial_number} />
    <Button asChild variant="ghost" className="justify-start"><a href={`${HASHSCAN}/token/${nft.token_id}/${nft.serial_number}`} target="_blank" rel="noreferrer"><ExternalLink size={15} />View on HashScan</a></Button>
    {!sending ? <Button onClick={() => setSending(true)}><ArrowUpRight size={17} />Send NFT</Button> : <div className="space-y-4 border-t border-border pt-4">
      {!reviewed ? <><RecipientField value={to} self={accountId} onChange={setTo} /><Button className="w-full" disabled={!valid} onClick={() => setReviewed(true)}>Review transfer</Button></> : <>
        <p className="text-sm">Send <strong>{name}</strong></p><p className="break-all font-mono text-sm">To {recipient}</p>
        <p className="text-xs text-muted-foreground">Permanent transfer. Hedera fees and any collection royalties or custom fees apply. Network fee cap: 2 HBAR; collection fees are additional.</p>
        <SignButton accountId={accountId} verb="Approve NFT transfer" run={async (pass) => {
          const detail = `${accountId} → ${recipient} ${nft.token_id} #${nft.serial_number}`;
          try {
            const { sendNft } = await import("@/lib/signer");
            const txId = await sendNft(accountId, recipient, nft.token_id, nft.serial_number, pass);
            audit({ action: "NFT send", detail, ok: true, txId });
            await cache.invalidateQueries({ queryKey: ["nfts", accountId] });
            await cache.invalidateQueries({ queryKey: ["acct", accountId] });
            return txId;
          } catch (error) { audit({ action: "NFT send", detail: `${detail} · ${(error as Error).message}`, ok: false }); throw error; }
        }} done={(txId) => <><p className="font-semibold text-success">NFT sent on Hedera</p><a href={`${HASHSCAN}/transaction/${txId}`} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs text-foreground">View transaction ↗</a></>} />
        <Button variant="ghost" onClick={() => setReviewed(false)}>Change recipient</Button>
      </>}
    </div>}
  </>;
}
function TokenFacts({ tokenId, serial }: { tokenId: string; serial: number }) {
  const q = useQuery({ queryKey: ["token-info", tokenId], queryFn: () => getTokenInfo(tokenId), staleTime: 3600000 });
  if (q.isPending) return <div className="h-28 animate-pulse rounded-lg bg-secondary" />;
  if (q.isError) return <p className="text-xs text-destructive">{q.error.message}</p>;
  const t = q.data, royalties = t.custom_fees?.royalty_fees ?? [];
  const row = (k: string, v: string) => <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="break-all text-right font-mono">{v}</dd></div>;
  const flag = (k: unknown) => (k ? "Yes" : "No");
  return <dl className="divide-y divide-border rounded-lg border border-border px-3 text-xs">
    {row("Collection", `${t.name} (${t.symbol})`)}
    {row("Serial", `#${serial}`)}
    {row("Creator / treasury", t.treasury_account_id ?? "—")}
    {royalties.length === 0 ? row("Royalty", "None") : royalties.map((r, i) => <div key={i}>{row(`Royalty ${royalties.length > 1 ? i + 1 : ""}`.trim(), `${royaltyPercent(r.amount).toFixed(2)}% → ${r.collector_account_id}`)}</div>)}
    {(t.custom_fees?.fixed_fees ?? []).map((f, i) => <div key={`f${i}`}>{row("Fixed fee", `${f.denominating_token_id ? f.amount + " units " + f.denominating_token_id : f.amount / 1e8 + " HBAR"} → ${f.collector_account_id}`)}</div>)}
    {row("Pausable", t.pause_key ? `Yes · ${t.pause_status === "PAUSED" ? "Paused" : "Active"}` : "No")}
    {row("KYC required", flag(t.kyc_key))}
    {row("Freezable", flag(t.freeze_key))}
    {row("Admin can wipe", flag(t.wipe_key))}
  </dl>;
}
