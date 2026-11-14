# Orion 

# AURION — V1 Vibe-Code Prompt (cut to ship)



Paste this entire document as the product prompt. Build this. Do not add the cut instruments back.



---



## 0. What changed, and why



The previous spec had eight instruments. That is a platform company, not a vibe-coded app. V1 is four loops that share one account, one topic strategy, and one receipt style. Everything else is named in section 9 so it is not forgotten and not built.



Positioning line:



> Prove it. Agree it. Leave it. Hold it. On Hedera.



AURION is the standard personal layer for the Hedera ecosystem because it does few things on mainnet, not because it lists every enterprise use case on the homepage. Mainnet is the product. There is no testnet mode, no network toggle, and no “we’ll promote it later.” The first seal a user strikes is a mainnet fact.



---



## 1. Identity



Black and vibrant purple operating surface. Quiet bravado. Copy states. Every success ends with a consensus timestamp, a transaction id, and the words **Sealed on Hedera**.



AURION produces cryptographic evidence and sends transfers the user signed. Identity is checked before those transfers. Keys stay on the device.



Audience for v1: a person who wants a mainnet HBAR vault they can actually use, behind a real identity check, plus a creator who wants a timestamp, a freelancer who wants terms accepted, and a person who wants one heir transfer armed. Not institutions. Not supply chains.



AURION is not a copyright office and not a law firm. The vault is the compliance surface: no verified identity, no send, no pact pay, no armed switch. AURION does not custody keys and does not file the license by existing. The operator still needs a legal entity, a written AML program, and a compliance vendor contract before this is offered to the public. The software enforces that program. It does not replace it. Say the custody line once, in settings.



---



## 2. Visual system



- Void `#050308`, ink `#0C0A12`, graphite `#16141E`, hairline `rgba(192,132,252,0.16)`.

- Violet `#A855F7` for actions and focus. Signal `#C084FC` for highlights. Flare `#E879F9` only when value moves or a seal lands. Porcelain `#F4F0FA` text, mist `#A89BB8` secondary. Danger `#F43F5E`. Success `#34D399` only after consensus.

- 16–20px radius. No page gradients. One violet bloom behind the lock-screen wordmark, under 30% opacity.

- Geometric sans, tabular figures on amounts and timestamps.

- Springs, not CSS eases. Shared-element list-to-detail. Command palette on logo long-press. Seal moment: a violet ring draws in 420ms, then the timestamp fades in. No confetti. Reduced motion becomes a 160ms fade.

- Mobile first. Bottom dock: Home, Vault, Seal, Pact. Legacy lives under Home and the command palette. PWA.



---



## 3. Account and compliance gate



The vault is locked until KYC and sanctions screening pass. Wallet connect is not access.



- Identity vendor is Sumsub or Persona, not a homemade passport form. The app opens their hosted flow, receives a webhook, and stores only the result: applicant id, status (pending, approved, rejected, retry), review time, and a document hash. No ID images in AURION’s database.

- Sanctions and PEP screening run in that same flow. A hit is a hard stop. No override button in the client.

- On approval, the app binds the Hedera account id to the applicant id. One approved identity, one AURION account. Rebinding requires a new review.

- Session unlock is biometric or passphrase. Local keystore is AES-GCM with Argon2id. Private keys never go to the server. Optional HashPack, Blade, or WalletConnect only after the same identity is approved and the connected account id matches the bound id.

- Reads of a bound account do not need a signature. Sends, seals, pact pays, and switch arming do, and they also require status `approved`.

- Network is Hedera mainnet only. Client, mirror node, and explorer links are mainnet (`mainnet-public.mirrornode.hedera.com`, HashScan mainnet). Do not ship a testnet toggle. An account id that does not resolve on mainnet is invalid.

- Before every write: max fee in HBAR and approximate USD, and what will be public. Confirm buttons name the primitive: “Create topic on mainnet,” “Seal on mainnet,” “Send HBAR on mainnet,” “Arm switch on mainnet.”

- Topic creation happens once, on first seal, and the confirm screen shows that fee before the user signs.



Public: transaction ids, topic messages, memos. Files stay off-chain. Identity documents stay with the vendor. Hedera gets a hash and a small JSON envelope. Do not put legal names or document numbers in topic messages or memos.



```json

{

  "v": 1,

  "app": "aurion",

  "kind": "seal|pact|heartbeat|legacy",

  "id": "ulid",

  "hash": "sha256-hex",

  "meta": {}

}

```



One HCS topic per account, created on first seal, memo `aurion:v1`. All four instruments write to it. Do not create a topic per file or per pact. Topic creation is the expensive call. Messages stay under 1024 bytes. If a payload will not fit, store it off-chain and submit the hash.



Stack: Vite + React + TypeScript + Tailwind + Framer Motion + `@hashgraph/sdk` + mainnet mirror-node REST. A slice is done only when mainnet returns a consensus timestamp. Never mock consensus. Never point the shipping build at testnet. If mainnet is unreachable, the button reads “Hedera unreachable.”



---



## 4. Vault



The product. A mainnet HBAR vault with a compliance gate and a key the server cannot spend.



Hold:

- HBAR balance and the last 25 transfers from the mirror node.

- Receive: account id, copy, QR. Inbound transfers are watched. They are not blocked on-chain, because HBAR has no KYC flag. The app flags an inbound over the review threshold and pauses further sends until it clears.

- Send only if status is `approved`, the destination is not on a sanctions list, and the amount is inside the user’s limits. Optional public memo, 100 bytes, warned as public. No legal name in the memo.

- Address book entries are usable only after a first send to that id under the limit, or after the user marks one as trusted and waits out a 12-hour cooling period. Changing a trusted id starts the clock again.



AML controls, enforced in the app before the signature sheet appears:

- Sanctions screen on the destination account if a name or prior binding exists, and on the user’s own applicant record at login and on a daily refresh.

- Velocity limits: a daily send cap and a single-transfer cap, set in policy, shown before the user types an amount. Over the cap, the send does not build. It offers “request a review,” which creates a case, not a transaction.

- Travel-rule capture above the policy threshold: legal name and account reference of the recipient, stored off-chain with the case id, never in the Hedera memo.

- A simple monitoring rule set: structuring just under the cap, a new destination plus a large outbound, and an inbound followed immediately by an outbound. A hit pauses sends and opens a case. No client-side way to dismiss a case.

- Audit log of every approve, reject, limit change, and case, exportable for the operator. Not a public topic.



Security:

- Key created on device. Backup is an encrypted phrase the user writes down. AURION cannot restore it.

- Biometric unlock. Auto-lock after 60 seconds backgrounded.

- No sweep, no server-side signing, no recovery by support. Support can unlock a review case. Support cannot move HBAR.



Line under the balance: “Held in your Hedera account. AURION cannot move it unless you sign. Sends stay off until identity is approved.”



No swap, no DEX, no HTS in v1. V1 money is HBAR.



---



## 5. Seal



Prove a byte sequence existed at a Hedera consensus time. Optional note that AI helped make it. Not a copyright registration. The button says **Seal**, never **Register**.



Flow:

1. Drop a file or paste text. Hash SHA-256 in the browser. Show the hash before submit.

2. Creation class, required: Human, AI-assisted, AI-generated, Mixed.

3. Optional one-line model name. Do not ask for the prompt in v1.

4. Submit the envelope to the account topic. Do not upload the file. Do not mint an NFT.

5. On consensus, show timestamp, topic sequence, transaction id.



Public verify page, no login: drop a file, recompute the hash, query the mirror node for that hash, return match or no match. Duplicate hash shows the earlier seal. Any byte change is a non-match. Say that in the result.



This is the whole proof model. No encrypted storage product. No certificate NFT. The user keeps the file. The network keeps the hash.



---



## 6. Pact



Two Hedera accounts accept the same text. Later edits are new versions.



Flow:

1. Drafter fills five fields: counterparty account id, scope (one paragraph), amount in HBAR, deliverable (one line), revision count. AURION renders canonical markdown, LF, trimmed, and shows the hash.

2. Drafter submits `proposed` with the hash.

3. Counterparty opens the link, sees the same hash, submits `accepted` or `declined` from their account. Hash mismatch is a hard fail.

4. On accept, AURION offers one payment action: the client signs a normal HBAR transfer for the amount, memo `pact:<id>`. No escrow contract. No scheduled release. No dispute engine. The client pays when they are ready. The topic shows whether they paid, because the transfer is on the account.



States: proposed, accepted, declined, paid, superseded. A change is pact v2 referencing v1’s sequence.



Export is a plain text appendix: terms, hash, topic id, sequences, consensus times, account ids. No PDF library in v1.



---



## 7. Legacy



One heir. One HBAR amount. One switch. Not an estate product.



Constraint: a scheduled transaction can wait about 62 days, cannot be edited, and can be deleted only if an admin key was set. Solution: a 30-day rolling schedule, which fits under the cap with room.



Flow:

1. User sets heir account id, exact HBAR amount, and a 30-day window. They type `30` to confirm. No 90- or 180-day option in v1.

2. AURION creates a scheduled HBAR transfer on mainnet to the heir with `waitForExpiry`, expiration 30 days out, and an admin key held by the user so it can be deleted. The confirm screen repeats the heir account id and the exact amount. Arming moves real HBAR if the user goes quiet.

3. Check-in is a signed topic message `kind: heartbeat`. That deletes the schedule and creates the next one, pushed 30 days out. The app also sets a local notification three days before.

4. If no check-in and no cancel, the scheduled transfer executes without AURION running.

5. Cancel is one signed delete, with a receipt.



Home shows one line: “Switch armed. Next check-in in N days.”



Not in v1: sweeping the account, moving tokens or NFTs, encrypted letter bundles, Shamir shares, multiple heirs, email verification. A note field on the schedule memo can hold a short public line to the heir. Anything private stays off the app.



---



## 8. Home



Not a feed. Account id, HBAR balance, switch line, latest seal, pact waiting on you. A receipt log of topic messages and transfers, each linked to HashScan mainnet. If the mainnet mirror node is more than two minutes behind, say so. Do not fake liveness. Do not show a network name in the header. Mainnet is assumed.



---



## 9. Cut on purpose



Do not build these in v1. They made the spec harder without making the first success more likely.



- **Gate / micro-subscriptions.** Needs token mint, association, allowances, renewal schedules, and an access server. A paid unlock can be a Pact plus a transfer. Revisit only after Seal and Pact have real users.

- **Stream middleware.** Batch CSV, webhooks, royalty fan-out, idempotency service. V1 payments are one signed transfer.

- **Trace / ESG.** No buyer in a personal app. An append-only topic is Seal’s shape if a logistics user ever asks.

- **Charter / RWA.** Issuer keys, allowlists, pause, freeze, wipe, redemption. That is a regulated desk. It is a different company. Leave it out.

- **HTS, NFTs, custom fees, local encrypted file vault, PDF export, DEX quotes.** All later.



---



## 10. Build order



Ship against mainnet from the first commit that can sign. Practice transactions, if the builder wants them, happen in a throwaway script outside the app. The app never grows a testnet path.



1. Shell, tokens, dock, identity gate against the vendor sandbox then production, Vault read from the mainnet mirror node, send HBAR only after approval.

2. Seal: hash, one mainnet topic, public verify against mainnet.

3. Pact: propose, accept, optional mainnet pay.

4. Legacy: 30-day mainnet scheduled transfer, heartbeat deletes and recreates, cancel.



Voice: short sentences, verb buttons, errors that name the failing primitive. No “unlock your potential.” No “testnet.” The about screen says mainnet by name.



About screen:



> AURION is a mainnet HBAR vault. Identity is checked before value moves. Seals, pacts, and one heir transfer sit on the same account. The network is the notary. You hold the keys.



End of prompt.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://orion-hedera-app.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d28d185c-c190-4512-9595-c164cea8f810).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
