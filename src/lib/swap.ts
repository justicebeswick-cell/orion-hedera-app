// Swaps on SaucerSwap V1 (Hedera mainnet): HBAR↔token and token↔token, routed through WHBAR.
import { MIRROR } from "./hedera";
import { signMode, deviceKey } from "./signer";

export const ROUTER = "0.0.3045981";
const ROUTER_EVM = "0x00000000000000000000000000000000002e7a5d";
const WHBAR = "0.0.1456986";
export const TREASURY = "0.0.10898196";
export const SERVICE_FEE = 0.005; // 0.5%, paid in HBAR
export const LP_FEE = 0.003; // per pool hop

export type SwapToken = { id: string; symbol: string; name: string; decimals: number; icon?: string | undefined; verified?: boolean; liquidity?: number };
export const HBAR: SwapToken = { id: "HBAR", symbol: "HBAR", name: "Hedera", decimals: 8, verified: true };
const isH = (t: SwapToken) => t.id === "HBAR";

type PoolSide = { id: string; icon?: string; name: string; decimals: number; symbol: string; dueDiligenceComplete: boolean; isFeeOnTransferToken: boolean };
type Pool = { tokenA: PoolSide; tokenB: PoolSide; tokenReserveA: string; tokenReserveB: string };

/** Every HTS token with an HBAR pool on SaucerSwap, deepest pools first. */
export async function listTokens(): Promise<SwapToken[]> {
  let r: Response;
  try { r = await fetch("https://api.saucerswap.finance/pools"); } catch { throw new Error("SaucerSwap unreachable"); }
  if (!r.ok) throw new Error(`SaucerSwap returned ${r.status}`);
  const pools: Pool[] = await r.json();
  const out = new Map<string, SwapToken>();
  for (const p of pools) {
    const aW = p.tokenA.id === WHBAR, bW = p.tokenB.id === WHBAR;
    if (aW === bW) continue;
    const t = aW ? p.tokenB : p.tokenA;
    const hbarRes = Number(aW ? p.tokenReserveA : p.tokenReserveB) / 1e8;
    if (t.isFeeOnTransferToken || hbarRes < 100) continue;
    const prev = out.get(t.id);
    if (prev && (prev.liquidity ?? 0) >= hbarRes) continue;
    out.set(t.id, { id: t.id, symbol: t.symbol, name: t.name, decimals: t.decimals, icon: t.icon, verified: t.dueDiligenceComplete, liquidity: hbarRes });
  }
  return [HBAR, ...[...out.values()].sort((a, b) => (b.liquidity ?? 0) - (a.liquidity ?? 0))];
}

const num = (id: string) => BigInt(id.split(".")[2] ?? "0");
const word = (n: bigint) => n.toString(16).padStart(64, "0");
const bytes = (hex: string) => Uint8Array.from(hex.match(/../g)!.map((b) => parseInt(b, 16)));

export function pathOf(from: SwapToken, to: SwapToken): string[] {
  if (isH(from)) return [WHBAR, to.id];
  if (isH(to)) return [from.id, WHBAR];
  return [from.id, WHBAR, to.id];
}
const pathWords = (p: string[]) => word(BigInt(p.length)) + p.map((id) => word(num(id))).join("");

/** Decimal string → smallest units. */
export function toUnits(v: string, d: number): bigint {
  const m = v.trim().match(/^(\d*)(?:\.(\d*))?$/);
  if (!m || (!m[1] && !m[2])) return 0n;
  const frac = (m[2] ?? "").slice(0, d).padEnd(d, "0");
  return BigInt((m[1] || "0") + frac);
}
export const fmtUnits = (v: bigint, d: number, max = 6) =>
  (Number(v) / 10 ** d).toLocaleString("en-US", { maximumFractionDigits: Math.min(d, max) });

async function amountsOut(amountIn: bigint, path: string[]): Promise<bigint[]> {
  const data = "0xd06ca61f" + word(amountIn) + word(64n) + pathWords(path);
  let r: Response;
  try {
    r = await fetch(`${MIRROR}/api/v1/contracts/call`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ data, to: ROUTER_EVM, block: "latest" }),
    });
  } catch { throw new Error("Hedera unreachable"); }
  const j = await r.json();
  if (!j.result) throw new Error("Price quote failed: not enough liquidity for this pair");
  const h: string = j.result.slice(2);
  const n = Number(BigInt("0x" + h.slice(64, 128)));
  return Array.from({ length: n }, (_, i) => BigInt("0x" + h.slice(128 + i * 64, 192 + i * 64)));
}

export type Quote = { amountIn: bigint; out: bigint; hbarValue: bigint; fee: bigint; impact: number; hops: number };

/** Live quote with price impact and the HBAR service fee. */
export async function quote(from: SwapToken, to: SwapToken, amountIn: bigint): Promise<Quote> {
  const path = pathOf(from, to);
  const small = amountIn / 1000n > 0n ? amountIn / 1000n : 1n;
  const [a, s] = await Promise.all([amountsOut(amountIn, path), amountsOut(small, path)]);
  const out = a[a.length - 1]!;
  const spot = Number(s[s.length - 1]!) / Number(small);
  const impact = spot > 0 ? Math.max(0, 1 - Number(out) / Number(amountIn) / spot) : 0;
  const hbarValue = isH(from) ? amountIn : a[1]!;
  const fee = (hbarValue * BigInt(Math.round(SERVICE_FEE * 10000))) / 10000n;
  return { amountIn, out, hbarValue, fee, impact, hops: path.length - 1 };
}

/** Balance in smallest units; null means the account has not added the token. */
export async function tokenBalance(account: string, token: SwapToken): Promise<bigint | null> {
  if (isH(token)) {
    const r = await fetch(`${MIRROR}/api/v1/accounts/${account}?limit=1`).catch(() => { throw new Error("Hedera unreachable"); });
    return r.ok ? BigInt((await r.json()).balance.balance) : 0n;
  }
  const r = await fetch(`${MIRROR}/api/v1/accounts/${account}/tokens?token.id=${token.id}`).catch(() => { throw new Error("Hedera unreachable"); });
  if (!r.ok) return null;
  const t = (await r.json()).tokens?.[0];
  return t ? BigInt(t.balance) : null;
}

function wrap(primitive: string, e: unknown): Error {
  const msg = (e as Error)?.message ?? String(e);
  if (/fetch|network|UNAVAILABLE/i.test(msg)) return new Error("Hedera unreachable");
  if (/INSUFFICIENT_PAYER_BALANCE|INSUFFICIENT_ACCOUNT_BALANCE/.test(msg)) return new Error(`${primitive} failed: not enough HBAR`);
  if (/INSUFFICIENT_TOKEN_BALANCE/.test(msg)) return new Error(`${primitive} failed: not enough tokens`);
  if (/CONTRACT_REVERT/.test(msg)) return new Error(`${primitive} failed: price moved past your slippage. Try again.`);
  if (/INSUFFICIENT_GAS/.test(msg)) return new Error(`${primitive} failed: ran out of gas`);
  return new Error(`${primitive} on mainnet failed: ${msg || "rejected in wallet"}`);
}

export type Step = "approve" | "associate" | "swap" | "fee" | "done";

/**
 * Run a swap: approve (token in), associate (token out), swap, then pay the HBAR service fee.
 * Returns the swap transaction id and the fee transaction id.
 */
export async function executeSwap(
  from: string, tIn: SwapToken, tOut: SwapToken, q: Quote, slippage: number, passphrase: string,
  onStep: (s: Step) => void = () => {},
) {
  const path = pathOf(tIn, tOut);
  const minOut = (q.out * BigInt(Math.round((1 - slippage) * 10000))) / 10000n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const to = word(num(from));
  let fn: string, payable = 0n;
  if (isH(tIn)) { fn = "7ff36ab5" + word(minOut) + word(128n) + to + word(deadline) + pathWords(path); payable = q.amountIn; }
  else if (isH(tOut)) fn = "18cbafe5" + word(q.amountIn) + word(minOut) + word(160n) + to + word(deadline) + pathWords(path);
  else fn = "38ed1739" + word(q.amountIn) + word(minOut) + word(160n) + to + word(deadline) + pathWords(path);
  const params = bytes(fn);
  const gas = q.hops > 1 ? 900_000 : isH(tIn) ? 400_000 : 600_000;
  const needsAssoc = !isH(tOut) && (await tokenBalance(from, tOut)) === null;
  const chargeFee = from !== TREASURY && q.fee > 0n;

  // Same steps for both SDKs; `s` is either @hiero-ledger/sdk (wallet) or @hashgraph/sdk (device key).
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const steps = (s: any) => ({
    approve: () => new s.AccountAllowanceApproveTransaction().approveTokenAllowance(tIn.id, from, ROUTER, q.amountIn.toString()).setMaxTransactionFee(new s.Hbar(2)),
    associate: () => new s.TokenAssociateTransaction().setAccountId(from).setTokenIds([tOut.id]).setMaxTransactionFee(new s.Hbar(2)),
    swap: () => new s.ContractExecuteTransaction().setContractId(ROUTER).setGas(gas)
      .setPayableAmount(s.Hbar.fromTinybars(payable.toString())).setFunctionParameters(params).setMaxTransactionFee(new s.Hbar(10)),
    fee: () => new s.TransferTransaction()
      .addHbarTransfer(from, s.Hbar.fromTinybars((-q.fee).toString()))
      .addHbarTransfer(TREASURY, s.Hbar.fromTinybars(q.fee.toString()))
      .setTransactionMemo("aurion:v1 swap fee").setMaxTransactionFee(new s.Hbar(1)),
  });

  let run: (tx: any) => Promise<string>;
  let close = () => {};
  let b: ReturnType<typeof steps>;
  if (signMode(from).kind === "wallet") {
    const { getWcSigner } = await import("./walletconnect");
    const signer = await getWcSigner(from);
    if (!signer) throw new Error("Wallet session ended. Reconnect your wallet.");
    const h = await import("@hiero-ledger/sdk");
    b = steps(h);
    run = async (tx) => {
      const r = await (await tx.freezeWithSigner(signer)).executeWithSigner(signer);
      const rc = await r.getReceiptWithSigner(signer);
      if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
      return r.transactionId.toString();
    };
  } else {
    const sdk = await import("@hashgraph/sdk");
    const key = await deviceKey(from, passphrase);
    const client = sdk.Client.forMainnet().setOperator(from, key);
    close = () => client.close();
    b = steps(sdk);
    run = async (tx) => {
      const r = await tx.execute(client);
      const rc = await r.getReceipt(client);
      if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
      return r.transactionId.toString();
    };
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  try {
    if (!isH(tIn)) { onStep("approve"); try { await run(b.approve()); } catch (e) { throw wrap("Token allowance", e); } }
    if (needsAssoc) { onStep("associate"); try { await run(b.associate()); } catch (e) { throw wrap("Token associate", e); } }
    onStep("swap");
    let swapTx: string;
    try { swapTx = await run(b.swap()); } catch (e) { throw wrap("Swap", e); }
    let feeTx: string | null = null;
    if (chargeFee) { onStep("fee"); try { feeTx = await run(b.fee()); } catch { feeTx = null; } }
    onStep("done");
    return { swapTx, feeTx };
  } finally { close(); }
}
