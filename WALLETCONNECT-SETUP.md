# Orion WalletConnect setup

## Owner configuration
1. Sign in at https://dashboard.reown.com. Confirm the project whose public ID is already configured in `src/lib/walletconnect.ts` belongs to you; otherwise create your own Orion project and supply its public Project ID for replacement. Never supply wallet keys, recovery words or dashboard credentials.
2. Configure allowed origins: `https://orion-hedera.app`, `https://www.orion-hedera.app`, `https://orion-hedera-app.lovable.app`, and the exact Lovable preview origin you use. Avoid a broad wildcard. The hosted iOS wrapper uses the same HTTPS origin.
3. Allowlist changes may take about 15 minutes to apply. See https://docs.reown.com/cloud/relay.
4. Install a supported Hedera wallet such as HashPack and select Hedera mainnet. Keep its backup outside Orion; WalletConnect does not require importing its recovery phrase.
5. Publish Orion after configuration changes.

## Verify before release
- Open Settings → Third party apps → Connect. Scan the QR using the external wallet, or use the available mobile wallet link. On one phone, use a wallet link or copy the connection URI into the wallet if supported.
- Check the external wallet shows Orion and the expected domain, then approve the connection. Confirm the numbered mainnet account appears in Orion.
- Disconnect, reconnect, reload Orion, and verify session restoration.
- Only with explicit owner approval, test a small mainnet transaction to an owner-controlled account. Check recipient, amount and network in the external wallet before signing; confirm the receipt succeeds and balances/history update. Mainnet fees apply.
- Test cancellation and rejected signatures. They must not report a successful payment.
- On a physical iPhone, verify leaving Orion for the external wallet and returning to the Capacitor wrapper. Mobile links, native return handling and signing are not verified by a QR-dialog check.

## Current verification
The installed Hedera connector opens a real WalletConnect QR dialog using the existing public project ID. Settings and wallet recovery expose the same connection panel. This does not verify project ownership, a wallet-approved connection, signing, or native iOS return behavior. No new native URL scheme is assumed.