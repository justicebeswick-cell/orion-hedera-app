import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Wallet, Unplug, CreditCard } from "lucide-react";
import { useAccount } from "@/lib/account";
import { WC_PROJECT_ID, connectedWallet, walletOptions, connectWallet, disconnectWallet, type WalletOption } from "@/lib/walletconnect";

export function ThirdPartyApps() {
  const { bind } = useAccount();
  const [active, setActive] = useState<ReturnType<typeof connectedWallet>>(null);
  const [options, setOptions] = useState<WalletOption[]>([{ id: "hashpack", name: "HashPack", installed: false }, { id: "blade", name: "Blade", installed: false }]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setActive(connectedWallet()); if (WC_PROJECT_ID) walletOptions().then(setOptions).catch((e) => setError(e instanceof Error ? e.message : "Wallet discovery failed.")); }, []);
  return <div className="divide-y divide-border">
    {active && <div className="flex items-center justify-between gap-3 py-4"><div><p className="text-sm font-semibold">{active.wallet}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{active.id}</p></div><Button variant="ghost" size="icon" aria-label="Disconnect wallet" disabled={!!busy} onClick={async () => { setBusy("disconnect"); try { await disconnectWallet(); setActive(null); } finally { setBusy(""); } }}><Unplug /></Button></div>}
    {options.map((option) => <div key={option.id} className="flex min-h-20 items-center gap-4 py-4"><Wallet size={24} className="text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{option.name}</p><p className="text-xs text-muted-foreground">{option.installed ? "Browser extension" : "WalletConnect"}</p></div><Button variant="outline" size="sm" disabled={!!busy || !WC_PROJECT_ID} onClick={async () => { setBusy(option.name); setError(""); try { const id = await connectWallet(option); bind(id); setActive(connectedWallet()); } catch (e) { setError(e instanceof Error ? e.message : "Connection failed."); } finally { setBusy(""); } }}>{busy === option.name ? "Connecting…" : "Connect"}</Button></div>)}
    {!WC_PROJECT_ID && <p className="py-3 text-xs text-muted-foreground">Wallet connections need a WalletConnect project ID before they can be used.</p>}
    {error && <p role="alert" className="py-3 text-xs text-destructive">{error}</p>}
    <Button asChild variant="ghost" className="h-16 w-full justify-start gap-4 rounded-none px-0"><Link to="/vault" search={{ section: "swap" }}><ArrowLeftRight className="text-primary" />SaucerSwap</Link></Button>
    <Button asChild variant="ghost" className="h-16 w-full justify-start gap-4 rounded-none px-0"><Link to="/vault" search={{ section: "buy" }}><CreditCard className="text-primary" />Buy HBAR</Link></Button>
    <p className="py-4 text-xs text-muted-foreground">Keys stay in the connected wallet. Every transaction still needs your approval there.</p>
  </div>;
}