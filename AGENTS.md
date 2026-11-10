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
- Public company and legal pages use a shared browser-safe PublicSite shell and route-specific metadata; keep the wallet first screen unchanged and unapproved legal disclosures explicitly in draft state.
- Card surfaces share the global card-finish, card-border, card-radius and shadow tokens through panel/card-surface/hero-card/stat-tile and the Vault deck; this keeps the app-wide card design consistent without changing layouts or interactions.
- Native reward claims use a signed account update preserving staking settings; report payout from mirror staking_reward_transfers, never a successful receipt or net balance alone, because fees and unrelated transfers can obscure rewards.
- Hedera mainnet only; reads go through the public mirror node from the browser (no server needed for public chain data).
- Mirror freshness checks the latest ingested block with unique supported timestamp-filter cache keys and HTTP response time (cache-busted same-origin HEAD fallback when CORS hides Date), never the device clock or last user transaction; this avoids cached or idle-network false lag alerts.
- HBAR sends explicitly opt into fresh EVM-alias funding; other transfers retain existing-account checks, and alias lookups enforce canonical account blocklists and confirmed receipts to avoid bypassing safeguards.
- Device keys live only in localStorage, AES-GCM encrypted with an Argon2id-derived key; never sent to the server.
- WalletConnect signing uses @hiero-ledger/sdk classes (the version hedera-wallet-connect depends on); local-key signing uses @hashgraph/sdk. Mixing them fails type checks.
- AI activity answers: server route /api/ask fetches mirror-node data itself (never trusts client-supplied history) and streams via the Responses API.
- Biometric unlock seals only a verified code after saving the key, binds the local WebAuthn PRF seal to that encrypted wallet revision, and validates legacy seals before migration; this prevents stale or another wallet's code reaching signers without weakening device-local custody.
- App branding uses one shared AurionLogo: Home renders vector rings over the lossless sphere for sharp small-size edges; LaunchScreen retains separate lossless layers for orbit animation. Installed icons and favicon derive from the same source with versioned permanent PNG/manifest URLs, never blob or data URLs, so browser installation can fetch them independently. Phones copy icons at install time.
- Initial document loads show the shared LaunchScreen; client-side navigation does not remount it, avoiding repeated startup interruptions.
- Manifest any-purpose icons use transparent launch artwork and maskable icons retain the installed tile; Android generates its own unavoidable pre-page splash, so it cannot be replaced by React.
- Vault uses an Embla deck with all sections mounted and inactive sections inert, preserving form state while making swipe navigation accessible.
- Staking company images use the shared NodeLogo with first-party council artwork and verified brand assets stored as project CDN pointers; preserve SVG detail and native aspect ratios, with legacy assets/initials as fallback, avoiding third-party image requests in the wallet. Chain node records can carry older brand names, so node-logo.tsx maps them to the company's current name and artwork; keep that mapping the single source for displayed node names.
- Swaps route through SaucerSwap V1 via WHBAR; the token list comes from SaucerSwap's public pools API and quotes from mirror-node contract calls, so no server is needed. The service fee is a separate HBAR transfer sent after the swap succeeds, so the treasury never has to hold or add tokens.
- Swap preflight distinguishes mirror failures from missing associations, checks input balance, and requotes after prerequisite signatures while preserving the reviewed minimum output; this avoids stale execution without weakening price protection.
- Studio mode panels stay mounted while hidden to preserve drafts and active image generation during smooth tab navigation.
- Home asset/action links select Vault sections through validated search state; the deck keeps sections mounted to retain drafts and swipes.
- Unlock glass renders only a non-sensitive wallet silhouette, never the underlying routed pages, so transparency does not expose keys or interactive wallet controls.
- New device codes carry their length inside encrypted-wallet metadata; code rotation preserves the active account and saved blob and removes the stale biometric seal.
- Studio image results use the existing image stream and device-local image store with thread IDs; Chat can attach a generated image for discussion without changing model endpoints.
- AI Studio: chat streams from /api/studio (server fetches mirror data itself; draft_send only prepares a send, the user signs in-app) and images from /api/generate-image; chats, images and contacts live in localStorage so wallet data stays on the device.
- Hedera/WalletConnect SDKs are stubbed out of the server bundle in vite.config.ts; they crash the Worker at startup, so never use them server-side.
- Exchange prices use a shared read-only feed module behind /api/hbar-rates with no-store responses; manual and automatic refresh share one query, and unavailable markets never borrow another provider's rate.
- Exchange names and official destinations are paired in one browser-safe registry; keep rows in registry order during refresh to prevent moving click targets.
- Optional tap haptics use one root click listener and a browser-safe helper; this covers shared and legacy controls without double vibrations or blocking unsupported browsers.
- NFTs use paginated mainnet mirror ownership reads and inert HTTPS/IPFS image metadata; transfers recheck ownership and recipient eligibility, sign one serial through the existing signer, and require a SUCCESS receipt before reporting success.
- Brand-name displays use the shared OrionName artwork to preserve custom lettering across the header, launch, unlock and public shell without changing prose or accessible names.
- Pact uses one browser-safe PactPanel in Vault and the preserved /pact page, keeping payment checks and signing identical across entry points.
- General and security display preferences are schema-validated and device-local; the root applies themes, currency conversion and inactivity locks, leaving signing checks unchanged. Custom colors are validated hex values applied only to a root CSS token; preset and custom palettes derive shared card/action colors while preserving brand artwork and readable text.
