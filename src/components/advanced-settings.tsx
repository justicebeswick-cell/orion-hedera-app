import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, Copy } from "lucide-react";
import { MIRROR, getLag } from "@/lib/hedera";
import { readAudit } from "@/lib/guard";

export function AdvancedSettings() {
  const [device, setDevice] = useState("");
  const [developer, setDeveloper] = useState(false);
  const [section, setSection] = useState("");
  const [notification, setNotification] = useState("");
  const [network, setNetwork] = useState("");
  useEffect(() => { let id = localStorage.getItem("aurion.deviceId"); if (!id) { id = crypto.randomUUID(); localStorage.setItem("aurion.deviceId", id); } setDevice(id); setDeveloper(localStorage.getItem("aurion.developer") === "1"); }, []);
  const heading = (name: string) => <h2 className="-mx-5 mt-5 bg-secondary px-5 py-3 text-sm font-semibold">{name}</h2>;
  const row = (name: string, onClick: () => void) => <Button variant="ghost" className="h-16 w-full justify-between rounded-none px-0 text-sm" onClick={onClick}>{name}<ChevronRight size={18} /></Button>;
  return <div>
    {heading("Networks")}
    {row("Network settings", () => setSection(section === "network" ? "" : "network"))}
    {section === "network" && <div className="space-y-3 border-b border-border pb-4 text-xs"><p>Hedera mainnet only</p><p className="break-all text-muted-foreground">{MIRROR}</p><Button variant="outline" size="sm" onClick={async () => { setNetwork("Checking…"); try { const lag = await getLag(); setNetwork(`Mirror delay: ${Math.round(lag)} seconds`); } catch { setNetwork("Hedera unreachable."); } }}>Check connection</Button><p role="status">{network}</p></div>}
    {heading("Push Notifications")}
    {row("Re-register notifications", async () => { if (!("Notification" in window)) { setNotification("Notifications are not supported in this browser."); return; } try { const permission = await Notification.requestPermission(); setNotification(permission === "granted" ? "Permission granted. Background wallet alerts are not connected yet." : "Notification permission was not granted."); } catch { setNotification("Notifications are unavailable on this device."); } })}
    <p className="text-xs text-muted-foreground">Background push delivery is not available yet.</p>
    {notification && <p role="status" className="mt-2 text-xs">{notification}</p>}
    {heading("Release Information")}
    <div className="flex min-h-16 items-center justify-between text-sm"><span>Version</span><span className="text-xs text-muted-foreground">Orion web · icons v25</span></div>
    {row("View changelog", () => setSection(section === "changes" ? "" : "changes"))}
    {section === "changes" && <ul className="space-y-2 pb-4 text-xs text-muted-foreground"><li>Grouped Settings and Pact in Vault</li><li>General display preferences and optional themes</li><li>Address book, Advanced and Security controls</li><li>Hedera NFT viewing and approved transfers</li></ul>}
    {heading("Debug")}
    <div className="flex min-h-20 items-center gap-3 text-sm"><span className="shrink-0">Device ID</span><span className="min-w-0 flex-1 break-all font-mono text-[10px] text-muted-foreground">{device}</span><Button variant="ghost" size="icon" aria-label="Copy device ID" onClick={() => navigator.clipboard.writeText(device)}><Copy size={16} /></Button></div>
    <div className="flex min-h-16 items-center justify-between text-sm"><span>Developer mode</span><Switch aria-label="Developer mode" checked={developer} onCheckedChange={(on) => { setDeveloper(on); localStorage.setItem("aurion.developer", on ? "1" : "0"); }} /></div>
    {developer && <p className="pb-3 text-xs text-muted-foreground">Local diagnostics only. Mainnet, encryption and signing checks remain enforced.</p>}
    {row("Session Log", () => setSection(section === "log" ? "" : "log"))}
    {section === "log" && <div className="divide-y divide-border text-xs">{readAudit().length === 0 ? <p className="py-3 text-muted-foreground">No recorded actions.</p> : readAudit().slice(0, 30).map((entry, i) => <div key={i} className="flex justify-between gap-3 py-3"><span>{entry.action}</span><span className={entry.ok ? "text-success" : "text-destructive"}>{entry.ok ? "Completed" : "Failed"}</span><time className="text-muted-foreground">{new Date(entry.at).toLocaleTimeString()}</time></div>)}</div>}
  </div>;
}