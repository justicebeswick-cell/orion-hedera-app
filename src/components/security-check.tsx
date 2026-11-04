import { useState } from "react";
import { Panel, Label } from "@/components/aurion";
import { Button } from "@/components/ui/button";
import { MIRROR } from "@/lib/hedera";
import { readKeystoreMeta } from "@/lib/keystore";
import { bioEnrolled } from "@/lib/biometric";
import { getLimits, readAudit, audit } from "@/lib/guard";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";

type Level = "ok" | "warn" | "bad";
type Result = { name: string; level: Level; note: string };

async function j(path: string) {
  const r = await fetch(MIRROR + path);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export async function runChecks(id: string | null): Promise<Result[]> {
  const out: Result[] = [];
  const meta = readKeystoreMeta();

  out.push(window.isSecureContext
    ? { name: "Secure connection", level: "ok", note: "The app is running over HTTPS." }
    : { name: "Secure connection", level: "bad", note: "This page isn't on a secure connection. Don't sign anything here." });

  if (meta) out.push({ name: "Key storage", level: "ok", note: "Your key is encrypted with your passphrase and never leaves this device." });
  else out.push({ name: "Key storage", level: "ok", note: "No key is stored here. You sign with a wallet app or view only." });

  if (meta) out.push(bioEnrolled()
    ? { name: "Biometric lock", level: "ok", note: "Face ID or fingerprint is on." }
    : { name: "Biometric lock", level: "warn", note: "Turn on Face ID or fingerprint below for faster, safer signing." });

  const l = getLimits();
  out.push(l.perSend > 0 && l.perDay > 0
    ? { name: "Send limits", level: "ok", note: `Up to ${l.perSend.toLocaleString()} per send, ${l.perDay.toLocaleString()} per day.` }
    : { name: "Send limits", level: "warn", note: "No send limit is set. Add one below." });

  try {
    const p = await navigator.storage?.persisted?.();
    out.push(p
      ? { name: "Device storage", level: "ok", note: "Your browser won't clear your wallet data." }
      : { name: "Device storage", level: meta ? "warn" : "ok", note: "Your browser may clear data when space runs low. Tap 'Keep my data from being cleared' below, and keep your recovery phrase written down." });
  } catch { /* unsupported */ }

  const fails = readAudit().filter((e) => !e.ok && Date.now() - new Date(e.at).getTime() < 7 * 864e5).length;
  out.push(fails === 0
    ? { name: "Recent activity", level: "ok", note: "No failed or blocked actions in the last 7 days." }
    : { name: "Recent activity", level: "warn", note: `${fails} failed or blocked action${fails > 1 ? "s" : ""} in the last 7 days. Review your activity log.` });

  if (!id) return out;

  try {
    const acct = await j(`/api/v1/accounts/${id}`);
    if (acct.deleted) out.push({ name: "Account status", level: "bad", note: "This account is deleted on Hedera." });
    else out.push({ name: "Account status", level: "ok", note: "Account is active on Hedera mainnet." });
    if (meta) {
      const chainKey: string = acct.key?.key ?? "";
      const match = chainKey && meta.publicKey.toLowerCase().endsWith(chainKey.toLowerCase().slice(-64));
      out.push(match
        ? { name: "Account key", level: "ok", note: "The key on this device controls the account." }
        : { name: "Account key", level: "bad", note: "The account's key on Hedera doesn't match this device. Someone else may control it." });
    }
  } catch {
    out.push({ name: "Account status", level: "warn", note: "Couldn't reach the Hedera mirror node. Try again." });
  }

  try {
    const [c, t, n] = await Promise.all([
      j(`/api/v1/accounts/${id}/allowances/crypto?limit=100`),
      j(`/api/v1/accounts/${id}/allowances/tokens?limit=100`),
      j(`/api/v1/accounts/${id}/allowances/nfts?limit=100`).catch(() => ({ allowances: [] })),
    ]);
    const active = [...(c.allowances ?? []), ...(t.allowances ?? [])].filter((a: { amount?: number }) => (a.amount ?? 0) > 0).length
      + (n.allowances ?? []).filter((a: { approved_for_all?: boolean }) => a.approved_for_all).length;
    out.push(active === 0
      ? { name: "Spending approvals", level: "ok", note: "No other account or app can spend your funds." }
      : { name: "Spending approvals", level: "warn", note: `${active} account${active > 1 ? "s or apps" : " or app"} can spend from this wallet. Check them on HashScan and remove any you don't recognise.` });
  } catch {
    out.push({ name: "Spending approvals", level: "warn", note: "Couldn't check spending approvals. Try again." });
  }

  return out;
}

const icon = { ok: CheckCircle2, warn: AlertTriangle, bad: XCircle };
const tone = { ok: "text-primary", warn: "text-amber-400", bad: "text-destructive" };

export function SecurityCheck({ id }: { id: string | null }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result[] | null>(null);
  const run = async () => {
    setBusy(true);
    try {
      const r = await runChecks(id);
      setRes(r);
      audit({ action: "security-check", detail: `${r.filter((x) => x.level !== "ok").length} issues`, ok: true });
    } finally { setBusy(false); }
  };
  const issues = res?.filter((r) => r.level !== "ok").length ?? 0;
  return (
    <Panel>
      <Label>Wallet safety check</Label>
      <p className="mb-3 text-xs text-muted-foreground">Checks your key, account, spending approvals and device settings.</p>
      <Button className="w-full" onClick={run} disabled={busy}>
        <ShieldCheck className="mr-2 h-4 w-4" />{busy ? "Checking…" : res ? "Run again" : "Run security check"}
      </Button>
      {res && (
        <div className="mt-4 space-y-3 animate-in fade-in duration-300">
          <p className="text-sm font-medium">{issues === 0 ? "Your wallet looks safe." : `${issues} thing${issues > 1 ? "s" : ""} to review.`}</p>
          {res.map((r) => { const I = icon[r.level]; return (
            <div key={r.name} className="flex gap-3 text-sm">
              <I className={`mt-0.5 h-4 w-4 shrink-0 ${tone[r.level]}`} />
              <div><p>{r.name}</p><p className="text-xs text-muted-foreground">{r.note}</p></div>
            </div>
          ); })}
          <p className="text-[11px] text-muted-foreground">This checks settings and on-chain data. It can't detect malware on your phone. Never share your recovery phrase.</p>
        </div>
      )}
    </Panel>
  );
}
