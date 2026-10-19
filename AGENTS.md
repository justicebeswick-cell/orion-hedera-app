<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## AURION decisions
- Native reward claims use a signed account update preserving staking settings; report payout from mirror staking_reward_transfers, never a successful receipt or net balance alone, because fees and unrelated transfers can obscure rewards.
- Hedera mainnet only; reads go through the public mirror node from the browser (no server needed for public chain data).
- Device keys live only in localStorage, AES-GCM encrypted with an Argon2id-derived key; never sent to the server.
- WalletConnect signing uses @hiero-ledger/sdk classes (the version hedera-wallet-connect depends on); local-key signing uses @hashgraph/sdk. Mixing them fails type checks.
- AI activity answers: server route /api/ask fetches mirror-node data itself (never trusts client-supplied history) and streams via the Responses API.
- Biometric unlock uses WebAuthn PRF to encrypt the device passphrase locally (aurion.bio); the private key is still only decrypted by the passphrase, so biometrics never weaken the keystore.
- App branding uses one shared AurionLogo component backed by a CDN asset pointer; the favicon is a small local derivative of the same artwork so branding stays consistent.
- Initial document loads show the shared LaunchScreen; client-side navigation does not remount it, avoiding repeated startup interruptions.
- Vault uses an Embla deck with all sections mounted and inactive sections inert, preserving form state while making swipe navigation accessible.
- Staking company images use the shared NodeLogo with first-party council artwork and verified brand assets stored as project CDN pointers; preserve SVG detail and native aspect ratios, with legacy assets/initials as fallback, avoiding third-party image requests in the wallet.
- Swaps route through SaucerSwap V1 via WHBAR; the token list comes from SaucerSwap's public pools API and quotes from mirror-node contract calls, so no server is needed. The service fee is a separate HBAR transfer sent after the swap succeeds, so the treasury never has to hold or add tokens.
- AI Studio: chat streams from /api/studio (server fetches mirror data itself; draft_send only prepares a send, the user signs in-app) and images from /api/generate-image; chats, images and contacts live in localStorage so wallet data stays on the device.
- Hedera/WalletConnect SDKs are stubbed out of the server bundle in vite.config.ts; they crash the Worker at startup, so never use them server-side.
- Exchange prices use a shared read-only feed module behind /api/hbar-rates with no-store responses; manual and automatic refresh share one query, and unavailable markets never borrow another provider's rate.
- Exchange names and official destinations are paired in one browser-safe registry; keep rows in registry order during refresh to prevent moving click targets.
