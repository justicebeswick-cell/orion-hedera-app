import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Panel, Label, SignButton } from "@/components/aurion";
import { ACCOUNT_RE } from "@/lib/hedera";
import { useAccount } from "@/lib/account";
import { armSwitch, deleteSchedule } from "@/lib/signer";
import { audit } from "@/lib/guard";

export const Route = createFileRoute("/legacy")({
  head: () => ({
    meta: [
      { title: "Legacy — HashFolio" },
      { name: "description", content: "Pick one person to receive your HBAR if you stop checking in for 30 days." },
      { property: "og:title", content: "Legacy — HashFolio" },
      { property: "og:description", content: "Hold it. A 30-day check-in switch for one heir on Hedera mainnet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Legacy,
});

type Armed = { scheduleId: string; heir: string; amount: number; expiry: string };
const KEY = "aurion.legacy";
const DAYS = 30;

function Legacy() {
  const { id } = useAccount();
  const [heir, setHeir] = useState("");
  const [amount, setAmount] = useState("");
  const [armed, setArmed] = useState<Armed | null>(null);
  useEffect(() => { try { setArmed(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { /* none */ } }, []);
  const save = (a: Armed | null) => { a ? localStorage.setItem(KEY, JSON.stringify(a)) : localStorage.removeItem(KEY); setArmed(a); };
  const ready = !!id && ACCOUNT_RE.test(heir.trim()) && Number(amount) > 0 && heir.trim() !== id;
  const daysLeft = armed ? Math.max(0, Math.ceil((new Date(armed.expiry).getTime() - Date.now()) / 86_400_000)) : 0;

  return (
    <Shell title="Legacy">
      <Panel>
        <Label>What the switch does</Label>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>You choose one person (your heir) and an amount of HBAR.</li>
          <li>Hedera holds an instruction: "in {DAYS} days, send this HBAR to my heir."</li>
          <li>Each time you tap <span className="text-foreground">Check in</span>, the clock restarts at {DAYS} days.</li>
          <li>If you stop checking in, the payment goes out on its own — even if HashFolio is gone.</li>
          <li>Keep the HBAR in your account. If the balance is too low on the day, the payment fails.</li>
        </ul>
      </Panel>

      {armed ? (
        <Panel className="mt-4">
          <Label>Switch is on</Label>
          <p className="text-3xl font-semibold tnum">{daysLeft} days left</p>
          <p className="mt-1 text-sm text-muted-foreground tnum">
            {armed.amount} ℏ goes to <span className="font-mono">{armed.heir}</span> on {new Date(armed.expiry).toLocaleDateString()} unless you check in.
          </p>
          <p className="mt-1 font-mono text-xs text-signal">Schedule {armed.scheduleId}</p>
          <div className="mt-4">
            <SignButton accountId={id} verb={`Check in — restart ${DAYS} days`} run={async (pass) => {
              await deleteSchedule(id!, armed.scheduleId, pass);
              const r = await armSwitch(id!, armed.heir, armed.amount, DAYS, pass);
              save({ ...armed, scheduleId: r.scheduleId, expiry: r.expiry });
              audit({ action: "legacy", detail: `Check in · ${r.scheduleId}`, ok: true, txId: r.txId });
              return r.txId;
            }} done={() => <p className="font-semibold text-success">Checked in. {DAYS} days on the clock.</p>} />
          </div>
          <div className="mt-3">
            <SignButton accountId={id} verb="Turn off the switch" run={async (pass) => {
              await deleteSchedule(id!, armed.scheduleId, pass);
              audit({ action: "legacy", detail: `Disarmed · ${armed.scheduleId}`, ok: true });
              save(null);
              return armed.scheduleId;
            }} done={() => <p className="font-semibold">Switch off. Nothing will be sent.</p>} />
          </div>
        </Panel>
      ) : (
        <Panel className="mt-4">
          <Label>Set it up</Label>
          <p className="mb-1 text-sm">Who gets it?</p>
          <input className="field font-mono tnum" placeholder="Their Hedera account, like 0.0.12345" value={heir} onChange={(e) => setHeir(e.target.value)} />
          <p className="mb-1 mt-4 text-sm">How much HBAR?</p>
          <input className="field tnum" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="mt-4 text-xs text-muted-foreground">
            If you don't check in for {DAYS} days, {amount || "this amount"} ℏ goes to {heir || "your heir"}. Small network fee to set up (under 1 ℏ).
          </p>
          <div className="mt-4">
            {!id ? (
              <p className="text-sm text-muted-foreground"><Link to="/wallet" className="text-signal">Create or connect a wallet</Link> first.</p>
            ) : (
              <SignButton accountId={id} disabled={!ready} verb="Turn on the switch" run={async (pass) => {
                const r = await armSwitch(id, heir.trim(), Number(amount), DAYS, pass);
                save({ scheduleId: r.scheduleId, heir: heir.trim(), amount: Number(amount), expiry: r.expiry });
                audit({ action: "legacy", detail: `Armed ${amount} ℏ → ${heir.trim()} · ${r.scheduleId}`, ok: true, txId: r.txId });
                return r.txId;
              }} done={() => <p className="font-semibold text-success">Switch on. {DAYS} days on the clock.</p>} />
            )}
          </div>
        </Panel>
      )}
    </Shell>
  );
}
