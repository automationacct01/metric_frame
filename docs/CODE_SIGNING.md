# Code Signing & Download Verification Guide

This guide covers macOS code signing and SHA256 checksum verification for MetricFrame releases.

---

## Signing Strategy

| Platform | Approach | Why |
|----------|----------|-----|
| **macOS** | Code signed + notarized | Gatekeeper blocks unsigned apps aggressively |
| **Windows** | Unsigned + SHA256 checksums | Standard for open-source; SmartScreen has a simple bypass |
| **Linux** | Unsigned + SHA256 checksums | Standard for all Linux apps |

**Cost:** $99/year (Apple Developer Program only)

---

## Part 1: macOS Code Signing & Notarization

### Step 1: Enroll in Apple Developer Program

1. Go to https://developer.apple.com/programs/
2. Click "Enroll"
3. Sign in with your Apple ID (or create one)
4. Pay **$99/year**
5. Wait for approval (usually 24-48 hours)

### Step 2: Create Signing Certificates

1. Go to https://developer.apple.com/account/resources/certificates/list
2. Click the **+** button to create a new certificate
3. Select **"Developer ID Application"** (for apps distributed outside App Store)
4. Follow the prompts to create a Certificate Signing Request (CSR):
   - Open **Keychain Access** on your Mac
   - Menu: **Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority**
   - Enter your email, leave CA Email blank
   - Select **"Saved to disk"**
   - Save the `.certSigningRequest` file
5. Upload the CSR to Apple's portal
6. Download the certificate (`.cer` file)
7. Double-click to install it in Keychain

### Step 3: Export the Certificate as .p12

1. Open **Keychain Access**
2. Find your "Developer ID Application" certificate under "My Certificates"
3. Right-click → **Export**
4. Save as `.p12` format
5. Set a strong password (you'll need this later)

### Step 4: Generate App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in → **Security** → **App-Specific Passwords**
3. Click **Generate Password**
4. Name it "MetricFrame Notarization"
5. Copy the password (format: `xxxx-xxxx-xxxx-xxxx`)

### Step 5: Find Your Team ID

1. Go to https://developer.apple.com/account
2. Click **Membership Details**
3. Copy your **Team ID** (10-character string like `ABC1234DEF`)

### Step 6: Base64 Encode Your Certificate

Run this command to copy the base64-encoded certificate to your clipboard:

```bash
base64 -i ~/path/to/certificate.p12 | pbcopy
```

---

## Part 2: GitHub Secrets Configuration

Go to your repository settings: **Settings → Secrets and variables → Actions**

URL: https://github.com/automationacct01/metric_frame/settings/secrets/actions

### Required Secrets (macOS only)

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `CSC_LINK` | Base64 string | Your .p12 certificate (base64 encoded) |
| `CSC_KEY_PASSWORD` | Password | Password you set when exporting .p12 |
| `APPLE_ID` | Email | Your Apple Developer account email |
| `APPLE_ID_PASSWORD` | `xxxx-xxxx-xxxx-xxxx` | App-specific password from Step 4 |
| `APPLE_TEAM_ID` | `ABC1234DEF` | 10-character Team ID |

No secrets are needed for Windows or Linux builds.

---

## Part 3: Triggering a Signed Build

Once all secrets are configured, push to the public repository:

```bash
git push public main
```

The GitHub Action will automatically:
1. Build the frontend and backend for each platform
2. Sign and notarize the macOS app with your Developer ID certificate
3. Build unsigned Windows and Linux installers
4. Generate SHA256 checksums for all artifacts
5. Create a GitHub Release with all artifacts and checksums

---

## Part 4: SHA256 Checksum Verification

Every release includes a `checksums-sha256.txt` file that users can use to verify their downloads haven't been tampered with. This provides integrity verification for all platforms, regardless of code signing.

### How it works

The GitHub Actions workflow:
1. Builds all platform artifacts (`.dmg`, `.exe`, `.AppImage`, `.deb`)
2. Generates SHA256 hashes of every artifact
3. Publishes `checksums-sha256.txt` alongside the release

### User verification

**macOS / Linux:**
```bash
# Download the checksums file from the release
curl -LO https://github.com/automationacct01/metric_frame/releases/latest/download/checksums-sha256.txt

# Verify your downloaded file matches
sha256sum -c checksums-sha256.txt --ignore-missing
# Expected output: MetricFrame-1.0.0-mac-arm64.dmg: OK
```

**Windows (PowerShell):**
```powershell
# Get the hash of your downloaded file
Get-FileHash .\MetricFrame-Setup-1.0.0.exe -Algorithm SHA256

# Compare the output hash with the value in checksums-sha256.txt
```

### Why checksums matter

- **Code signing** proves the author is who they claim to be (identity)
- **Checksums** prove the file hasn't been modified since release (integrity)
- Together they provide full supply-chain verification
- Even with macOS code signing, checksums are a useful second layer

---

## Part 5: Local Signing (Optional)

To build and sign locally without GitHub Actions:

### macOS

```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=yourpassword
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=ABC1234DEF

cd desktop
npm run build:mac
```

### Verify macOS Signature

```bash
# Check code signature
codesign --verify --verbose /Applications/MetricFrame.app

# Check notarization status
spctl --assess --verbose /Applications/MetricFrame.app

# Check entitlements
codesign -d --entitlements - /Applications/MetricFrame.app
```

---

## Unsigned Platforms: User Workarounds

### Windows

SmartScreen may show "Windows protected your PC". This is expected for unsigned apps.

1. Click **"More info"**
2. Click **"Run anyway"**

Users can verify integrity with the SHA256 checksum before running.

### Linux

No workaround needed. AppImage files run directly:
```bash
chmod +x MetricFrame-*.AppImage
./MetricFrame-*.AppImage
```

---

## Troubleshooting

### macOS: "The application is damaged"

This means the app wasn't signed or notarized. Check:
1. All `APPLE_*` secrets are set correctly
2. The `CSC_LINK` is properly base64 encoded
3. Check GitHub Actions logs for signing/notarization errors

### macOS: Notarization fails

Common issues:
- App-specific password expired (regenerate at appleid.apple.com)
- Team ID incorrect (verify at developer.apple.com)
- Certificate expired (renew in Apple Developer portal)
- Entitlements missing required permissions

### Build succeeds but app crashes on launch

Code signing doesn't affect functionality. Debug by:
1. Check the app logs: `~/Library/Application Support/MetricFrame/logs/`
2. Run from terminal to see errors: `open /Applications/MetricFrame.app`

---

## Security Notes

- **Never commit certificates** to the repository
- Store certificates securely (password manager, secure drive)
- Use separate app-specific passwords for CI/CD
- Rotate certificates before expiration
- Keep your Apple Developer account secure with 2FA
- SHA256 checksums are generated in CI — they cannot be tampered with after build
