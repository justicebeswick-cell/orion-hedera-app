import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roundOn, setRound } from "@/lib/display";
import { savePreferences, usePreferences, type Preferences } from "@/lib/preferences";
import { Check } from "lucide-react";

export function GeneralSettings() {
  const prefs = usePreferences();
  const [round, setRounded] = useState(false);
  useEffect(() => setRounded(roundOn()), []);
  const toggle = (label: string, key: keyof Preferences) => <div className="flex min-h-16 items-center justify-between gap-5 py-3"><span className="text-sm">{label}</span><Switch aria-label={label} checked={Boolean(prefs[key])} onCheckedChange={(value) => savePreferences({ [key]: value })} /></div>;
  const heading = (label: string) => <h2 className="-mx-5 mt-5 bg-secondary px-5 py-3 text-sm font-semibold">{label}</h2>;
  return <div className="divide-y divide-border/50">
    <div className="flex min-h-16 items-center justify-between gap-5"><span className="text-sm">Language</span><span className="text-sm text-muted-foreground">English</span></div>
    <p className="py-2 text-xs text-muted-foreground">The interface is currently available in English.</p>
    <div className="flex min-h-16 items-center justify-between gap-5"><span className="text-sm">Currency</span><Select value={prefs.currency} onValueChange={(currency) => savePreferences({ currency })}><SelectTrigger aria-label="Currency" className="w-28"><SelectValue /></SelectTrigger><SelectContent>{["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent></Select></div>
    {toggle("Use system currency format", "systemFormat")}
    <div className="flex min-h-16 items-center justify-between gap-5 py-3"><span className="text-sm">Hide decimals</span><Switch aria-label="Hide decimals" checked={round} onCheckedChange={(value) => { setRound(value); setRounded(value); }} /></div>
    {heading("Home Screen")}
    {toggle('“HBAR worth” on home screen', "showWorth")}
    {toggle("Show asset prices on home screen", "showPrices")}
    {toggle("Show reserve value on home screen", "showReserve")}
    {heading("Theme")}
    {toggle("Automatically switch light/dark mode", "autoTheme")}
    <div className="space-y-2 py-3" role="radiogroup" aria-label="Theme">
      {[{ id: "default", label: "Default", note: "Fresh and bright" }, { id: "dark", label: "Dark", note: "Black with Orion purple" }, { id: "moonlight", label: "Moonlight", note: "A touch of moon" }, { id: "royal", label: "Royal", note: "Royal purple" }].map((theme) => <Button key={theme.id} variant="outline" role="radio" aria-checked={prefs.theme === theme.id} disabled={prefs.autoTheme} onClick={() => savePreferences({ theme: theme.id })} className={`h-20 w-full justify-start gap-4 rounded-lg px-4 ${prefs.theme === theme.id ? "border-primary ring-1 ring-primary" : ""}`}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-foreground">{prefs.theme === theme.id && <Check size={13} />}</span><span className="flex-1 text-left"><span className="block text-sm font-semibold">{theme.label}</span><span className="block text-xs text-muted-foreground">{theme.note}</span></span><span className={`theme-swatch theme-swatch-${theme.id}`}>Aa</span></Button>)}
    </div>
    {heading("Transactions & Events")}
    {toggle("Hide spam/scam events", "hideSpam")}
    <p className="py-2 text-xs text-muted-foreground">Hides incoming transfers from accounts on your blocked list. This is not live scam screening.</p>
    {toggle("Hide Service Fee events", "hideFees")}
    {heading("Miscellaneous")}
    {toggle("Haptic feedback", "haptics")}
    <p className="py-2 text-xs text-muted-foreground">Vibration depends on your device. iPhone browsers may not support it.</p>
  </div>;
}