import UIKit
import Capacitor
import LocalAuthentication
import Security

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

// The WebView fills its window; CSS protects controls with four-sided safe areas.
class OrionViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(OrionBiometricVault())
        webView?.scrollView.bounces = false
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.backgroundColor = .black
        webView?.isOpaque = false
    }
}

@objc(OrionBiometricVault)
public class OrionBiometricVault: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OrionBiometricVault"
    public let jsName = "OrionBiometricVault"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "enroll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise)
    ]
    private let service = "app.orionhedera.wallet.biometric"
    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: "active-wallet-code",
         kSecAttrSynchronizable as String: false]
    }
    private func trusted(_ call: CAPPluginCall) -> Bool {
        guard let url = bridge?.webView?.url,
              url.scheme == "https", url.host == "orion-hedera.app" else {
            call.reject("Wallet origin not permitted")
            return false
        }
        return true
    }
    @objc public func enroll(_ call: CAPPluginCall) {
        guard trusted(call), let code = call.getString("code"),
              let binding = call.getString("binding"), !binding.isEmpty,
              [4, 6, 8].contains(code.count), code.allSatisfy({ $0.isNumber }) else {
            call.reject("Wallet code or binding missing")
            return
        }
        let context = LAContext()
        context.localizedFallbackTitle = ""
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            call.reject("Face ID or Touch ID unavailable. Use your wallet code.")
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                               localizedReason: "Enable biometric approval for your Orion wallet") { success, _ in
            guard success else { call.reject("Biometric setup cancelled"); return }
            guard let access = SecAccessControlCreateWithFlags(nil,
                kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, nil),
                let data = try? JSONSerialization.data(withJSONObject: ["code": code, "binding": binding]) else {
                call.reject("Keychain protection unavailable"); return
            }
            var item = self.query
            item[kSecAttrAccessControl as String] = access
            item[kSecValueData as String] = data
            // Store fails closed: no plaintext fallback and no iCloud sync.
            SecItemDelete(self.query as CFDictionary)
            let status = SecItemAdd(item as CFDictionary, nil)
            guard status == errSecSuccess else { call.reject("Keychain setup failed. Use your wallet code."); return }
            call.resolve()
        }
    }
    @objc public func unlock(_ call: CAPPluginCall) {
        guard trusted(call) else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            let context = LAContext()
            context.localizedReason = "Approve access to your Orion wallet"
            context.localizedFallbackTitle = ""
            var item = self.query
            item[kSecReturnData as String] = true
            item[kSecMatchLimit as String] = kSecMatchLimitOne
            item[kSecUseAuthenticationContext as String] = context
            var result: CFTypeRef?
            let status = SecItemCopyMatching(item as CFDictionary, &result)
            guard status == errSecSuccess, let data = result as? Data,
                  let payload = (try? JSONSerialization.jsonObject(with: data)) as? [String: String],
                  let code = payload["code"], let binding = payload["binding"] else {
                call.reject("Biometric Keychain unlock failed. Use your wallet code."); return
            }
            call.resolve(["code": code, "binding": binding])
        }
    }
    @objc public func remove(_ call: CAPPluginCall) {
        guard trusted(call) else { return }
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            call.reject("Keychain removal failed"); return
        }
        call.resolve()
    }
}
