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
import { pickCheckPositions } from "@/lib/passphrase";
import { DeviceCode } from "@/components/device-code";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — Orion" },
      { name: "description", content: "Create a new Hedera mainnet wallet on this device or connect an existing one." },
      { property: "og:title", content: "Wallet — Orion" },
      { property: "og:description", content: "Your key is made on your device. Orion never sees it." },
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
      <p className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        {mode === "watch"
          ? "Watch only reads balances. To send, stake or use Face ID / fingerprint, create a wallet or import one here."
          : "Face ID / fingerprint signing works once the wallet's key is saved on this device. Wallets connected through HashPack sign in HashPack instead."}
      </p>
      {mode === "create" && <Create onPending={setPending} />}
      {mode === "import" && <><ExternalWallets onDone={done} /><Import onDone={done} /></>}
      {mode === "watch" && <BindAccount onBind={done} />}
    </Shell>
  );
}

function Passphrase({ onSubmit, busy, cta }: { onSubmit: (p: string) => void; busy: boolean; cta: string }) {
  const [err, setErr] = useState("");
  return <><DeviceCode busy={busy} cta={cta} onSubmit={async (code, biometric) => {
    setErr("");
    // Setup happens before saving so a cancelled biometric dialog never strands a key.
    if (biometric) {
      try { await (await import("@/lib/biometric")).bioEnroll(code); }
      catch (e) { setErr((e as Error).message); return; }
    } else (await import("@/lib/biometric")).bioRemove();
    onSubmit(code);
  }} />{err && <p role="alert" className="mt-2 text-xs text-destructive">{err}</p>}</>;
}

function Create({ onPending }: { onPending: (k: StoredKey) => void }) {
  const [w, setW] = useState<Awaited<ReturnType<typeof generateWallet>> | null>(null);
  const [wrote, setWrote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveErr, setSaveErr] = useState("");

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

  const words = w.phrase.trim().split(/\s+/);

  return (
    <Panel>
      <Label>Recovery phrase</Label>
      <ol className="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-3">
        {words.map((word, i) => (
          <li key={i} className="flex min-h-9 min-w-0 items-center gap-1.5 rounded-md bg-graphite px-2 py-1.5">
            <span className="w-5 shrink-0 text-right tabular-nums text-muted-foreground">{i + 1}.</span>
            <span className="min-w-0 break-all">{word}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-destructive">Write it down. Orion cannot restore it. Anyone with it can move your HBAR.</p>
      {!wrote && <BackupCheck words={words} onPass={() => setWrote(true)} />}
      {wrote && <p className="mt-4 text-sm text-success">Backup checked.</p>}
      {wrote && (
        <Passphrase busy={busy} cta="Save key on this device" onSubmit={async (p) => {
          setBusy(true); setSaveErr("");
          try {
            const meta = { publicKey: w.publicKey, evm: w.evm, accountId: null, kind: "ecdsa" as const, codeLength: p.length as 4 | 6 | 8 };
            await saveKeystore(w.privHex, p, meta);
            onPending(meta);
          } catch (e) {
            setSaveErr(`Key not saved: ${(e as Error).message}`);
          } finally { setBusy(false); }
        }} />
      )}
      {saveErr && <p role="alert" className="mt-2 text-xs text-destructive">{saveErr}</p>}
    </Panel>
  );
}

function BackupCheck({ words, onPass }: { words: string[]; onPass: () => void }) {
  const [pos] = useState(() => pickCheckPositions(words.length, 3));
  const [vals, setVals] = useState<string[]>(["", "", ""]);
  const [err, setErr] = useState(false);
  const check = () => {
    const norm = (s: string) => (s ?? "").normalize("NFKD").toLowerCase().replace(/[^a-z]/g, "");
    const good = pos.every((p, i) => norm(vals[i]!) === norm(words[p]!));
    if (good) onPass(); else setErr(true);
  };
  return (
    <div className="mt-5">
      <Label>Check your backup</Label>
      <p className="text-xs text-muted-foreground">Type these words from your written copy.</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {pos.map((p, i) => (
          <input key={p} className="field font-mono text-xs" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            placeholder={`Word ${p + 1}`} value={vals[i]}
            onChange={(e) => { const v = [...vals]; v[i] = e.target.value; setVals(v); setErr(false); }} />
        ))}
      </div>
      {err && <p className="mt-2 text-xs text-destructive">Those don't match. Check your written copy.</p>}
      <button className="btn mt-3 w-full" disabled={vals.some((v) => !v.trim())} onClick={check}>Check backup</button>
    </div>
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
        In another Orion wallet, open Send and paste this address or scan this QR code. Send HBAR on Hedera mainnet to open this account. Other wallets and exchanges must support Hedera 0x addresses; many exchanges only accept 0.0 account IDs. The account ID appears here automatically after funding.
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
            await saveKeystore(found.privHex, p, { publicKey: found.publicKey, evm: found.evm ?? "", accountId: found.id, kind: found.kind, codeLength: p.length as 4 | 6 | 8 });
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
