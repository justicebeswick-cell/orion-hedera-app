import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage, publicHead } from "@/components/public-site";

export const Route = createFileRoute("/terms")({
  head: () => publicHead("Terms of Service", "HashFolio User Agreement draft: self-custody, lost seed phrase warnings, transaction risks and user responsibilities."),
  component: Terms,
});

function Terms() {
  return <PolicyPage title="Terms of Service / User Agreement" intro="Read the self-custody and transaction warnings carefully. This draft is not yet an effective agreement.">
    <section><h2>1. Self-custody and recovery</h2><p>HashFolio never holds your private keys or seed phrase. You control wallet access and are responsible for keeping your seed phrase, private keys and passphrase safe.</p><p><strong className="text-foreground">Lost seed phrase = potentially lost funds. If you lose your seed phrase and all other valid recovery access, your funds may be permanently inaccessible. HashFolio cannot restore your seed phrase, reset a blockchain private key or recover those funds.</strong></p><p>Anyone with your recovery phrase or private key may be able to move your funds. Never share them with support or an AI tool. Back up recovery information before deleting app data, changing devices or uninstalling.</p></section>
    <section><h2>2. Transactions you approve</h2><p>Check the recipient, network, token, amount and fees before signing. Confirmed blockchain transactions generally cannot be reversed. HashFolio cannot cancel a completed transfer or guarantee recovery from a wrong address, compromised wallet or malicious contract.</p></section>
    <section><h2>3. Asset and network risks</h2><p>Digital assets can lose some or all of their value. Tokens may be fraudulent, illiquid or unsupported by a market. Swaps can incur price impact, slippage, network fees and any service fees shown before approval. Staking rewards are not guaranteed. A displayed quote or balance may be delayed or unavailable.</p></section>
    <section><h2>4. Third-party services</h2><p>Hedera, connected wallets, exchanges, swap protocols and AI services operate separately from HashFolio. Their availability and terms may affect your use. A listed token, exchange or protocol is not an endorsement or guarantee of safety. HashFolio does not provide investment, tax or legal advice.</p></section>
    <section><h2>5. AI and scheduled actions</h2><p>AI output may be inaccurate. Verify addresses, amounts and instructions independently. An AI draft does not replace your approval of a transaction. Scheduled payments and legacy transfers depend on network rules and account conditions; review their status and cancellation options rather than assuming they will execute.</p></section>
    <section><h2>6. Responsible use</h2><p>Use the wallet lawfully and only with accounts you are authorized to access. You are responsible for your own tax and legal obligations. A wallet check or limit does not establish that a transaction meets every legal requirement, and HashFolio does not guarantee sanctions screening.</p></section>
    <section><h2>7. Agreement details awaiting approval</h2><p>The owner must supply the legal contracting entity, contact address, eligibility requirements and applicable jurisdiction. Acceptance procedures, changes, termination, warranties, liability provisions and dispute terms require legal review. This draft does not establish a liability waiver, arbitration requirement or governing law.</p></section>
    <section><h2>8. Contact</h2><p>An official domain-matching contact email must be confirmed before these terms take effect. No one offering support needs your seed phrase or private key.</p></section>
  </PolicyPage>;
}