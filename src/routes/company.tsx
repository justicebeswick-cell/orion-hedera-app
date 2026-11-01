import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { AurionLogo } from "@/components/aurion";
import { PublicSite, publicHead } from "@/components/public-site";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/company")({
  head: () => publicHead("Company", "HashKey, a self-custody wallet for Hedera mainnet. Company information, wallet policies and recovery warnings."),
  component: Company,
});

function Company() {
  return <PublicSite>
    <section className="relative border-b pb-12">
      <AurionLogo className="mb-6 h-28 w-28" />
      <h1 className="font-display text-6xl sm:text-7xl">HashKey</h1>
      <p className="mt-5 max-w-xl text-xl leading-8 text-muted-foreground">A self-custody wallet for Hedera mainnet.</p>
      <p className="mt-4 max-w-xl leading-7 text-muted-foreground">Hold HBAR and tokens. Send, swap and stake with transactions you approve.</p>
      <Button asChild className="mt-8"><Link to="/">Open wallet <ArrowUpRight size={16} /></Link></Button>
    </section>
    <section className="grid gap-8 border-b py-10 sm:grid-cols-2">
      <div><h2 className="text-2xl font-display">Your keys. Your responsibility.</h2><p className="mt-4 leading-7 text-muted-foreground">HashKey never holds your private keys or seed phrase. Losing your seed phrase and all other recovery access can permanently mean losing your funds. HashKey cannot recover them.</p></div>
      <div><h2 className="text-2xl font-display">Policies</h2><div className="mt-4 flex flex-col items-start gap-4 text-signal"><Link to="/privacy">Privacy Policy →</Link><Link to="/terms">Terms of Service / User Agreement →</Link></div><p className="mt-4 text-sm leading-6 text-muted-foreground">Owner review drafts. Not yet effective.</p></div>
    </section>
    <section className="py-10"><h2 className="text-2xl font-display">Company & contact</h2><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Legal company details and an official domain-matching support email are pending confirmation. No public support mailbox is available on this page yet.</p><p className="mt-4 text-sm text-signal">Never share your seed phrase, private key or device passphrase with anyone claiming to be support.</p></section>
  </PublicSite>;
}