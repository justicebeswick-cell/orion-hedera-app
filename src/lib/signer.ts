import { readKeystoreMeta, unlockKeystore } from "./keystore";
import { connectedWallet } from "./walletconnect";
import { preflightNft } from "./nfts";
import { checkNftAssociation } from "./nft-receive";

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
      const rc = await r.getReceiptWithSigner(signer);
      if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
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
/** One serial, never an allowance. Check ownership again immediately before signing. */
export async function sendNft(from: string, to: string, tokenId: string, serial: number, passphrase: string) {
  if (signMode(from).kind === "none") throw new Error("NFT transfer: connect a signing wallet first.");
  await preflightNft(from, to, tokenId, serial);
  try {
    if (signMode(from).kind === "wallet") {
      const { getWcSigner } = await import("./walletconnect");
      const signer = await getWcSigner(from);
      if (!signer) throw new Error("Wallet session ended. Reconnect your wallet.");
      const sdk = await import("@hiero-ledger/sdk");
      const tx = await new sdk.TransferTransaction().addNftTransfer(tokenId, serial, from, to)
        .setMaxTransactionFee(new sdk.Hbar(2)).freezeWithSigner(signer);
      const result = await tx.executeWithSigner(signer);
      const receipt = await result.getReceiptWithSigner(signer);
      if (receipt.status.toString() !== "SUCCESS") throw new Error(receipt.status.toString());
      return result.transactionId.toString();
    }
    const sdk = await import("@hashgraph/sdk");
    const key = await deviceKey(from, passphrase);
    const client = sdk.Client.forMainnet().setOperator(from, key);
    try {
      const result = await new sdk.TransferTransaction().addNftTransfer(tokenId, serial, from, to)
        .setMaxTransactionFee(new sdk.Hbar(2)).execute(client);
      const receipt = await result.getReceipt(client);
      if (receipt.status.toString() !== "SUCCESS") throw new Error(receipt.status.toString());
      return result.transactionId.toString();
    } finally { client.close(); }
  } catch (error) {
    const message = (error as Error)?.message ?? "";
    if (/TOKEN_NOT_ASSOCIATED_TO_ACCOUNT|NO_REMAINING_AUTOMATIC_ASSOCIATIONS/.test(message)) throw new Error("NFT association: recipient must add this collection first.");
    if (/SENDER_DOES_NOT_OWN_NFT_SERIAL_NO/.test(message)) throw new Error("NFT ownership: this wallet no longer owns this NFT.");
    throw wrap("NFT transfer", error);
  }
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

type AnySdk = typeof import("@hashgraph/sdk");
/** Run one transaction with whichever signer this device has; requires a SUCCESS receipt. */
async function signAndRun(from: string, passphrase: string, primitive: string, build: (sdk: AnySdk) => { freezeWithSigner: Function; execute: Function }) {
  const mode = signMode(from);
  if (mode.kind === "none") throw new Error(`${primitive}: connect a signing wallet first.`);
  try {
    if (mode.kind === "wallet") {
      const { getWcSigner } = await import("./walletconnect");
      const signer = await getWcSigner(from);
      if (!signer) throw new Error("Wallet session ended. Reconnect your wallet.");
      const h = (await import("@hiero-ledger/sdk")) as unknown as AnySdk;
      const tx = await build(h).freezeWithSigner(signer);
      const r = await tx.executeWithSigner(signer);
      const rc = await r.getReceiptWithSigner(signer);
      if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
      return r.transactionId.toString() as string;
    }
    const sdk = await import("@hashgraph/sdk");
    const key = await deviceKey(from, passphrase);
    const client = sdk.Client.forMainnet().setOperator(from, key);
    try {
      const r = await build(sdk).execute(client);
      const rc = await r.getReceipt(client);
      if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
      return r.transactionId.toString() as string;
    } finally { client.close(); }
  } catch (e) { throw wrap(primitive, e); }
}

/** Accept pending airdrops: one claim associates the token and moves the balance in. */
export function claimAirdrops(from: string, items: { sender_id: string; token_id: string; serial_number: number | null }[], passphrase: string) {
  if (items.length === 0 || items.length > 10) throw new Error("Token claim: choose 1 to 10 tokens.");
  return signAndRun(from, passphrase, "Token claim", (s) => {
    const tx = new s.TokenClaimAirdropTransaction();
    for (const a of items) {
      const senderId = s.AccountId.fromString(a.sender_id), receiverId = s.AccountId.fromString(from), tokenId = s.TokenId.fromString(a.token_id);
      tx.addPendingAirdropId(a.serial_number ? new s.PendingAirdropId({ senderId, receiverId, nftId: new s.NftId(tokenId, a.serial_number) }) : new s.PendingAirdropId({ senderId, receiverId, tokenId }));
    }
    return tx.setMaxTransactionFee(new s.Hbar(2)) as never;
  });
}

/** Account setting: -1 = accept any incoming token automatically, 0 = ask first. */
export function setAutoAssociations(from: string, unlimited: boolean, passphrase: string) {
  return signAndRun(from, passphrase, "Account update", (s) =>
    new s.AccountUpdateTransaction().setAccountId(from).setMaxAutomaticTokenAssociations(unlimited ? -1 : 0).setMaxTransactionFee(new s.Hbar(2)) as never);
}

/** Explicit association supports direct NFT transfers from wallets such as HashPack. */
export async function associateNftCollection(from: string, tokenId: string, passphrase: string) {
  await checkNftAssociation(from, tokenId);
  return signAndRun(from, passphrase, "NFT association", (s) =>
    new s.TokenAssociateTransaction().setAccountId(from).setTokenIds([tokenId]).setMaxTransactionFee(new s.Hbar(2)) as never);
}

/**
 * HCS audit record: writes a short note about a send to the user's own Hedera topic.
 * The user pays the tiny network fee. The topic is created once per account and only
 * this account's key can write to it. Device-key accounts only.
 */
const TOPIC_KEY = (id: string) => `aurion.auditTopic.${id}`;
export async function writeAuditRecord(from: string, record: { txId: string; to: string; amount: string }, passphrase: string) {
  if (signMode(from).kind !== "device") throw new Error("Audit records need a device key");
  const sdk = await import("@hashgraph/sdk");
  const key = await deviceKey(from, passphrase);
  const client = sdk.Client.forMainnet().setOperator(from, key);
  try {
    let topic = localStorage.getItem(TOPIC_KEY(from));
    if (!topic) {
      const r = await new sdk.TopicCreateTransaction().setSubmitKey(key.publicKey).setAdminKey(key.publicKey)
        .setTopicMemo("orion:audit:v1").setMaxTransactionFee(new sdk.Hbar(5)).execute(client);
      const rc = await r.getReceipt(client);
      if (rc.status.toString() !== "SUCCESS" || !rc.topicId) throw new Error(rc.status.toString());
      topic = rc.topicId.toString();
      localStorage.setItem(TOPIC_KEY(from), topic);
    }
    const r = await new sdk.TopicMessageSubmitTransaction().setTopicId(topic)
      .setMessage(JSON.stringify({ v: 1, ...record, at: new Date().toISOString() }))
      .setMaxTransactionFee(new sdk.Hbar(1)).execute(client);
    const rc = await r.getReceipt(client);
    if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
    return { topic, seq: rc.topicSequenceNumber?.toString() ?? "" };
  } catch (e) { throw wrap("Audit record", e); } finally { client.close(); }
}

/** Create a fungible HTS token with this account as treasury. Device key only. Returns token ID. */
export async function createFungibleToken(from: string, t: { name: string; symbol: string; decimals: number; supply: number }, passphrase: string) {
  const sdk = await import("@hashgraph/sdk");
  const key = await deviceKey(from, passphrase);
  const client = sdk.Client.forMainnet().setOperator(from, key);
  try {
    const units = BigInt(Math.round(t.supply * 10 ** t.decimals));
    const r = await new sdk.TokenCreateTransaction().setTokenName(t.name).setTokenSymbol(t.symbol)
      .setTokenType(sdk.TokenType.FungibleCommon).setDecimals(t.decimals).setInitialSupply(units)
      .setTreasuryAccountId(from).setAdminKey(key.publicKey).setSupplyKey(key.publicKey)
      .setMaxTransactionFee(new sdk.Hbar(30)).execute(client);
    const rc = await r.getReceipt(client);
    if (rc.status.toString() !== "SUCCESS" || !rc.tokenId) throw new Error(rc.status.toString());
    return rc.tokenId.toString();
  } catch (e) { throw wrap("Token create", e); } finally { client.close(); }
}

/** Create an NFT collection (optional royalty %) and mint the first NFT with a metadata link. */
export async function createAndMintNft(from: string, c: { name: string; symbol: string; maxSupply: number; royaltyPct: number; metadata: string; tokenId?: string }, passphrase: string) {
  const sdk = await import("@hashgraph/sdk");
  const key = await deviceKey(from, passphrase);
  const client = sdk.Client.forMainnet().setOperator(from, key);
  try {
    let tokenId = c.tokenId;
    if (!tokenId) {
      const tx = new sdk.TokenCreateTransaction().setTokenName(c.name).setTokenSymbol(c.symbol)
        .setTokenType(sdk.TokenType.NonFungibleUnique).setDecimals(0).setInitialSupply(0)
        .setSupplyType(sdk.TokenSupplyType.Finite).setMaxSupply(c.maxSupply)
        .setTreasuryAccountId(from).setAdminKey(key.publicKey).setSupplyKey(key.publicKey)
        .setMaxTransactionFee(new sdk.Hbar(40));
      if (c.royaltyPct > 0) {
        tx.setCustomFees([new sdk.CustomRoyaltyFee().setNumerator(Math.round(c.royaltyPct * 100)).setDenominator(10000).setFeeCollectorAccountId(from)]);
      }
      const rc = await (await tx.execute(client)).getReceipt(client);
      if (rc.status.toString() !== "SUCCESS" || !rc.tokenId) throw new Error(rc.status.toString());
      tokenId = rc.tokenId.toString();
    }
    const m = await new sdk.TokenMintTransaction().setTokenId(tokenId).setMetadata([new TextEncoder().encode(c.metadata)])
      .setMaxTransactionFee(new sdk.Hbar(20)).execute(client);
    const rc = await m.getReceipt(client);
    if (rc.status.toString() !== "SUCCESS") throw new Error(rc.status.toString());
    return { tokenId, serial: rc.serials[0]?.toString() ?? "" };
  } catch (e) { throw wrap("NFT mint", e); } finally { client.close(); }
}

/** Unsigned HBAR transfer bytes (hex) for an external/hardware signer. */
export async function unsignedHbarTransfer(from: string, to: string, amountHbar: number, memo: string) {
  const sdk = await import("@hashgraph/sdk");
  const client = sdk.Client.forMainnet();
  try {
    const tx = new sdk.TransferTransaction()
      .addHbarTransfer(from, new sdk.Hbar(-amountHbar)).addHbarTransfer(to, new sdk.Hbar(amountHbar))
      .setTransactionMemo(memo).setMaxTransactionFee(new sdk.Hbar(2))
      .setTransactionId(sdk.TransactionId.generate(from))
      .setNodeAccountIds([new sdk.AccountId(3)])
      .freezeWith(client);
    return Array.from(tx.toBytes(), (b) => b.toString(16).padStart(2, "0")).join("");
  } finally { client.close(); }
}
