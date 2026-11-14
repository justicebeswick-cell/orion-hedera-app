# Roadmap
- [ ] Apply uploaded adaptive edge-to-edge brief: floating glass dock, 680px/4:5 automatic side rail, dock shortcuts and two-pane Home; verify browser layout. Physical iOS 27.3/device rendering requires Mac/Xcode testing.
- [x] Verify installed Capacitor core/CLI/iOS/Haptics; retain safe-area header spacing and touch styles, add full bottom inset to navigation, use the bounce-free Orion controller on iOS scene launches, and test light feedback for navigation/address-copy/confirmation controls.
- [x] Prepare Capacitor iOS/Android projects, native tap haptics, biometric-bound iOS Keychain unlock and mobile touch styles; 19 related tests pass. Mac setup and production limitations are in IOS-SETUP.md.
- [ ] Compile/sign wrapper and verify Face ID, startup artwork, permissions and full-window layout on a physical iPhone — requires the user's Mac/Xcode and device. Native Android biometric unlock and broader secure-storage migration are not implemented.
- [x] Reinforce full-width document, wallet/public shells and main content, dynamic viewport height, safe-area edges and matching theme backgrounds; verified 466px/890px, rotation, 1280px, simulated cutouts and Vault navigation. Physical iPhone standalone confirmation awaits publication/device check.
- [x] Apply full-bleed folded/unfolded Home Screen layout, translucent iOS status bar, and four-sided safe areas without changing wallet behavior; verified 466px/890px layouts, rotation, simulated cutouts and Vault navigation. Physical iOS standalone rendering awaits publication and a device check.
- [x] Add mainnet NFT receiving checks and signed collection association in Receive and NFTs; 30 related tests pass and public receiving screens verified. A real HashPack transfer into the user's wallet remains unverified without their account/collection and approval.
- [x] Restore normal ORION lettering dimensions while retaining the shared softly shaded O; prevent icon-button sizing from shrinking the lettering.
- [x] Apply the subtle shaded second O consistently to ORION lettering throughout the app, preserving each screen's size.
- [x] Enlarge the welcome-page ORION lettering again and move it further up.
- [x] Refine welcome-page ORION lettering to match the supplied O reference with a subtle shadow; move it higher and slightly widen it.
- [x] Center the larger ORION lettering above the main welcome logo, with the greeting beneath.
- [x] Remove the welcome-page header branding and enlarge the main ORION lettering.
- [x] Remove the welcome-page logo's black box and match Home's transparent logo and selected-theme halo.
- [x] Request publication of the welcome logo refinement and WalletConnect configuration; deployment completion not yet verified.
- [x] Sharpen the phone icon using Home's circular ring geometry at high resolution, with the mark about 60% of the tile; unlock-screen logos use Home's crisp transparent rendering.
- [x] Supply transparent circular launch artwork for the phone-generated startup screen; keep installed maskable tile artwork and Orion's animated launch screen. Actual Android splash selection requires a phone check after publication/reinstallation.

- [x] Sharpen Home logo with resolution-independent circular rings and a theme-matched glow; loading screen and phone icons unchanged.

- [x] Remove the in-app light-mode logo box with a circular sphere mask and contrasting rings; dark mode, launch and installed icon unchanged.

- [x] Remove loading-logo square background and center perfect circular rings for a smooth orbit; installed icon unchanged.

- [x] Apply the refined black sphere and white rings throughout the app, loading screen, favicon and installed icon.

- [x] Refine white-theme icon with smooth slender rings and satin-black sphere; permanent v37 icons and matching favicon; not yet published.
- [x] Make the installed app icon logo smaller: mark now spans ~60% of the tile (was ~80%), re-centered with even padding; v38 icons + manifest-v39; not yet published.

- [x] Make white-theme home-screen icon black with a black sphere and white rings; in-app colors unchanged, Chrome resources verified; not yet published.

- [x] Repair Chrome shortcut saving with permanent manifests and theme icons; Chrome parses Blue without errors, all icon downloads succeed, theme survives reload; real phone saving awaits publishing/device check.

- [x] Deepen Blue theme's Send button to royal blue; verified finish and prepared for publishing.
- [x] Restore the purple sphere/orbit logo shown in the reference, including loading mark and icons.
- [x] Make logo, Send, Swap and app accents follow preset/custom themes; verified Blue, purple presets, Custom and light mode.

- [x] Refine Eclipse Star logo: sleeker, purple crescent; updated app artwork + v31 icons
- [x] Thicker white ring + bigger purple crescent; rolled through app artwork + v32 icons
- [x] Neon hash purple (#41149b→#793be3), crescent = 1/3 of circle; v33 icons
- [x] Use user uploaded picture as app icon (v40)

## Nov 2026 batch
- [x] Incoming tokens: pending airdrop card, Accept & Associate, auto-associate setting
- [x] NFT details: royalties, creator, pause/KYC/freeze flags
- [x] Multi-account Ed25519 + ECDSA from one seed, protected key export (mainnet only, no testnet switch)
- [x] HCS audit memo on sends (user pays per memo) + verified badge in history
- [x] Studio Discover dApp browser + WalletConnect approvals; public Reown project ID configured (real dApp pairing/signing still needs verification)
- [x] Watch-only cold accounts (Ledger/Tangem) with unsigned payload QR
- [x] Studio: create and mint NFTs, and create your own tokens
- [x] Home: friendly empty token state; HBAR row links to history
- [x] Claim rewards: helper text for 0.00 ħ
- [x] Bottom nav: glowing active indicator

## Nov 14
- [x] Side tab bar blends into the iPhone Duo strip (no divider, glass fade, iOS-style active pill)
- [ ] Confirm wrapper layout around the OS strip on the physical iPhone — requires Mac/Xcode/device testing; OS-protected areas cannot be overridden.

- [x] Custom domain chosen and registered: orion-hedera.app; configured as the hosted wrapper origin. Availability must be checked before device installation.
