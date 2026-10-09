import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Shell, Panel, Label, BindAccount } from "@/components/aurion";
import { useAccount } from "@/lib/account";
import { WC_PROJECT_ID, walletOptions, connectWallet, type WalletOption } from "@/lib/walletconnect";
import {
  generateWallet, importWallet, saveKeystore, readKeystoreMeta, setKeystoreAccount,
  findAccountByKey, findAccountByEvm, clearKeystore, type StoredKey,
} from "@/lib/keystore";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — AURION" },
      { name: "description", content: "Create a new Hedera mainnet wallet on this device or connect an existing one." },
      { property: "og:title", content: "Wallet — AURION" },
      { property: "og:description", content: "Your key is made on your device. AURION never sees it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Wallet,
});

type Mode = "create" | "import" | "watch";

function Wallet() {
  const [mode, setMode] = useState<Mode>("create");
  const [pending, setPending] = useState<StoredKey | null>(null);
  useEffect(() => {
    const m = readKeystoreMeta();
    if (m && !m.accountId) setPending(m);
  }, []);
  const { bind } = useAccount();
  const nav = useNavigate();
  const done = (id: string) => { bind(id); nav({ to: "/" }); };

  if (pending)
    return (
      <Shell title="Wallet">
        <AwaitFunding k={pending} onFound={done} />
        <button className="btn-ghost mt-4 w-full" onClick={() => {
          if (!confirm("Use a wallet you already have instead? The new unfunded key will be removed from this device. If you wrote down its 24 words you can still restore it later.")) return;
          clearKeystore(); setPending(null); setMode("import");
        }}>I already have a wallet — enter my phrase</button>
      </Shell>
    );

  return (
    <Shell title="Wallet">
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(["create", "import", "watch"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`btn-ghost py-2 text-xs ${mode === m ? "border-primary text-primary" : ""}`}>
            {m === "create" ? "Create new" : m === "import" ? "I have a wallet" : "Watch only"}
          </button>
        ))}
      </div>
      {mode === "create" && <Create onPending={setPending} />}
      {mode === "import" && <><ExternalWallets onDone={done} /><Import onDone={done} /></>}
      {mode === "watch" && <BindAccount onBind={done} />}
    </Shell>
  );
}

function Passphrase({ onSubmit, busy, cta }: { onSubmit: (p: string) => void; busy: boolean; cta: string }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const ok = a.length >= 10 && a === b;
  return (
    <>
      <Label><span className="mt-5 block">Device passphrase</span></Label>
      <input type="password" className="field" placeholder="At least 10 characters" value={a} onChange={(e) => setA(e.target.value)} />
      <input type="password" className="field mt-2" placeholder="Repeat" value={b} onChange={(e) => setB(e.target.value)} />
      <p className="mt-2 text-xs text-muted-foreground">Unlocks the key on this device. Encrypted with AES-GCM and Argon2id.</p>
      <button className="btn mt-4 w-full" disabled={!ok || busy} onClick={() => onSubmit(a)}>{busy ? "Encrypting…" : cta}</button>
    </>
  );
}

function Create({ onPending }: { onPending: (k: StoredKey) => void }) {
  const [w, setW] = useState<Awaited<ReturnType<typeof generateWallet>> | null>(null);
  const [wrote, setWrote] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!w)
    return (
      <Panel>
        <Label>New mainnet wallet</Label>
        <p className="text-sm text-muted-foreground">
          A key is made on this device. The account appears on mainnet when it receives its first HBAR.
        </p>
        <button className="btn mt-4 w-full" onClick={async () => setW(await generateWallet())}>Generate key</button>
      </Panel>
    );

  return (
    <Panel>
      <Label>Recovery phrase</Label>
      <ol className="grid grid-cols-3 gap-2 font-mono text-xs">
        {w.phrase.split(" ").map((word, i) => (
          <li key={i} className="rounded-md bg-graphite px-2 py-1.5"><span className="text-muted-foreground">{i + 1}.</span> {word}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-destructive">Write it down. AURION cannot restore it. Anyone with it can move your HBAR.</p>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={wrote} onChange={(e) => setWrote(e.target.checked)} /> I wrote it down.
      </label>
      {wrote && (
        <Passphrase busy={busy} cta="Save key on this device" onSubmit={async (p) => {
          setBusy(true);
          const meta = { publicKey: w.publicKey, evm: w.evm, accountId: null, kind: "ecdsa" as const };
          await saveKeystore(w.privHex, p, meta);
          onPending(meta);
        }} />
      )}
    </Panel>
  );
}

function AwaitFunding({ k, onFound }: { k: StoredKey; onFound: (id: string) => void }) {
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const id = await findAccountByEvm(k.evm);
        setErr("");
        if (id && live) { setKeystoreAccount(id); onFound(id); }
      } catch (e) { setErr((e as Error).message); }
    };
    tick();
    const t = setInterval(tick, 8000);
    return () => { live = false; clearInterval(t); };
  }, [k.evm, onFound]);

  return (
    <Panel>
      <Label>Fund to open on mainnet</Label>
      <div className="flex justify-center rounded-md bg-foreground p-3">
        <QRCodeSVG value={k.evm} size={150} bgColor="transparent" fgColor="oklch(0.08 0.012 310)" />
      </div>
      <p className="mt-4 break-all font-mono text-sm">{k.evm}</p>
      <button className="btn-ghost mt-2 w-full py-2 text-xs" onClick={() => navigator.clipboard.writeText(k.evm)}>Copy address</button>
      <p className="mt-4 text-xs text-muted-foreground">
        Send HBAR to this address from an exchange or wallet that supports Hedera EVM addresses. Hedera creates the account
        on arrival. The account id appears here automatically.
      </p>
      <p className="mt-3 text-sm text-signal">{err || "Watching mainnet…"}</p>
    </Panel>
  );
}

function Import({ onDone }: { onDone: (id: string) => void }) {
  const [input, setInput] = useState("");
  const [found, setFound] = useState<{ privHex: string; publicKey: string; evm: string | null; kind: "ecdsa" | "ed25519"; id: string } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    setErr(""); setBusy(true);
    try {
      const cands = await importWallet(input);
      for (const c of cands) {
        const id = await findAccountByKey(c.publicKey);
        if (id) { setFound({ ...c, id }); setBusy(false); return; }
      }
      setErr("No mainnet account holds this key.");
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <Panel>
      <Label>Connect an existing wallet</Label>
      {!found ? (
        <>
          <WordBoxes onChange={setInput} />
          <p className="mt-2 text-xs text-muted-foreground">Read only on this device. Never sent anywhere.</p>
          <button className="btn mt-4 w-full" disabled={!input.trim() || busy} onClick={lookup}>
            {busy ? "Reading mainnet…" : "Find account on mainnet"}
          </button>
          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        </>
      ) : (
        <>
          <p className="font-mono text-lg tnum">{found.id}</p>
          <p className="text-xs text-success">Found on mainnet.</p>
          <Passphrase busy={busy} cta="Save key on this device" onSubmit={async (p) => {
            setBusy(true);
            await saveKeystore(found.privHex, p, { publicKey: found.publicKey, evm: found.evm ?? "", accountId: found.id, kind: found.kind });
            onDone(found.id);
          }} />
        </>
      )}
    </Panel>
  );
}

function ExternalWallets({ onDone }: { onDone: (id: string) => void }) {
  const [opts, setOpts] = useState<WalletOption[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!WC_PROJECT_ID) return;
    walletOptions().then(setOpts).catch((e) => setErr((e as Error).message));
  }, []);

  return (
    <Panel className="mb-4">
      <Label>HashPack or Blade</Label>
      {!WC_PROJECT_ID ? (
        <p className="text-sm text-muted-foreground">WalletConnect is not set up for this app yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(opts ?? [{ id: "hashpack", name: "HashPack", installed: false }, { id: "blade", name: "Blade", installed: false }]).map((o) => (
            <button key={o.name} className="btn-ghost flex-col py-3" disabled={!opts || !!busy}
              onClick={async () => {
                setBusy(o.name); setErr("");
                try { onDone(await connectWallet(o)); }
                catch (e) { setErr((e as Error).message || "Connection cancelled"); }
                setBusy(null);
              }}>
              <span>{busy === o.name ? "Waiting…" : o.name}</span>
              <span className="text-[10px] text-muted-foreground">{o.installed ? "Extension" : "Scan with app"}</span>
            </button>
          ))}
        </div>
      )}
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      <p className="mt-3 text-xs text-muted-foreground">Keys stay in your wallet. Every change is approved there.</p>
    </Panel>
  );
}

function WordBoxes({ onChange }: { onChange: (v: string) => void }) {
  const [kind, setKind] = useState<12 | 24 | "key">(24);
  const [words, setWords] = useState<string[]>(Array(24).fill(""));
  const [key, setKey] = useState("");
  const n = kind === "key" ? 0 : kind;
  const update = (w: string[]) => { setWords(w); onChange(w.slice(0, n).every(Boolean) ? w.slice(0, n).join(" ") : ""); };
  const setAt = (i: number, v: string) => {
    const parts = v.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      // Pasted a whole phrase: spread it across the boxes.
      const len = parts.length === 12 ? 12 : 24;
      if (parts.length === 12 || parts.length === 24) setKind(len);
      const w = Array(24).fill(""); parts.slice(0, 24).forEach((p, j) => (w[j] = p));
      setWords(w); onChange(parts.length === 12 || parts.length === 24 ? parts.join(" ") : "");
      return;
    }
    const w = [...words]; w[i] = v.trim().toLowerCase(); update(w);
  };
  return (
    <>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {([12, 24, "key"] as const).map((k) => (
          <button key={k} className={`btn-ghost py-2 text-xs ${kind === k ? "border-primary text-primary" : ""}`}
            onClick={() => { setKind(k); onChange(k === "key" ? key.trim() : words.slice(0, k).every(Boolean) ? words.slice(0, k).join(" ") : ""); }}>
            {k === "key" ? "Private key" : `${k} words`}
          </button>
        ))}
      </div>
      {kind === "key" ? (
        <input type="password" className="field font-mono text-xs" placeholder="Private key" value={key} autoComplete="off"
          onChange={(e) => { setKey(e.target.value); onChange(e.target.value.trim()); }} />
      ) : (
        <ol className="grid grid-cols-3 gap-2">
          {Array.from({ length: n }, (_, i) => (
            <li key={i} className="flex items-center gap-1 rounded-md bg-graphite px-2">
              <span className="w-5 shrink-0 text-right text-[10px] text-muted-foreground tnum">{i + 1}</span>
              <input className="w-full min-w-0 bg-transparent py-2 font-mono text-xs outline-none" value={words[i]}
                autoComplete="off" autoCapitalize="none" spellCheck={false} aria-label={`Word ${i + 1}`}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); (e.currentTarget.closest("li")?.nextElementSibling?.querySelector("input") as HTMLInputElement | null)?.focus(); } }} />
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Tip: paste your whole phrase into box 1 and it fills every box.</p>
    </>
  );
}
