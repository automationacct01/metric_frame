# Code Signing Guide for MetricFrame Desktop

This guide explains how to set up code signing for MetricFrame desktop releases on macOS, Windows, and Linux.

## Why Code Signing?

Code signing:
- Proves the app comes from a trusted source
- Prevents "unidentified developer" warnings
- Required for macOS Gatekeeper and Windows SmartScreen
- Enables automatic updates without security prompts

## macOS Code Signing

### Requirements
- Apple Developer account ($99/year)
- Developer ID Application certificate
- Developer ID Installer certificate (for .pkg files)

### Setup

1. **Join Apple Developer Program**
   - Visit [developer.apple.com](https://developer.apple.com)
   - Enroll in the Apple Developer Program

2. **Create Certificates**
   - Open Xcode > Preferences > Accounts
   - Select your team > Manage Certificates
   - Create "Developer ID Application" certificate
   - Create "Developer ID Installer" certificate (optional, for .pkg)

3. **Export Certificates for CI/CD**
   ```bash
   # Export from Keychain Access as .p12 file
   # Then base64 encode for GitHub Secrets
   base64 -i certificate.p12 | pbcopy
   ```

4. **Configure GitHub Secrets**
   - `APPLE_CERTIFICATE`: Base64-encoded .p12 certificate
   - `APPLE_CERTIFICATE_PASSWORD`: Certificate password
   - `APPLE_ID`: Your Apple ID email
   - `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password from appleid.apple.com
   - `APPLE_TEAM_ID`: Your team ID (from developer.apple.com)

5. **Update electron-builder config**
   ```yaml
   # desktop/electron-builder.yml
   mac:
     identity: "Developer ID Application: Your Name (TEAM_ID)"
     hardenedRuntime: true
     gatekeeperAssess: false
     entitlements: build/entitlements.mac.plist
     entitlementsInherit: build/entitlements.mac.plist
   afterSign: scripts/notarize.js
   ```

6. **Create Entitlements File**
   ```xml
   <!-- desktop/build/entitlements.mac.plist -->
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>com.apple.security.cs.allow-jit</key>
       <true/>
       <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
       <true/>
       <key>com.apple.security.cs.disable-library-validation</key>
       <true/>
   </dict>
   </plist>
   ```

7. **Create Notarization Script**
   ```javascript
   // desktop/scripts/notarize.js
   const { notarize } = require('@electron/notarize');

   exports.default = async function notarizing(context) {
     const { electronPlatformName, appOutDir } = context;
     if (electronPlatformName !== 'darwin') return;

     const appName = context.packager.appInfo.productFilename;

     return await notarize({
       appBundleId: 'com.metricframe.app',
       appPath: `${appOutDir}/${appName}.app`,
       appleId: process.env.APPLE_ID,
       appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
       teamId: process.env.APPLE_TEAM_ID,
     });
   };
   ```

### Local Testing

```bash
# Sign manually for testing
codesign --deep --force --verbose --sign "Developer ID Application: Your Name" MetricFrame.app

# Verify signature
codesign --verify --verbose MetricFrame.app
spctl --assess --verbose MetricFrame.app
```

---

## Windows Code Signing

### Requirements
- Code signing certificate from trusted CA
- Options: DigiCert, Sectigo, SSL.com (~$200-500/year)
- Or: Azure Trusted Signing (Microsoft, $9.99/month)

### Option 1: Traditional EV Certificate

1. **Purchase Certificate**
   - EV (Extended Validation) recommended for immediate trust
   - Standard OV certificates require reputation building

2. **Export Certificate**
   ```powershell
   # Export from Windows Certificate Store as .pfx
   # Or request .pfx directly from CA
   ```

3. **Configure GitHub Secrets**
   - `WINDOWS_CERTIFICATE`: Base64-encoded .pfx file
   - `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

4. **Update electron-builder config**
   ```yaml
   # desktop/electron-builder.yml
   win:
     certificateFile: ${env.WINDOWS_CERTIFICATE_FILE}
     certificatePassword: ${env.WINDOWS_CERTIFICATE_PASSWORD}
     signingHashAlgorithms: [sha256]
   ```

### Option 2: Azure Trusted Signing

1. **Set up Azure Account**
   - Create Azure subscription
   - Enable Trusted Signing service

2. **Configure in electron-builder**
   ```yaml
   win:
     azureSignOptions:
       endpoint: https://your-endpoint.codesigning.azure.net
       codeSigningAccountName: your-account
       certificateProfileName: your-profile
   ```

### Local Testing

```powershell
# Sign manually
signtool sign /f certificate.pfx /p PASSWORD /t http://timestamp.digicert.com MetricFrame.exe

# Verify
signtool verify /pa MetricFrame.exe
```

---

## Linux Code Signing

Linux apps don't require code signing like macOS/Windows, but you can:

### GPG Signing

1. **Generate GPG Key**
   ```bash
   gpg --full-generate-key
   gpg --armor --export YOUR_KEY_ID > public.key
   ```

2. **Sign AppImage**
   ```bash
   gpg --detach-sign --armor MetricFrame.AppImage
   ```

3. **Users Verify**
   ```bash
   gpg --verify MetricFrame.AppImage.asc MetricFrame.AppImage
   ```

---

## GitHub Actions Integration

Add to `.github/workflows/desktop-release.yml`:

```yaml
- name: Build and Sign (macOS)
  if: matrix.platform == 'mac'
  working-directory: desktop
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CSC_LINK: ${{ secrets.APPLE_CERTIFICATE }}
    CSC_KEY_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  run: npm run build:mac

- name: Build and Sign (Windows)
  if: matrix.platform == 'win'
  working-directory: desktop
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CSC_LINK: ${{ secrets.WINDOWS_CERTIFICATE }}
    CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
  run: npm run build:win
```

---

## Cost Summary

| Platform | Option | Cost |
|----------|--------|------|
| macOS | Apple Developer | $99/year |
| Windows | EV Certificate | $200-500/year |
| Windows | Azure Trusted Signing | $9.99/month |
| Linux | GPG (self-signed) | Free |

---

## Without Code Signing

If you don't set up code signing:

### macOS
Users see "cannot be opened because the developer cannot be verified"
- Workaround: Right-click > Open, or System Preferences > Security

### Windows
Users see SmartScreen warning "Windows protected your PC"
- Workaround: Click "More info" > "Run anyway"

### Linux
No warnings for unsigned apps

---

## Recommendations

1. **For Open Source Projects**: Start without signing, add later if needed
2. **For Commercial Distribution**: Sign immediately for professional appearance
3. **Minimum Investment**: macOS signing ($99) has the most user impact
4. **Full Coverage**: macOS + Windows Azure Signing = ~$220/year
