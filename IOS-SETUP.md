# Orion native wrapper

## What is included

Capacitor 8 projects for iOS and Android, native tap haptics, a full-window iOS WebView with pull-to-refresh disabled, safe-area-aware web controls, and native iOS Face ID/Touch ID unlock. The native Keychain requires the currently enrolled biometrics before releasing the verified wallet code; changing the enrolled biometrics invalidates that item. The code is bound to the encrypted wallet revision, never stored in browser storage, never synced to iCloud, and never sent to Orion's server. Existing AES-GCM/Argon2id wallet-key storage is unchanged. Android keeps existing WebAuthn/code unlock; native Android biometric storage is not implemented.

The two community plugin names in the supplied checklist do not exist in the npm registry. Supported Aparajita biometric and secure-storage plugins are installed instead. Secure-storage's general API does not enforce biometric access, so Orion uses an app-owned iOS Keychain plugin for biometric codes rather than an insecure prompt-then-read fallback. No automatic wallet or preference migration is performed.

## Hosted app, not static dist

This app uses server-backed AI and uploads. Its Vite output is **not** a self-contained static website. `capacitor.config.ts` loads `https://orion-hedera.app` over HTTPS; `native-web` is the required local asset directory. Publish the web changes before testing the wrapper. Capacitor documents `server.url` for live reload, not as its recommended production packaging approach; this hosted wrapper requires a deliberate production security/review decision. For bundled production assets, a separate static-client build and explicit remote API/auth design are needed. There is no offline wallet promise.

Never add marketplace or arbitrary domains to `allowNavigation`: external pages must open outside the privileged wallet WebView. Keep the exact wallet origin stable because browser storage and WebAuthn credentials are origin-specific.

## On your Mac

1. Download/clone the project source from Lovable. Install Node 22+ and the Xcode version required by Capacitor 8 (check the installed platform release requirements). No Xcode or iOS SDK has been run in Lovable's Linux environment.
2. In the project folder run:

```sh
npm install
npm run ios:sync
npm run ios:open
```

Do **not** run `cap init` or `cap add ios` again: those projects already exist. A local web build is not required for this hosted wrapper; Lovable builds and deploys the hosted app when publishing.

3. In Xcode select **App → Signing & Capabilities**, choose your Apple team and confirm the provisional bundle ID `app.orionhedera.wallet` is yours/available. If changing it, update both Capacitor configuration and the Xcode target before syncing.
4. Select your connected iPhone and run. The project keeps iPhone/iPad and rotation support. The iOS deployment target is the generated minimum; use the SDK installed with your supported Xcode rather than typing an unverified SDK version.
5. Import a **test wallet** first. Safari/Home Screen and the native app have separate storage; they do not share saved wallets. Back up your phrase before switching. Enable biometrics under Settings → Security using the correct wallet code.

## Device release checklist

- Confirm full-window background, clock/status cutouts, home indicator, keyboard, rotation, folded/unfolded displays, and Side/Bottom tab-bar choices. A WebView fills its window but cannot override hardware or OS-protected regions.
- Confirm real Face ID enrollment, cancellation, repeated unlock, approval on each signature, wallet switching, code rotation, and failure after changing enrolled biometrics. Code unlock must remain usable; never test destructive changes on a funded wallet.
- Confirm haptics on/off, wallet creation/import, NFT receiving, dApp links, WalletConnect pairing, and image upload permissions. Camera/photo permissions and OAuth/native deep-link handling need device validation before release.
- Native startup is deliberately black to match Orion's default theme; the hosted page restores selected themes. Avoid claiming that a static storyboard follows saved web preferences.
- Replace generated native icons/splash placeholders with approved Orion artwork before distribution. Configure camera/photo permission descriptions if those features are used in the wrapper.
- Test network failure and domain TLS availability. Review hosted-code integrity, app privacy declarations, export compliance and wallet/crypto App Store requirements.

Native plugins do not guarantee App Store approval under Guideline 4.2 or financial/crypto rules. Xcode compilation, signing, simulator and physical-device checks remain to be performed on a Mac. No signed app archive was produced here.