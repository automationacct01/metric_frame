/**
 * macOS Notarization Script
 *
 * Called by electron-builder's afterSign hook to notarize the app with Apple.
 * Notarization is required for apps distributed outside the Mac App Store
 * on macOS 10.15+ to avoid Gatekeeper warnings.
 *
 * Required environment variables:
 * - APPLE_ID: Your Apple Developer account email
 * - APPLE_ID_PASSWORD: App-specific password (generate at appleid.apple.com)
 * - APPLE_TEAM_ID: Your Apple Developer Team ID
 *
 * Optional environment variables:
 * - NOTARIZE_TIMEOUT: Timeout in ms (default: 1800000 = 30 min)
 * - SKIP_NOTARIZATION: Set to 'true' to skip entirely (dev builds)
 * - NOTARIZE_SUBMIT_ONLY: Set to 'true' to submit but not wait
 */

const { notarize } = require('@electron/notarize');
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    console.log('[notarize] Skipping: not macOS');
    return;
  }

  if (process.env.SKIP_NOTARIZATION === 'true') {
    console.log('[notarize] Skipping: SKIP_NOTARIZATION=true');
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('[notarize] Skipping: missing Apple credentials');
    console.log('[notarize] Set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID to enable');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);
  const timeoutMs = parseInt(process.env.NOTARIZE_TIMEOUT || '1800000', 10);
  const submitOnly = process.env.NOTARIZE_SUBMIT_ONLY === 'true';

  console.log(`[notarize] App: ${appPath}`);
  console.log(`[notarize] Timeout: ${timeoutMs / 1000}s`);

  if (submitOnly) {
    console.log('[notarize] Submit-only mode: submitting without waiting...');
    try {
      await submitWithoutWaiting(appPath, appleId, appleIdPassword, teamId);
      console.log('[notarize] Submitted. Run manual-notarize.sh to check status and staple.');
    } catch (error) {
      console.error('[notarize] Submit failed:', error.message);
      console.log('[notarize] Build will continue without notarization.');
    }
    return;
  }

  console.log('[notarize] Starting notarization...');
  const startTime = Date.now();

  try {
    await Promise.race([
      notarize({
        tool: 'notarytool',
        appPath,
        appBundleId: 'com.metricframe.app',
        appleId,
        appleIdPassword,
        teamId,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Notarization timed out after ${timeoutMs / 1000}s`)),
          timeoutMs,
        ),
      ),
    ]);

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[notarize] SUCCESS: Completed in ${elapsed}s`);
  } catch (error) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (error.message.includes('timed out')) {
      console.error(`[notarize] TIMEOUT after ${elapsed}s`);
      console.log('[notarize] Apple notarization service may be slow.');
      console.log('[notarize] =====================================================');
      console.log('[notarize] MANUAL FOLLOW-UP REQUIRED:');
      console.log('[notarize]   1. Check status:');
      console.log('[notarize]      cd desktop && bash scripts/manual-notarize.sh history');
      console.log('[notarize]   2. When "Accepted":');
      console.log('[notarize]      bash scripts/manual-notarize.sh staple');
      console.log('[notarize]   3. Rebuild DMG:');
      console.log('[notarize]      bash scripts/manual-notarize.sh dmg');
      console.log('[notarize] =====================================================');
      console.log('[notarize] Build continues. App is signed but NOT yet notarized.');
      return;
    }

    console.error(`[notarize] FAILED after ${elapsed}s:`, error.message);
    throw error;
  }
};

async function submitWithoutWaiting(appPath, appleId, appleIdPassword, teamId) {
  const appDir = path.dirname(appPath);
  const appBasename = path.basename(appPath);
  const zipPath = `/tmp/${path.parse(appBasename).name}-notarize.zip`;

  console.log(`[notarize] Creating zip: ${zipPath}...`);
  execSync(
    `ditto -c -k --sequesterRsrc --keepParent "${appBasename}" "${zipPath}"`,
    { cwd: appDir, stdio: 'inherit' },
  );

  console.log('[notarize] Submitting to Apple (no --wait)...');
  const result = execSync(
    `xcrun notarytool submit "${zipPath}" ` +
      `--apple-id "${appleId}" ` +
      `--password "${appleIdPassword}" ` +
      `--team-id "${teamId}" ` +
      `--output-format json`,
    { encoding: 'utf-8', timeout: 120000 },
  );

  const parsed = JSON.parse(result.trim());
  console.log(`[notarize] Submission ID: ${parsed.id}`);
  console.log(`[notarize] Status: ${parsed.status || parsed.message}`);

  try {
    execSync(`rm -f "${zipPath}"`, { stdio: 'ignore' });
  } catch (_) {}

  return parsed.id;
}
