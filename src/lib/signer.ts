import { readKeystoreMeta, unlockKeystore } from "./keystore";
import { connectedWallet } from "./walletconnect";

export type SignMode = { kind: "wallet"; name: string } | { kind: "device" } | { kind: "none" };

/** How this browser can sign for `accountId`. */
export function signMode(accountId: string | null): SignMode {
  if (!accountId) return { kind: "none" };
  const w = connectedWallet();
  if (w && w.id === accountId) return { kind: "wallet", name: w.wallet };
  if (readKeystoreMeta()?.accountId === accountId) return { kind: "device" };
  return { kind: "none" };
}

export async function deviceKey(accountId: string, passphrase: string) {
  const sdk = await import("@hashgraph/sdk");
  const meta = readKeystoreMeta();
  if (!meta || meta.accountId !== accountId) throw new Error("No key for this account on this device");
  let raw: string;
  try { raw = await unlockKeystore(passphrase); } catch { throw new Error("Device key did not unlock. Check the passphrase."); }
  return meta.kind === "ed25519" ? sdk.PrivateKey.fromStringED25519(raw) : sdk.PrivateKey.fromStringECDSA(raw);
}

function wrap(primitive: string, e: unknown): Error {
  const msg = (e as Error)?.message ?? String(e);
  if (/fetch|network|UNAVAILABLE/i.test(msg)) return new Error("Hedera unreachable");
  if (/INSUFFICIENT_PAYER_BALANCE|INSUFFICIENT_ACCOUNT_BALANCE/.test(msg)) return new Error(`${primitive} failed: not enough HBAR`);
  if (/INVALID_SIGNATURE/.test(msg)) return new Error(`${primitive} failed: signature rejected`);
  return new Error(`${primitive} on mainnet failed: ${msg || "rejected in wallet"}`);
}

/** HBAR transfer from `from` to `to`, signed by wallet or device key. Returns transaction id. */
export async function sendHbar(from: string, to: string, amountHbar: number, memo: string, passphrase: string) {
  const mode = signMode(from);
  if (mode.kind === "wallet") {
    const { getWcSigner } = await import("./walletconnect");
    const signer = await getWcSigner(from);
    if (!signer) throw new Error("Wallet session ended. Reconnect your wallet.");
    const h = await import("@hiero-ledger/sdk");
    try {
      const tx = await new h.TransferTransaction()
        .addHbarTransfer(from, new h.Hbar(-amountHbar))
        .addHbarTransfer(to, new h.Hbar(amountHbar))
        .setTransactionMemo(memo)
        .setMaxTransactionFee(new h.Hbar(2))
        .freezeWithSigner(signer);
      const r = await tx.executeWithSigner(signer);
      return r.transactionId.toString();
    } catch (e) { throw wrap("Transfer", e); }
  }
  const sdk = await import("@hashgraph/sdk");
  const key = await deviceKey(from, passphrase);
  const client = sdk.Client.forMainnet().setOperator(from, key);
  try {
    const r = await new sdk.TransferTransaction()
      .addHbarTransfer(from, new sdk.Hbar(-amountHbar))
      .addHbarTransfer(to, new sdk.Hbar(amountHbar))
      .setTransactionMemo(memo)
      .setMaxTransactionFee(new sdk.Hbar(2))
      .execute(client);
    const rc = await r.getReceipt(client);
    if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
    return r.transactionId.toString();
  } catch (e) { throw wrap("Transfer", e); } finally { client.close(); }
}

/**
 * Legacy switch: schedule a transfer to the heir that fires on its own at `expiry`.
 * waitForExpiry=true means Hedera holds it until the date, then executes.
 * Admin key = owner key, so a check-in can delete it and arm a fresh one.
 */
export async function armSwitch(from: string, heir: string, amountHbar: number, days: number, passphrase: string, memo = "aurion:v1 legacy") {
  const expiry = new Date(Date.now() + days * 86_400_000);
  const mode = signMode(from);
  if (mode.kind === "wallet") {
    const { getWcSigner } = await import("./walletconnect");
    const signer = await getWcSigner(from);
    if (!signer) throw new Error("Wallet session ended. Reconnect your wallet.");
    const h = await import("@hiero-ledger/sdk");
    try {
      const inner = new h.TransferTransaction()
        .addHbarTransfer(from, new h.Hbar(-amountHbar))
        .addHbarTransfer(heir, new h.Hbar(amountHbar));
      const tx = await new h.ScheduleCreateTransaction()
        .setScheduledTransaction(inner)
        .setAdminKey(signer.getAccountKey())
        .setExpirationTime(h.Timestamp.fromDate(expiry))
        .setWaitForExpiry(true)
        .setScheduleMemo(memo)
        .setMaxTransactionFee(new h.Hbar(5))
        .freezeWithSigner(signer);
      const r = await tx.executeWithSigner(signer);
      const rc = await r.getReceiptWithSigner(signer);
      return { txId: r.transactionId.toString(), scheduleId: rc.scheduleId?.toString() ?? "", expiry: expiry.toISOString() };
    } catch (e) { throw wrap("Schedule create", e); }
  }
  const sdk = await import("@hashgraph/sdk");
  const key = await deviceKey(from, passphrase);
  const client = sdk.Client.forMainnet().setOperator(from, key);
  try {
    const inner = new sdk.TransferTransaction()
      .addHbarTransfer(from, new sdk.Hbar(-amountHbar))
      .addHbarTransfer(heir, new sdk.Hbar(amountHbar));
    const r = await new sdk.ScheduleCreateTransaction()
      .setScheduledTransaction(inner)
      .setAdminKey(key.publicKey)
      .setExpirationTime(sdk.Timestamp.fromDate(expiry))
      .setWaitForExpiry(true)
      .setScheduleMemo(memo)
      .setMaxTransactionFee(new sdk.Hbar(5))
      .execute(client);
    const rc = await r.getReceipt(client);
    if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
    return { txId: r.transactionId.toString(), scheduleId: rc.scheduleId?.toString() ?? "", expiry: expiry.toISOString() };
  } catch (e) { throw wrap("Schedule create", e); } finally { client.close(); }
}

/** Cancel a scheduled switch (used by check-in and disarm). */
export async function deleteSchedule(from: string, scheduleId: string, passphrase: string) {
  const mode = signMode(from);
  if (mode.kind === "wallet") {
    const { getWcSigner } = await import("./walletconnect");
    const signer = await getWcSigner(from);
    if (!signer) throw new Error("Wallet session ended. Reconnect your wallet.");
    const h = await import("@hiero-ledger/sdk");
    try {
      const tx = await new h.ScheduleDeleteTransaction().setScheduleId(scheduleId).setMaxTransactionFee(new h.Hbar(2)).freezeWithSigner(signer);
      await tx.executeWithSigner(signer);
      return;
    } catch (e) { throw wrap("Schedule delete", e); }
  }
  const sdk = await import("@hashgraph/sdk");
  const key = await deviceKey(from, passphrase);
  const client = sdk.Client.forMainnet().setOperator(from, key);
  try {
    const r = await new sdk.ScheduleDeleteTransaction().setScheduleId(scheduleId).setMaxTransactionFee(new sdk.Hbar(2)).execute(client);
    await r.getReceipt(client);
  } catch (e) { throw wrap("Schedule delete", e); } finally { client.close(); }
}

/** HTS token transfer (units = smallest unit). Recipient must hold the token or have auto-association slots. */
export async function sendToken(from: string, to: string, tokenId: string, units: bigint, memo: string, passphrase: string) {
  const mode = signMode(from);
  if (mode.kind === "wallet") {
    const { getWcSigner } = await import("./walletconnect");
    const signer = await getWcSigner(from);
    if (!signer) throw new Error("Wallet session ended. Reconnect your wallet.");
    const h = await import("@hiero-ledger/sdk");
    try {
      const tx = await new h.TransferTransaction()
        .addTokenTransfer(tokenId, from, h.Long.fromString((-units).toString()))
        .addTokenTransfer(tokenId, to, h.Long.fromString(units.toString()))
        .setTransactionMemo(memo).setMaxTransactionFee(new h.Hbar(2)).freezeWithSigner(signer);
      const r = await tx.executeWithSigner(signer);
      return r.transactionId.toString();
    } catch (e) { throw tokenWrap(e); }
  }
  const sdk = await import("@hashgraph/sdk");
  const key = await deviceKey(from, passphrase);
  const client = sdk.Client.forMainnet().setOperator(from, key);
  try {
    const r = await new sdk.TransferTransaction()
      .addTokenTransfer(tokenId, from, sdk.Long.fromString((-units).toString()))
      .addTokenTransfer(tokenId, to, sdk.Long.fromString(units.toString()))
      .setTransactionMemo(memo).setMaxTransactionFee(new sdk.Hbar(2)).execute(client);
    const rc = await r.getReceipt(client);
    if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
    return r.transactionId.toString();
  } catch (e) { throw tokenWrap(e); } finally { client.close(); }
}
function tokenWrap(e: unknown) {
  const m = (e as Error)?.message ?? "";
  if (/TOKEN_NOT_ASSOCIATED_TO_ACCOUNT|NO_REMAINING_AUTOMATIC_ASSOCIATIONS/.test(m)) return new Error("Token transfer failed: the recipient hasn't added this token to their account yet");
  if (/INSUFFICIENT_TOKEN_BALANCE/.test(m)) return new Error("Token transfer failed: not enough of this token");
  return wrap("Token transfer", e);
}

/**
 * Agent ID: creates a Hedera Consensus Service topic that only the owner can write to,
 * and posts the agent's registration as the first message. Returns the topic id.
 */
export async function createAgentTopic(from: string, memo: string, firstMessage: string, passphrase: string) {
  const mode = signMode(from);
  if (mode.kind === "wallet") {
    const { getWcSigner } = await import("./walletconnect");
    const signer = await getWcSigner(from);
    if (!signer) throw new Error("Wallet session ended. Reconnect your wallet.");
    const h = await import("@hiero-ledger/sdk");
    let topicId = "";
    try {
      const tx = await new h.TopicCreateTransaction()
        .setTopicMemo(memo.slice(0, 100))
        .setSubmitKey(signer.getAccountKey())
        .setAdminKey(signer.getAccountKey())
        .setMaxTransactionFee(new h.Hbar(5))
        .freezeWithSigner(signer);
      const r = await tx.executeWithSigner(signer);
      const rc = await r.getReceiptWithSigner(signer);
      topicId = rc.topicId?.toString() ?? "";
    } catch (e) { throw wrap("Topic create", e); }
    const txId = await postAgentMessage(from, topicId, firstMessage, passphrase);
    return { topicId, txId };
  }
  const sdk = await import("@hashgraph/sdk");
  const key = await deviceKey(from, passphrase);
  const client = sdk.Client.forMainnet().setOperator(from, key);
  try {
    const r = await new sdk.TopicCreateTransaction()
      .setTopicMemo(memo.slice(0, 100))
      .setSubmitKey(key.publicKey)
      .setAdminKey(key.publicKey)
      .setMaxTransactionFee(new sdk.Hbar(5))
      .execute(client);
    const rc = await r.getReceipt(client);
    const topicId = rc.topicId?.toString() ?? "";
    if (!topicId) throw new Error("no topic id in receipt");
    const m = await new sdk.TopicMessageSubmitTransaction().setTopicId(topicId).setMessage(firstMessage).setMaxTransactionFee(new sdk.Hbar(2)).execute(client);
    await m.getReceipt(client);
    return { topicId, txId: m.transactionId.toString() };
  } catch (e) { throw wrap("Topic create", e); } finally { client.close(); }
}

/** Append one entry to an agent's on-chain log. Only the owner's key can write. */
export async function postAgentMessage(from: string, topicId: string, message: string, passphrase: string) {
  const mode = signMode(from);
  if (mode.kind === "wallet") {
    const { getWcSigner } = await import("./walletconnect");
    const signer = await getWcSigner(from);
    if (!signer) throw new Error("Wallet session ended. Reconnect your wallet.");
    const h = await import("@hiero-ledger/sdk");
    try {
      const tx = await new h.TopicMessageSubmitTransaction().setTopicId(topicId).setMessage(message).setMaxTransactionFee(new h.Hbar(2)).freezeWithSigner(signer);
      const r = await tx.executeWithSigner(signer);
      return r.transactionId.toString();
    } catch (e) { throw wrap("Topic message", e); }
  }
  const sdk = await import("@hashgraph/sdk");
  const key = await deviceKey(from, passphrase);
  const client = sdk.Client.forMainnet().setOperator(from, key);
  try {
    const r = await new sdk.TopicMessageSubmitTransaction().setTopicId(topicId).setMessage(message).setMaxTransactionFee(new sdk.Hbar(2)).execute(client);
    const rc = await r.getReceipt(client);
    if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
    return r.transactionId.toString();
  } catch (e) { throw wrap("Topic message", e); } finally { client.close(); }
}
