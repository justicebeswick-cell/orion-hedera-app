import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./run-id.server";

const MIRROR = "https://mainnet-public.mirrornode.hedera.com";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

async function mirror(path: string) {
  const r = await fetch(MIRROR + path);
  if (!r.ok) throw new Error(`Mirror node returned ${r.status}`);
  return r.json();
}

/** Compact, public on-chain context for the account. */
async function accountContext(id: string) {
  const [a, t, rw] = await Promise.all([
    mirror(`/api/v1/accounts/${id}?limit=1`),
    mirror(`/api/v1/transactions?account.id=${id}&limit=50&order=desc`),
    mirror(`/api/v1/accounts/${id}/rewards?limit=10&order=desc`).catch(() => ({ rewards: [] })),
  ]);
  const hb = (n: number) => +(n / 1e8).toFixed(8);
  return {
    account: id,
    balance_hbar: hb(a.balance?.balance ?? 0),
    staked_node_id: a.staked_node_id ?? null,
    pending_reward_hbar: hb(a.pending_reward ?? 0),
    staking_rewards: (rw.rewards ?? []).map((r: any) => ({ at: iso(r.timestamp), hbar: hb(r.amount) })),
    transactions: (t.transactions ?? []).map((x: any) => ({
      at: iso(x.consensus_timestamp),
      type: x.name,
      result: x.result,
      fee_hbar: hb(x.charged_tx_fee ?? 0),
      memo: x.memo_base64 ? safeMemo(x.memo_base64) : undefined,
      net_hbar_for_account: hb((x.transfers ?? []).filter((y: any) => y.account === id).reduce((s: number, y: any) => s + y.amount, 0)),
      counterparties: (x.transfers ?? [])
        .filter((y: any) => y.account !== id && y.amount !== 0 && !/^0\.0\.(\d|[1-9]\d|[1-7]\d\d|800|801)$/.test(y.account))
        .map((y: any) => ({ account: y.account, hbar: hb(y.amount) })),
    })),
  };
}
const iso = (ts: string) => new Date(Number(ts) * 1000).toISOString();
const safeMemo = (b: string) => { try { return atob(b).slice(0, 100); } catch { return undefined; } };

const INSTRUCTIONS = `You explain a Hedera mainnet account's activity to its holder.
Use only the JSON data provided. Never invent transactions, prices or USD values.
Amounts are in HBAR. Positive net_hbar_for_account means received, negative means sent (including fees).
Accounts 0.0.3 to 0.0.39 are network nodes; 0.0.98 is the fee account; 0.0.800 and 0.0.801 pay staking rewards.
Answer in short, plain sentences. Cite dates (UTC) and amounts. If the data does not answer the question, say so.
Do not give financial or legal advice. Keep answers under 180 words.`;

export async function handleAsk(request: Request) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return Response.json({ error: "AI is not configured" }, { status: 500 });

  let body: { accountId?: unknown; question?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!/^0\.0\.\d{1,10}$/.test(accountId) || !question) return Response.json({ error: "Account id and question required" }, { status: 400 });

  let ctx;
  try { ctx = await accountContext(accountId); }
  catch { return Response.json({ error: "Hedera unreachable" }, { status: 502 }); }

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses(MODEL),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: `Account data:\n${JSON.stringify(ctx)}\n\nQuestion: ${question}` }],
    abortSignal: request.signal,
    providerOptions: {
      openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
    },
  });
  return withLovableAiGatewayRunIdHeader(result.toTextStreamResponse(), runIdFetch);
}
