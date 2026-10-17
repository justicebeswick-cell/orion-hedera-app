import { Panel, Label } from "@/components/aurion";

/** Buy HBAR with a card, Apple Pay, Google Pay or bank transfer.
 * Onramper compares every provider (MoonPay, Banxa, Transak, …) and shows the best rate first. */
export function BuyHbar({ id }: { id: string }) {
  const key = import.meta.env.VITE_ONRAMPER_API_KEY as string | undefined;
  if (!key) return (
    <Panel>
      <Label>Buy HBAR</Label>
      <p className="text-sm text-muted-foreground">Buying with a card or bank isn't switched on yet. It needs a free Onramper key from the app owner.</p>
    </Panel>
  );
  const q = new URLSearchParams({
    apiKey: key, mode: "buy", defaultCrypto: "hbar", onlyCryptos: "hbar", wallets: `hbar:${id}`,
    defaultFiat: "usd", themeName: "dark", primaryColor: "8b5cf6", containerColor: "000000", borderRadius: "1",
  });
  return (
    <Panel>
      <Label>Buy HBAR</Label>
      <p className="mb-3 text-sm text-muted-foreground">Pay by card, Apple Pay, Google Pay or bank. Every provider is compared and the best rate shows first. HBAR lands in {id}.</p>
      <iframe data-no-swipe title="Buy HBAR" src={`https://buy.onramper.com/?${q}`} allow="accelerometer; autoplay; camera; gyroscope; payment; microphone" className="h-[630px] w-full rounded-lg border border-border" />
    </Panel>
  );
}
