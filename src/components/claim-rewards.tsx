import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Fingerprint, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { hbar, HASHSCAN } from "@/lib/hedera";
import { canClaimReward } from "@/lib/rewards";
import type { SignMode } from "@/lib/signer";

export function ClaimRewards({ accountId, pendingReward, compact = false }: { accountId: string; pendingReward: number | undefined; compact?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SignMode>({ kind: "none" });
  const [bio, setBio] = useState(false);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ txId: string; timestamp: string | null; paidTinybar: number | null } | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    Promise.all([import("@/lib/signer"), import("@/lib/biometric")]).then(([s, b]) => {
      if (active) { setMode(s.signMode(accountId)); setBio(b.bioEnrolled()); }
    });
    return () => { active = false; };
  }, [accountId, open]);

  const claim = async (biometric = false) => {
    if (lock.current || result) return;
    lock.current = true;
    setBusy(true); setError("");
    try {
      const phrase = biometric ? await (await import("@/lib/biometric")).bioPassphrase() : pass;
      const { claimStakingRewards } = await import("@/lib/staking");
      const confirmed = await claimStakingRewards(accountId, phrase);
      setPass(""); setResult(confirmed);
      await Promise.all(["acct", "txs", "stake", "rewards"].map((key) => qc.invalidateQueries({ queryKey: [key, accountId] })));
    } catch (e) { setError(e instanceof Error ? e.message : "Reward claim failed"); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <>
      <Button variant="ghost" className={compact ? "home-reward h-auto min-w-0 w-full justify-start whitespace-normal px-0 py-3 text-left font-normal" : "stat-tile block h-auto min-w-0 w-full whitespace-normal text-left font-normal hover:bg-accent"}
        aria-label={`Claim rewards${pendingReward === undefined ? "" : `: ${hbar(pendingReward)} HBAR`}`}
        onClick={() => { setError(""); setResult(null); setOpen(true); }}>
        <Sparkles size={16} className="text-primary" />
        {compact && <span className="flex-1 text-sm">Claim rewards<span className="block text-[11px] text-muted-foreground">Rewards build up daily and pay out on your next transaction, or claim them here.</span></span>}
        <span className={`${compact ? "" : "mt-2 block"} break-words text-sm font-semibold tnum`}>{pendingReward === undefined ? "—" : `${hbar(pendingReward)} ℏ`}</span>
        {!compact && <span className="mt-0.5 block text-xs text-muted-foreground">Claim rewards · pays out on your next transaction</span>}
      </Button>
      <Dialog open={open} onOpenChange={(value) => { if (!busy) { setOpen(value); setPass(""); } }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl">
          <DialogTitle>Claim staking rewards</DialogTitle>
          <DialogDescription>Hedera pays eligible rewards into your account through a signed account update. Your staking choice stays unchanged.</DialogDescription>
          <p className="break-words text-3xl font-semibold text-signal tnum">{pendingReward === undefined ? "—" : hbar(pendingReward)} ℏ</p>
          <p className="text-xs text-muted-foreground">Pending estimate · Hedera determines the final payout. Network fee applies, capped at 2 ℏ; it may exceed a small reward. No Oreon service fee.</p>
          {result ? (
            <div className="space-y-3" role="status">
              <p className="text-success">{result.paidTinybar === null ? "Account update confirmed. Reward payout is awaiting mirror confirmation." : result.paidTinybar > 0 ? `Claimed ${hbar(result.paidTinybar)} ℏ` : "Account update confirmed. Hedera paid no rewards on this transaction."}</p>
              <Button asChild variant="link"><a href={`${HASHSCAN}/transaction/${result.timestamp ?? result.txId}`} target="_blank" rel="noreferrer">View receipt</a></Button>
              <Button className="w-full" onClick={() => setOpen(false)}>Done</Button>
            </div>
          ) : !canClaimReward(pendingReward) ? (
            <p className="text-sm text-muted-foreground">{pendingReward === undefined ? "Rewards are unavailable. Refresh your balance and try again." : "No rewards available to claim yet."}</p>
          ) : mode.kind === "wallet" ? (
            <Button disabled={busy} className="h-auto w-full whitespace-normal" onClick={() => claim()}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? "Confirming…" : `Approve in ${mode.name}`}</Button>
          ) : mode.kind === "device" ? (
            <div className="space-y-3">
              {bio && <Button className="h-auto w-full whitespace-normal" disabled={busy} onClick={() => claim(true)}><Fingerprint />{busy ? "Confirming…" : "Claim with Face ID / fingerprint"}</Button>}
              {!bio && <p className="text-xs text-muted-foreground">Enable Face ID / fingerprint in Settings to approve claims.</p>}
              <label className="block text-xs text-muted-foreground" htmlFor="reward-passphrase">Device passphrase</label>
              <input id="reward-passphrase" type="password" autoComplete="off" className="field" disabled={busy} value={pass} onChange={(e) => setPass(e.target.value)} />
              <Button className="w-full" variant={bio ? "outline" : "default"} disabled={busy || !pass} onClick={() => claim()}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Claim rewards</Button>
            </div>
          ) : <p className="text-sm text-muted-foreground">This account is watch-only. <Link className="text-signal" to="/wallet">Connect its wallet or import its key</Link> to claim.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}