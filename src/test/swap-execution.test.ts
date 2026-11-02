import { afterEach, expect, it, vi } from "vitest";
import { executeSwap, HBAR, listTokens, type Quote } from "@/lib/swap";

const state = vi.hoisted(() => ({ kinds: [] as string[], parameters: new Uint8Array(), closed: false }));
vi.mock("@/lib/signer", () => ({ signMode: () => ({ kind: "device" }), deviceKey: async () => ({}) }));
vi.mock("@hashgraph/sdk", () => {
  class Tx {
    kind = "";
    approveTokenAllowance() { this.kind = "approve"; return this; }
    setAccountId() { this.kind = "associate"; return this; }
    setTokenIds() { return this; }
    setMaxTransactionFee() { return this; }
    setContractId() { this.kind = "swap"; return this; }
    setGas() { return this; }
    setPayableAmount() { return this; }
    setFunctionParameters(p: Uint8Array) { state.parameters = p; return this; }
    async execute() { state.kinds.push(this.kind); return { transactionId: { toString: () => "0.0.123@1.1" }, getReceipt: async () => ({ status: { toString: () => "SUCCESS" } }) }; }
  }
  class Hbar { static fromTinybars() { return new Hbar(); } }
  return { Hbar, AccountAllowanceApproveTransaction: Tx, TokenAssociateTransaction: Tx, ContractExecuteTransaction: Tx, Client: { forMainnet: () => ({ setOperator() { return this; }, close() { state.closed = true; } }) } };
});
const input = { id: "0.0.100", symbol: "TEST", name: "Test", decimals: 6 };
const output = { id: "0.0.101", symbol: "OUT", name: "Output", decimals: 6 };
const q: Quote = { amountIn: 100n, out: 1000n, hbarValue: 0n, fee: 0n, impact: 0, hops: 1, path: [input.id, output.id], route: ["TEST", "OUT"] };
const word = (n: bigint) => n.toString(16).padStart(64, "0");
const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });
async function setup(outputAmount: bigint) {
  state.kinds = []; state.closed = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("saucerswap")) return json([{ tokenA: input, tokenB: output, tokenReserveA: "1000", tokenReserveB: "1000" }]);
    if (url.includes("contracts/call")) return json({ result: "0x" + word(32n) + word(2n) + word(100n) + word(outputAmount) });
    if (url.includes("allowances")) return json({ allowances: [] });
    if (url.includes("/tokens")) return json({ tokens: url.includes(input.id) ? [{ balance: 1000 }] : [] });
    return json({ evm_address: "0x000000000000000000000000000000000000007b" });
  }));
  await listTokens();
}
afterEach(() => vi.unstubAllGlobals());

it("approves and associates HTS tokens before checking the latest price and executing", async () => {
  await setup(1010n);
  const steps: string[] = [];
  const result = await executeSwap("0.0.123", input, output, q, 0.03, "", (s) => steps.push(s));
  expect(state.kinds).toEqual(["approve", "associate", "swap"]);
  expect(steps).toEqual(["approve", "associate", "quote", "swap", "done"]);
  expect(Array.from(state.parameters.slice(0, 4))).toEqual([0x38, 0xed, 0x17, 0x39]);
  expect(result.swapTx).toBe("0.0.123@1.1");
  expect(state.closed).toBe(true);
});

it("does not send a swap when the fresh quote falls below the original 3% minimum", async () => {
  await setup(969n);
  await expect(executeSwap("0.0.123", input, output, q, 0.03, "")).rejects.toThrow("Price changed");
  expect(state.kinds).toEqual(["approve", "associate"]);
  expect(state.closed).toBe(true);
});