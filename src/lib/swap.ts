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
type Pool = { tokenA: PoolSide; tokenB: PoolSide; tokenReserveA: string; tokenReserveB: string; lpTokenReserve?: string; lpToken?: { priceUsd?: string } };

// Hub tokens used to route between any two tokens: WHBAR, USDC, SAUCE, HBARX.
const HUBS = [WHBAR, "0.0.456858", "0.0.731861", "0.0.834116"];
let graph: Map<string, Set<string>> | null = null;
let meta = new Map<string, { symbol: string }>();

/** Every HTS token that has a live SaucerSwap pool — directly or through a hub — deepest first. */
export async function listTokens(): Promise<SwapToken[]> {
  let r: Response;
  try { r = await fetch("https://api.saucerswap.finance/pools"); } catch { throw new Error("SaucerSwap unreachable"); }
  if (!r.ok) throw new Error(`SaucerSwap returned ${r.status}`);
  const pools: Pool[] = await r.json();
  const g = new Map<string, Set<string>>();
  const out = new Map<string, SwapToken>();
  const m = new Map<string, { symbol: string }>([["HBAR", { symbol: "HBAR" }], [WHBAR, { symbol: "HBAR" }]]);
  for (const p of pools) {
    if (p.tokenA.isFeeOnTransferToken || p.tokenB.isFeeOnTransferToken) continue;
    if (p.tokenReserveA === "0" || p.tokenReserveB === "0") continue;
    const tvl = (Number(p.lpTokenReserve ?? 0) / 1e8) * Number(p.lpToken?.priceUsd ?? 0);
    const [a, b] = [p.tokenA.id, p.tokenB.id];
    if (!g.has(a)) g.set(a, new Set()); if (!g.has(b)) g.set(b, new Set());
    g.get(a)?.add(b); g.get(b)?.add(a);
    for (const t of [p.tokenA, p.tokenB]) {
      if (t.id === WHBAR) continue;
      m.set(t.id, { symbol: t.symbol });
      const prev = out.get(t.id);
      if (prev && (prev.liquidity ?? 0) >= tvl) continue;
      out.set(t.id, { id: t.id, symbol: t.symbol, name: t.name, decimals: t.decimals, icon: t.icon, verified: !!t.dueDiligenceComplete, liquidity: tvl });
    }
  }
  graph = g; meta = m;
  // Keep isolated active markets too: two HTS tokens can trade without an HBAR route.
  return [HBAR, ...[...out.values()].sort((a, b) => (b.liquidity ?? 0) - (a.liquidity ?? 0))];
}

const num = (id: string) => BigInt(id.split(".")[2] ?? "0");
const word = (n: bigint) => n.toString(16).padStart(64, "0");
const bytes = (hex: string) => Uint8Array.from((hex.match(/../g) ?? []).map((b) => parseInt(b, 16)));

const pid = (t: SwapToken) => (isH(t) ? WHBAR : t.id);

/** Candidate routes: direct, through one hub, or through two hubs. */
export async function routesOf(from: SwapToken, to: SwapToken): Promise<string[][]> {
  if (!graph) await listTokens();
  const g = graph;
  if (!g) throw new Error("Token markets unavailable. Refresh and try again.");
  const A = pid(from), B = pid(to);
  if (A === B) return [];
  const has = (x: string, y: string) => !!g.get(x)?.has(y);
  const out: string[][] = [];
  if (has(A, B)) out.push([A, B]);
  for (const h of HUBS) if (h !== A && h !== B && has(A, h) && has(h, B)) out.push([A, h, B]);
  if (out.length < 2) for (const h1 of HUBS) for (const h2 of HUBS)
    if (h1 !== h2 && ![A, B].includes(h1) && ![A, B].includes(h2) && has(A, h1) && has(h1, h2) && has(h2, B)) out.push([A, h1, h2, B]);
  const p = bfs(g, A, B);
  if (p && !out.some((r) => r.join() === p.join())) out.unshift(p);
  // Include non-hub alternatives even when a hub market exists.
  let frontier = [[A]];
  for (let depth = 0; depth < 4 && frontier.length && out.length < 16; depth++) {
    const next: string[][] = [];
    for (const route of frontier) {
      const last = route[route.length - 1];
      if (!last) continue;
      for (const neighbor of g.get(last) ?? []) {
        if (route.includes(neighbor)) continue;
        const candidate = [...route, neighbor];
        if (neighbor === B) {
          if (!out.some((r) => r.join() === candidate.join())) out.push(candidate);
        } else if (next.length < 1000) next.push(candidate);
      }
    }
    frontier = next;
  }
  return out.slice(0, 16);
}

/** Shortest pool route (up to 4 hops) for tokens that don't touch a hub. */
function bfs(g: Map<string, Set<string>>, A: string, B: string): string[] | null {
  const prev = new Map<string, string>([[A, ""]]);
  let front = [A];
  for (let d = 0; d < 4 && front.length; d++) {
    const next: string[] = [];
    for (const x of front) for (const y of g.get(x) ?? []) {
      if (prev.has(y)) continue;
      prev.set(y, x);
      if (y === B) { const p = [B]; let c = x; while (c) { p.unshift(c); c = prev.get(c) ?? ""; } return p; }
      next.push(y);
    }
    front = next;
  }
  return null;
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
  fmtAmount(Number(v) / 10 ** d, { maximumFractionDigits: Math.min(d, max) });

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
  if (!j.result) throw new Error("Price quote failed: not enough liquidity for this amount");
  const h: string = j.result.slice(2);
  const n = Number(BigInt("0x" + h.slice(64, 128)));
  return Array.from({ length: n }, (_, i) => BigInt("0x" + h.slice(128 + i * 64, 192 + i * 64)));
}

export type Quote = { amountIn: bigint; out: bigint; hbarValue: bigint; fee: bigint; impact: number; hops: number; path: string[]; route: string[] };

async function best(amountIn: bigint, routes: string[][]) {
  const res = await Promise.all(routes.map((p) => amountsOut(amountIn, p).then((a) => ({ p, a })).catch(() => null)));
  let top: { p: string[]; a: bigint[] } | null = null;
  for (const r of res) {
    const value = r?.a.at(-1);
    if (r && value !== undefined && value > 0n && (!top || value > (top.a.at(-1) ?? 0n))) top = r;
  }
  return top;
}

/** Live quote over the best route, with price impact and the HBAR service fee. */
export async function quote(from: SwapToken, to: SwapToken, amountIn: bigint): Promise<Quote> {
  if (amountIn <= 0n) throw new Error("Enter an amount greater than zero.");
  const routes = await routesOf(from, to);
  if (!routes.length) throw new Error(`Price quote failed: no SaucerSwap route between ${from.symbol} and ${to.symbol}`);
  const top = await best(amountIn, routes);
  if (!top) throw new Error("Price quote failed: not enough liquidity for this amount");
  const path = top.p, a = top.a;
  const out = a.at(-1);
  if (out === undefined || out <= 0n) throw new Error("Price quote failed: this amount is too small for the market.");
  const small = amountIn / 1000n > 0n ? amountIn / 1000n : 1n;
  const s = await amountsOut(small, path).catch(() => null);
  const spot = s ? Number(s.at(-1) ?? 0n) / Number(small) : 0;
  const impact = spot > 0 ? Math.max(0, 1 - Number(out) / Number(amountIn) / spot) : 0;
  let hbarValue = 0n;
  const wi = path.indexOf(WHBAR);
  if (isH(from)) hbarValue = amountIn;
  else if (wi >= 0) hbarValue = a[wi] ?? 0n;
  else { const h = await best(amountIn, await routesOf(from, HBAR)).catch(() => null); hbarValue = h?.a.at(-1) ?? 0n; }
  const fee = (hbarValue * BigInt(Math.round(SERVICE_FEE * 10000))) / 10000n;
  const route = path.map((id) => meta.get(id)?.symbol ?? id);
  return { amountIn, out, hbarValue, fee, impact, hops: path.length - 1, path, route };
}

/** Balance in smallest units; null means the account has not added the token. */
export async function tokenBalance(account: string, token: SwapToken): Promise<bigint | null> {
  if (isH(token)) {
    const r = await fetch(`${MIRROR}/api/v1/accounts/${account}?limit=1`).catch(() => { throw new Error("Hedera unreachable"); });
    if (!r.ok) throw new Error(`Balance lookup failed: Hedera returned ${r.status}. Try again.`);
    return BigInt((await r.json()).balance.balance);
  }
  const r = await fetch(`${MIRROR}/api/v1/accounts/${account}/tokens?token.id=${token.id}`).catch(() => { throw new Error("Hedera unreachable"); });
  if (!r.ok) throw new Error(`Token lookup failed: Hedera returned ${r.status}. Try again.`);
  const t = (await r.json()).tokens?.[0];
  return t ? BigInt(t.balance) : null;
}

function wrap(primitive: string, e: unknown): Error {
  const msg = (e as Error)?.message ?? String(e);
  if (/fetch|network|UNAVAILABLE/i.test(msg)) return new Error("Hedera unreachable");
  if (/INSUFFICIENT_PAYER_BALANCE|INSUFFICIENT_ACCOUNT_BALANCE/.test(msg)) return new Error(`${primitive} failed: not enough HBAR`);
  if (/INSUFFICIENT_TOKEN_BALANCE/.test(msg)) return new Error(`${primitive} failed: not enough tokens`);
  if (/CONTRACT_REVERT/.test(msg)) return new Error(`${primitive} failed: SaucerSwap rejected the trade. Nothing was spent except the network fee.`);
  if (/INSUFFICIENT_GAS/.test(msg)) return new Error(`${primitive} failed: ran out of gas`);
  return new Error(`${primitive} on mainnet failed: ${msg || "rejected in wallet"}`);
}

export type Step = "approve" | "associate" | "quote" | "swap" | "fee" | "done";

/**
 * Run a swap: approve (token in), associate (token out), swap, then pay the HBAR service fee.
 * Returns the swap transaction id and the fee transaction id.
 */
export async function executeSwap(
  from: string, tIn: SwapToken, tOut: SwapToken, q: Quote, slippage: number, passphrase: string,
  onStep: (s: Step) => void = () => {},
) {
  const minOut = (q.out * BigInt(Math.round((1 - slippage) * 10000))) / 10000n;
  const inputBalance = await tokenBalance(from, tIn);
  if (inputBalance === null) throw new Error(`Token lookup failed: your account has not added ${tIn.symbol}.`);
  if (inputBalance < q.amountIn) throw new Error(`Swap failed: not enough ${tIn.symbol}. Nothing was spent.`);
  // ECDSA accounts with an EVM alias must receive at that alias; the long-zero address fails with INVALID_ALIAS_KEY.
  // Note: the mirror rejects `?limit=0` on this endpoint, so use `transactions=false` and fail loudly if the lookup breaks.
  let recipient = num(from);
  let acct: { evm_address?: string } | null = null;
  try {
    const r = await fetch(`${MIRROR}/api/v1/accounts/${from}?transactions=false`);
    if (r.ok) acct = await r.json();
  } catch { /* handled below */ }
  if (!acct) throw new Error("Account lookup failed: Hedera unreachable. Nothing was spent.");
  if (acct.evm_address && !/^0x0{24}/.test(acct.evm_address)) recipient = BigInt(acct.evm_address);
  const to = word(recipient);
  let params = new Uint8Array();
  const payable = isH(tIn) ? q.amountIn : 0n;
  // Token-in swaps call the HTS system contract (transferFrom, WHBAR unwrap), which costs far more gas on Hedera;
  // 600k ran out mid-swap ("Safe approve failed"). Unused gas is mostly refunded, so err high.
  let gas = (isH(tIn) ? 400_000 : 1_500_000) + (q.hops - 1) * 700_000;
  const needsAssoc = !isH(tOut) && (await tokenBalance(from, tOut)) === null;
  let hasAllowance = false;
  if (!isH(tIn)) {
    const r = await fetch(`${MIRROR}/api/v1/accounts/${from}/allowances/tokens?token.id=${tIn.id}&spender.id=${ROUTER}`)
      .catch(() => { throw new Error("Token allowance lookup failed: Hedera unreachable. Nothing was spent."); });
    if (!r.ok) throw new Error(`Token allowance lookup failed: Hedera returned ${r.status}. Nothing was spent.`);
    const allowances = (await r.json()).allowances ?? [];
    hasAllowance = allowances.some((a: { token_id: string; spender: string; amount: number | string }) => a.token_id === tIn.id && a.spender === ROUTER && BigInt(a.amount) >= q.amountIn);
  }
  const chargeFee = from !== TREASURY && q.fee > 0n;

  // Same steps for both SDKs; `s` is either @hiero-ledger/sdk (wallet) or @hashgraph/sdk (device key).
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const steps = (s: any) => ({
    approve: () => new s.AccountAllowanceApproveTransaction().approveTokenAllowance(tIn.id, from, ROUTER, q.amountIn).setMaxTransactionFee(new s.Hbar(2)),
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
    if (!isH(tIn) && !hasAllowance) { onStep("approve"); try { await run(b.approve()); } catch (e) { throw wrap("Token allowance", e); } }
    if (needsAssoc) { onStep("associate"); try { await run(b.associate()); } catch (e) { throw wrap("Token associate", e); } }
    // Approval/association and biometric prompts can take time. Requote after prerequisites,
    // preserving the user's original minimum; never silently loosen their protection.
    onStep("quote");
    const fresh = await quote(tIn, tOut, q.amountIn);
    if (fresh.out < minOut) throw new Error("Price changed beyond the 3% limit. Review the new price and try again. The swap was not sent.");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const path = fresh.path;
    let fn: string;
    if (isH(tIn)) fn = "7ff36ab5" + word(minOut) + word(128n) + to + word(deadline) + pathWords(path);
    else if (isH(tOut)) fn = "18cbafe5" + word(q.amountIn) + word(minOut) + word(160n) + to + word(deadline) + pathWords(path);
    else fn = "38ed1739" + word(q.amountIn) + word(minOut) + word(160n) + to + word(deadline) + pathWords(path);
    params = bytes(fn);
    gas = (isH(tIn) ? 400_000 : 1_500_000) + (fresh.hops - 1) * 700_000;
    onStep("swap");
    let swapTx: string;
    try { swapTx = await run(b.swap()); } catch (e) { throw wrap("Swap", e); }
    let feeTx: string | null = null;
    if (chargeFee) { onStep("fee"); try { feeTx = await run(b.fee()); } catch { feeTx = null; } }
    onStep("done");
    return { swapTx, feeTx };
  } finally { close(); }
}
