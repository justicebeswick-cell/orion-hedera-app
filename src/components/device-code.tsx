import { useState } from "react";
import { Button } from "@/components/ui/button";
import { checkDeviceCode } from "@/lib/passphrase";

export function DeviceCode({ busy, cta, onSubmit }: { busy: boolean; cta: string; onSubmit: (code: string, biometric: boolean) => void }) {
  const [length, setLength] = useState<4 | 6 | 8>(6);
  const [code, setCode] = useState("");
  const [repeat, setRepeat] = useState("");
  const [biometric, setBiometric] = useState(false);
  const strength = checkDeviceCode(code);
  return <div className="mt-5 space-y-3">
    <p className="text-sm font-medium">Set your device code</p>
    <div className="grid grid-cols-3 gap-2" aria-label="Code length">
      {([4, 6, 8] as const).map((n) => <Button key={n} variant={length === n ? "default" : "outline"} onClick={() => { setLength(n); setCode(""); setRepeat(""); }} aria-pressed={length === n}>{n} digits</Button>)}
    </div>
    <input type="password" inputMode="numeric" autoComplete="new-password" className="field tnum" aria-label="New device code" placeholder={`${length}-digit code`} maxLength={length} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
    {code && <div aria-live="polite"><div className="flex gap-1">{[1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= strength.score ? strength.ok ? "bg-primary" : "bg-destructive" : "bg-muted"}`} />)}</div><p className={`mt-1 text-xs ${strength.ok ? "text-muted-foreground" : "text-destructive"}`}>{strength.reason ?? strength.label}</p></div>}
    <input type="password" inputMode="numeric" autoComplete="new-password" className="field tnum" aria-label="Repeat device code" placeholder="Repeat code" maxLength={length} value={repeat} onChange={(e) => setRepeat(e.target.value.replace(/\D/g, ""))} />
    {repeat && repeat !== code && <p className="text-xs text-destructive">Codes don’t match.</p>}
    <p className="text-xs text-muted-foreground">{length === 4 ? "Four digits are easier to guess if someone copies your device data. Eight digits are safer." : "Your code encrypts the key on this device. Eight digits offer more protection."}</p>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={biometric} onChange={(e) => setBiometric(e.target.checked)} className="accent-primary" /> Enable Face ID / fingerprint</label>
    <Button className="w-full" disabled={busy || code.length !== length || !strength.ok || code !== repeat} onClick={() => onSubmit(code, biometric)}>{busy ? "Securing wallet…" : cta}</Button>
  </div>;
}