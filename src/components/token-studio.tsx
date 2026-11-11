import { useState } from "react";
import { Panel, Label, SignButton } from "@/components/aurion";
import { createAndMintNft, createFungibleToken, signMode } from "@/lib/signer";
import { audit } from "@/lib/guard";
import { uploadNftMedia } from "@/lib/nft-upload.functions";

const HASHSCAN = "https://hashscan.io/mainnet";
const META_RE = /^(ipfs:\/\/|https:\/\/)\S+$/;

export function TokenStudio({ accountId }: { accountId: string }) {
  const [tab, setTab] = useState<"nft" | "token">("nft");
  const device = signMode(accountId).kind === "device";
  return (
    <Panel className="mt-4">
      <Label>Create</Label>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(["nft", "token"] as const).map((t) => (
          <button key={t} className={tab === t ? "btn" : "btn-ghost"} onClick={() => setTab(t)}>{t === "nft" ? "Mint NFT" : "Create token"}</button>
        ))}
      </div>
      {!device ? <p className="text-sm text-muted-foreground">Creating needs a key saved on this device.</p>
        : tab === "nft" ? <MintNft id={accountId} /> : <NewToken id={accountId} />}
    </Panel>
  );
}

function MintNft({ id }: { id: string }) {
  const [existing, setExisting] = useState("");
  const [name, setName] = useState(""); const [symbol, setSymbol] = useState("");
  const [max, setMax] = useState("100"); const [royalty, setRoyalty] = useState("0");
  const [meta, setMeta] = useState("");
  const [desc, setDesc] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [upBusy, setUpBusy] = useState(false);
  const [upErr, setUpErr] = useState("");
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setUpErr(""); setUpBusy(true);
    try {
      if (f.size > 5 * 1024 * 1024) throw new Error("Picture must be under 5 MB.");
      const buf = new Uint8Array(await f.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const origin = location.hostname === "localhost" || location.hostname.includes("preview") ? "https://hedera-trust-vault.lovable.app" : location.origin;
      const r = await uploadNftMedia({ data: { image: btoa(bin), type: f.type, name: name.trim() || f.name, description: desc.trim(), origin } });
      setMeta(r.metadata); setPreview(URL.createObjectURL(f));
    } catch (e) { setUpErr((e as Error).message); }
    setUpBusy(false);
  };
  const reuse = /^0\.0\.\d+$/.test(existing.trim());
  const r = Number(royalty), m = Number(max);
  const metaOk = META_RE.test(meta.trim()) && new TextEncoder().encode(meta.trim()).length <= 100;
  const ok = metaOk && (reuse || (name.trim() && symbol.trim() && Number.isInteger(m) && m > 0 && r >= 0 && r <= 50));
  return (
    <div className="space-y-3">
      <input className="field font-mono" placeholder="Existing collection 0.0.… (optional)" value={existing} onChange={(e) => setExisting(e.target.value)} />
      {!reuse && <>
        <input className="field" maxLength={100} placeholder="Collection name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" maxLength={20} placeholder="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">Max supply<input className="field tnum" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} /></label>
          <label className="text-xs text-muted-foreground">Royalty %<input className="field tnum" inputMode="decimal" value={royalty} onChange={(e) => setRoyalty(e.target.value)} /></label>
        </div>
      </>}
      <input className="field" maxLength={500} placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <label className="btn-ghost flex cursor-pointer items-center justify-center gap-2">
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        {upBusy ? "Uploading…" : preview ? "Change picture" : "Upload picture"}
      </label>
      {preview && <img src={preview} alt="NFT preview" className="mx-auto max-h-48 rounded-xl" />}
      {upErr && <p className="text-xs text-destructive">{upErr}</p>}
      <input className="field text-xs" placeholder="Or paste a metadata link (ipfs://… or https://…)" value={meta} onChange={(e) => { setMeta(e.target.value); setPreview(null); }} />
      <p className="text-xs text-muted-foreground">Uploaded pictures are public once minted. Up to 5 MB. Network fees apply: about $1 to create a collection, $0.02 per mint.</p>
      <SignButton accountId={id} disabled={!ok} verb={reuse ? "Mint NFT" : "Create collection and mint"} run={async (pass) => {
        try {
          const res = await createAndMintNft(id, { name: name.trim(), symbol: symbol.trim(), maxSupply: m, royaltyPct: r, metadata: meta.trim(), ...(reuse ? { tokenId: existing.trim() } : {}) }, pass);
          audit({ action: "nft mint", detail: `${res.tokenId} #${res.serial}`, ok: true });
          return `${res.tokenId}/${res.serial}`;
        } catch (e) { audit({ action: "nft mint", detail: (e as Error).message, ok: false }); throw e; }
      }} done={(ref) => {
        const [t, s] = ref.split("/");
        return <><p className="font-semibold text-success">Minted NFT #{s}</p>
          <a className="mt-1 block text-xs text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/token/${t}`}>Collection {t}</a></>;
      }} />
    </div>
  );
}

function NewToken({ id }: { id: string }) {
  const [name, setName] = useState(""); const [symbol, setSymbol] = useState("");
  const [dec, setDec] = useState("2"); const [supply, setSupply] = useState("1000000");
  const d = Number(dec), s = Number(supply);
  const ok = name.trim() && symbol.trim() && Number.isInteger(d) && d >= 0 && d <= 8 && s > 0 && s * 10 ** d < 9.2e18;
  return (
    <div className="space-y-3">
      <input className="field" maxLength={100} placeholder="Token name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="field" maxLength={20} placeholder="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">Decimals<input className="field tnum" inputMode="numeric" value={dec} onChange={(e) => setDec(e.target.value)} /></label>
        <label className="text-xs text-muted-foreground">Supply<input className="field tnum" inputMode="decimal" value={supply} onChange={(e) => setSupply(e.target.value)} /></label>
      </div>
      <p className="text-xs text-muted-foreground">The full supply goes to this account. Network fee about $1.</p>
      <SignButton accountId={id} disabled={!ok} verb="Create token" run={async (pass) => {
        try {
          const t = await createFungibleToken(id, { name: name.trim(), symbol: symbol.trim(), decimals: d, supply: s }, pass);
          audit({ action: "token create", detail: `${t} ${symbol}`, ok: true });
          return t;
        } catch (e) { audit({ action: "token create", detail: (e as Error).message, ok: false }); throw e; }
      }} done={(t) => <><p className="font-semibold text-success">Token created</p>
        <a className="mt-1 block text-xs text-signal" target="_blank" rel="noreferrer" href={`${HASHSCAN}/token/${t}`}>{t}</a></>} />
    </div>
  );
}
