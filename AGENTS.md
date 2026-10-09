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
- Hedera mainnet only; reads go through the public mirror node from the browser (no server needed for public chain data).
- Device keys live only in localStorage, AES-GCM encrypted with an Argon2id-derived key; never sent to the server.
- WalletConnect signing uses @hiero-ledger/sdk classes (the version hedera-wallet-connect depends on); local-key signing uses @hashgraph/sdk. Mixing them fails type checks.
- AI activity answers: server route /api/ask fetches mirror-node data itself (never trusts client-supplied history) and streams via the Responses API.
- Biometric unlock uses WebAuthn PRF to encrypt the device passphrase locally (aurion.bio); the private key is still only decrypted by the passphrase, so biometrics never weaken the keystore.
- App branding uses one shared AurionLogo component backed by a CDN asset pointer; the favicon is a small local derivative of the same artwork so branding stays consistent.
