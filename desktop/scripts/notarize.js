/**
 * macOS Notarization Script
 *
 * This script is called after signing to notarize the app with Apple.
 * Notarization is required for apps distributed outside the Mac App Store
 * on macOS 10.15+ to avoid Gatekeeper warnings.
 *
 * Required environment variables:
 * - APPLE_ID: Your Apple Developer account email
 * - APPLE_ID_PASSWORD: App-specific password (generate at appleid.apple.com)
 * - APPLE_TEAM_ID: Your Apple Developer Team ID
 *
 * To generate an app-specific password:
 * 1. Go to https://appleid.apple.com
 * 2. Sign in with your Apple ID
 * 3. Go to Security > App-Specific Passwords
 * 4. Click "Generate Password"
 */

const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize macOS builds
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization: not macOS');
    return;
  }

  // Check for required environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('Skipping notarization: missing Apple credentials');
    console.log('Set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID to enable notarization');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing ${appPath}...`);

  try {
    await notarize({
      appPath,
      appleId,
      appleIdPassword,
      teamId,
    });
    console.log('Notarization complete!');
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }
};
