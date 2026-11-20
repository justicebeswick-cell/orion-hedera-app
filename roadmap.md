# Roadmap
- [x] Refine shared glass surfaces and Home hierarchy; add device-local portfolio observations with 1D/1W/1M/3M/1Y/All controls. Real mainnet valuations, persisted chart observations, All selection and Send navigation verified at 320/390/844/1280px; 22 focused checks pass. History starts on this device, not a fabricated historical return; physical iPhone rendering remains unverified.
- [x] Repair startup layer loading, center branding across phone sizes, and verify smooth single-orbit transitions without toolbar bleed-through; slow-image startup and Settings navigation checked at 390/542/844/890px. Physical iPhone rendering still requires an owner device check.
- [x] Apply supplied full-bleed Duo CSS: html/body/#root at 100dvh pure black, body owns four safe-area insets, bottom nav fixed at bottom 0 with 12px+inset padding, shells de-duplicated; verified folded/unfolded widths, no overflow, 166 tests pass.
- [x] Apply supplied full-screen spacing and translucent dock; exact viewport retained, 23 regression checks pass, Home/Settings/Vault navigation verified at 390/690/844/890/1280px with simulated cutouts and no runtime errors. Request republication; actual iOS 27 system chrome and native wrapper still require physical-device testing.
- [x] Apply uploaded full-bleed black canvas and 8px-inset transparent blurred dock without fixing internal tabs; verified edge-to-edge shells, inset controls and Home/Settings navigation at 390/431/844/890/1280px with no runtime errors; 23 preference tests pass. Physical Duo rendering remains unverified without the owner's device; request republication.
- [x] Apply the exact full-screen viewport, single safe-area spacing and seamless bottom toolbar; Home/Settings navigation verified at 390/431/844/890/1280px with simulated four-sided insets, no horizontal clipping and 23 preference tests passing. Request publication; physical Duo confirmation requires the owner's device.
- [x] Remove third-party wallet connection choices from Settings and recovery again at the owner's request; the code, setup checklist (WALLETCONNECT-SETUP.md) and Reown/QR wiring stay in the repo for a later re-enable.
- [ ] When re-enabled: verify WalletConnect project ownership, domain allowlist, wallet-approved pairing/signing/reconnect and native iOS return — requires the owner's Reown account, wallet approval and physical iPhone.
- [x] Refine shared typography, focus and motion without changing the approved layout; strengthen new-wallet encryption and preserve legacy access. Phone/desktop creation, backup, save and reload verified; physical iPhone performance and independent security audit remain unverified.
- [x] Fix optional QR scan preview errors; preview builds cleanly, 30 regression checks pass, and Receive/Send/QR navigation works without browser runtime errors.
- [x] Apply uploaded adaptive edge-to-edge brief: floating glass dock, 680px/4:5 automatic side rail, dock shortcuts and two-pane Home; verified 390/640/641/890px widths without horizontal overflow. Physical iOS/device rendering still requires Mac/Xcode testing.
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
