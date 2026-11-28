# Installing Save Fit on an iPhone with Xcode (free Apple ID)

You need a Mac with Xcode, your iPhone and a USB cable. A free Apple ID works; the app then expires after 7 days (re-run step 4 to renew) and you can have 3 such apps at once.

1. Pull the latest code, then in `apps/mobile`:
   ```
   npm install
   npx expo prebuild -p ios --clean
   ```
   This creates the `ios/` folder (it's not committed; recreate it whenever native settings change).
2. Open `apps/mobile/ios/SaveFit.xcworkspace` in Xcode (the .xcworkspace, not the .xcodeproj).
3. Click the **SaveFit** project → **SaveFit** target → **Signing & Capabilities**: tick *Automatically manage signing* and pick your **Personal Team**. If Xcode says the bundle identifier is taken, re-run step 1 with `IOS_BUNDLE_ID=com.yourname.savefit npx expo prebuild -p ios --clean`.
4. On the iPhone turn on **Settings → Privacy & Security → Developer Mode** (it restarts). Plug it in, pick it as the run destination in Xcode's toolbar and press **Run** (⌘R).
5. The first launch is blocked until you trust the developer: **Settings → General → VPN & Device Management → your Apple ID → Trust**.

**Debug vs Release.** The default *Debug* build loads its JavaScript from Metro, so keep `npx expo start` running on the Mac (same Wi-Fi). For an app that works on its own, choose **Product → Scheme → Edit Scheme → Run → Build Configuration: Release** and run again.

**What's different from Expo Go**
- Voice commands work (they need this build). iOS asks for the microphone and speech recognition the first time you turn them on.
- The share sheet ("Share → Save Fit") is off for now: it needs an App Group, which free Apple IDs can't sign. With a paid account, prebuild with `SAVEFIT_IOS_SHARE=1` to include it.
- The import server is reached over your local network: iOS asks for Local Network access the first time. Allow it, or imports can't reach the server.
