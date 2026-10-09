// HBAR → HTS token swaps through the SaucerSwap V1 router on Hedera mainnet.
import { MIRROR } from "./hedera";
import { signMode, deviceKey } from "./signer";

export const ROUTER = "0.0.3045981";
const ROUTER_EVM = "0x00000000000000000000000000000000002e7a5d";
const WHBAR = "0.0.1456986";

export type SwapToken = { id: string; symbol: string; name: string; decimals: number };
export const TOKENS: SwapToken[] = [
  { id: "0.0.456858", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { id: "0.0.731861", symbol: "SAUCE", name: "SaucerSwap", decimals: 6 },
  { id: "0.0.834116", symbol: "HBARX", name: "Staked HBAR (Stader)", decimals: 8 },
];
export const SLIPPAGE = 0.01;

const num = (id: string) => BigInt(id.split(".")[2]);
const word = (n: bigint) => n.toString(16).padStart(64, "0");
const tinybar = (hbar: number) => BigInt(Math.round(hbar * 1e8));

function pathWords(token: string) {
  return word(2n) + word(num(WHBAR)) + word(num(token));
}

/** Expected token output (smallest units) for `hbar` in. */
export async function quote(token: SwapToken, hbar: number): Promise<bigint> {
  const data = "0xd06ca61f" + word(tinybar(hbar)) + word(64n) + pathWords(token.id);
  let r: Response;
  try {
    r = await fetch(`${MIRROR}/api/v1/contracts/call`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data, to: ROUTER_EVM, block: "latest" }),
    });
  } catch { throw new Error("Hedera unreachable"); }
  const j = await r.json();
  if (!j.result) throw new Error("Price quote failed: no pool for this pair");
  return BigInt("0x" + j.result.slice(-64));
}

export const fmtUnits = (v: bigint, d: number) =>
  (Number(v) / 10 ** d).toLocaleString("en-US", { maximumFractionDigits: Math.min(d, 6) });

/** Token balance in smallest units, or null if the account has not added the token. */
export async function tokenBalance(account: string, token: string): Promise<bigint | null> {
  const r = await fetch(`${MIRROR}/api/v1/accounts/${account}/tokens?token.id=${token}`).catch(() => {
    throw new Error("Hedera unreachable");
  });
  if (!r.ok) return null;
  const t = (await r.json()).tokens?.[0];
  return t ? BigInt(t.balance) : null;
}

function swapParams(account: string, token: string, minOut: bigint) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const hex = word(minOut) + word(128n) + word(num(account)) + word(deadline) + pathWords(token);
  return Uint8Array.from(("7ff36ab5" + hex).match(/../g)!.map((b) => parseInt(b, 16)));
}

function wrap(primitive: string, e: unknown): Error {
  const msg = (e as Error)?.message ?? String(e);
  if (/fetch|network|UNAVAILABLE/i.test(msg)) return new Error("Hedera unreachable");
  if (/INSUFFICIENT_PAYER_BALANCE|INSUFFICIENT_ACCOUNT_BALANCE/.test(msg)) return new Error(`${primitive} failed: not enough HBAR`);
  if (/CONTRACT_REVERT/.test(msg)) return new Error(`${primitive} failed: price moved past 1%. Try again.`);
  return new Error(`${primitive} on mainnet failed: ${msg || "rejected in wallet"}`);
}

/** Associate if needed, then swap. Returns the swap transaction id. */
export async function swapHbar(from: string, token: SwapToken, hbar: number, minOut: bigint, passphrase: string) {
  const needsAssoc = (await tokenBalance(from, token.id)) === null;
  const params = swapParams(from, token.id, minOut);
  const mode = signMode(from);

  if (mode.kind === "wallet") {
    const { getWcSigner } = await import("./walletconnect");
    const signer = await getWcSigner(from);
    if (!signer) throw new Error("Wallet session ended. Reconnect your wallet.");
    const h = await import("@hiero-ledger/sdk");
    if (needsAssoc) {
      try {
        const a = await new h.TokenAssociateTransaction().setAccountId(from).setTokenIds([token.id]).setMaxTransactionFee(new h.Hbar(2)).freezeWithSigner(signer);
        const r = await a.executeWithSigner(signer);
        await r.getReceiptWithSigner(signer);
      } catch (e) { throw wrap("Token associate", e); }
    }
    try {
      const tx = await new h.ContractExecuteTransaction()
        .setContractId(ROUTER).setGas(400_000).setPayableAmount(new h.Hbar(hbar))
        .setFunctionParameters(params).setMaxTransactionFee(new h.Hbar(5))
        .freezeWithSigner(signer);
      const r = await tx.executeWithSigner(signer);
      return r.transactionId.toString();
    } catch (e) { throw wrap("Swap", e); }
  }

  const sdk = await import("@hashgraph/sdk");
  const key = await deviceKey(from, passphrase);
  const client = sdk.Client.forMainnet().setOperator(from, key);
  try {
    if (needsAssoc) {
      try {
        const r = await new sdk.TokenAssociateTransaction().setAccountId(from).setTokenIds([token.id]).setMaxTransactionFee(new sdk.Hbar(2)).execute(client);
        await r.getReceipt(client);
      } catch (e) { throw wrap("Token associate", e); }
    }
    try {
      const r = await new sdk.ContractExecuteTransaction()
        .setContractId(ROUTER).setGas(400_000).setPayableAmount(new sdk.Hbar(hbar))
        .setFunctionParameters(params).setMaxTransactionFee(new sdk.Hbar(5))
        .execute(client);
      const rc = await r.getReceipt(client);
      if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
      return r.transactionId.toString();
    } catch (e) { throw wrap("Swap", e); }
  } finally { client.close(); }
}
