import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSecurityPreferences, saveSecurityPreferences, type SecurityPreferences } from "@/lib/security-preferences";

export function SecurityOptions() {
  const prefs = useSecurityPreferences();
  return <div>
    <div className="flex min-h-16 items-center justify-between gap-4 text-sm"><span>Auto lock</span><Select value={String(prefs.autoLock)} onValueChange={(value) => saveSecurityPreferences({ autoLock: Number(value) as SecurityPreferences["autoLock"] })}><SelectTrigger aria-label="Auto lock" className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">On app close</SelectItem><SelectItem value="1">1 minute</SelectItem><SelectItem value="5">5 minutes</SelectItem><SelectItem value="15">15 minutes</SelectItem></SelectContent></Select></div>
    <p className="pb-3 text-xs text-muted-foreground">Locks device-key wallets after inactivity. Wallet-app connections use their own signing protection.</p>
    <h2 className="-mx-5 mt-4 bg-secondary px-5 py-3 text-sm font-semibold">Additional security</h2>
    <div className="flex min-h-16 items-center justify-between gap-4 text-sm"><span>Erase data after 10 failed attempts</span><Switch aria-label="Erase data after 10 failed attempts" checked={false} disabled /></div>
    <p className="pb-4 text-xs text-destructive">Automatic erasure is unavailable: it could permanently remove your only wallet key. Your encrypted wallet is never deleted after failed attempts.</p>
    <h2 className="-mx-5 mt-4 bg-secondary px-5 py-3 text-sm font-semibold">Other</h2>
    <div className="flex min-h-16 items-center justify-between gap-4 text-sm"><span>Hide balance</span><Switch aria-label="Hide balance" checked={prefs.hideBalance} onCheckedChange={(hideBalance) => saveSecurityPreferences({ hideBalance })} /></div>
  </div>;
}