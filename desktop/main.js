/**
 * MetricFrame Desktop App - Electron Main Process
 *
 * This is the main entry point for the desktop application.
 * It manages:
 * - Starting the Python backend server
 * - Loading the frontend UI
 * - Application lifecycle (start, quit)
 */

const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const Store = require('electron-store');

// Configuration store
const store = new Store({
  defaults: {
    windowBounds: { width: 1400, height: 900 },
    backendPort: 8000,
    tlsEnabled: false,
  }
});

// Global references
let mainWindow = null;
let backendProcess = null;
let isQuitting = false;
let startupStatus = 'Initializing...';

// Determine if running in development or production
const isDev = process.argv.includes('--dev');
const resourcesPath = isDev
  ? path.join(__dirname, '..')
  : process.resourcesPath;

// Log file for debugging
const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, 'metricframe.log');

/**
 * Initialize logging
 */
function initLogging() {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    // Clear old log on startup
    const startMsg = `MetricFrame started at ${new Date().toISOString()}\n`;
    fs.writeFileSync(logFile, startMsg);
    console.log(`Logging initialized: ${logFile}`);
  } catch (err) {
    // If logging fails, write to stderr and continue
    console.error('CRITICAL: Failed to init logging:', err);
    console.error('Log directory:', logDir);
    console.error('Log file:', logFile);
    // Don't throw - continue without file logging
  }
}

/**
 * Check if a port is available
 */
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true); // Other errors, try anyway
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Log message to file and console
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  try {
    fs.appendFileSync(logFile, logMessage + '\n');
  } catch (err) {
    // Ignore log write errors
  }
}

/**
 * Get the path to the Python backend executable
 */
function getBackendPath() {
  if (isDev) {
    // In development, use the Python from the backend venv
    return {
      command: path.join(resourcesPath, 'backend', '.venv', 'bin', 'python'),
      args: ['-m', 'uvicorn', 'src.main:app', '--host', '127.0.0.1', '--port', '8000'],
      cwd: path.join(resourcesPath, 'backend'),
    };
  } else {
    // In production, use the PyInstaller bundle
    const platform = process.platform;
    const backendDir = path.join(resourcesPath, 'backend');

    if (platform === 'win32') {
      return {
        command: path.join(backendDir, 'metricframe-backend.exe'),
        args: [],
        cwd: backendDir,
      };
    } else {
      return {
        command: path.join(backendDir, 'metricframe-backend'),
        args: [],
        cwd: backendDir,
      };
    }
  }
}

/**
 * Get the path to the frontend files
 */
function getFrontendPath() {
  if (isDev) {
    // In development, use Vite dev server
    return 'http://localhost:5175';
  } else {
    // In production, load from bundled files
    return `file://${path.join(resourcesPath, 'frontend', 'index.html')}`;
  }
}

/**
 * Remove macOS quarantine attribute from backend executable
 * This is needed for unsigned apps downloaded from the internet
 */
function removeQuarantineAttribute(filePath) {
  if (process.platform !== 'darwin') return true;

  try {
    log(`Removing quarantine attribute from: ${filePath}`);
    execSync(`xattr -rd com.apple.quarantine "${filePath}" 2>/dev/null || true`, { stdio: 'ignore' });
    return true;
  } catch (err) {
    log(`Warning: Could not remove quarantine attribute: ${err.message}`, 'WARN');
    return false;
  }
}

/**
 * Verify backend executable exists and is executable
 */
function verifyBackendExecutable() {
  const config = getBackendPath();

  log(`Verifying backend executable: ${config.command}`);

  if (!fs.existsSync(config.command)) {
    throw new Error(`Backend executable not found at: ${config.command}`);
  }

  // Check if executable (Unix-like systems)
  if (process.platform !== 'win32') {
    try {
      fs.accessSync(config.command, fs.constants.X_OK);
    } catch (err) {
      log(`Making backend executable: ${config.command}`);
      try {
        fs.chmodSync(config.command, 0o755);
      } catch (chmodErr) {
        throw new Error(`Cannot make backend executable: ${chmodErr.message}`);
      }
    }

    // Remove quarantine attribute on macOS
    removeQuarantineAttribute(config.command);
  }

  log('Backend executable verified');
  return config;
}

/**
 * Update the splash screen status
 */
function updateSplashStatus(status) {
  startupStatus = status;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(`
      if (document.getElementById('status')) {
        document.getElementById('status').textContent = '${status}';
      }
    `).catch(() => {});
  }
}

/**
 * Start the Python backend server
 */
function startBackend() {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if port 8000 is available before starting
      const portAvailable = await checkPortAvailable(8000);
      if (!portAvailable) {
        log('Port 8000 is already in use!', 'ERROR');
        reject(new Error('Port 8000 is already in use. Please close any other MetricFrame instances or applications using this port.'));
        return;
      }
      log('Port 8000 is available');

      const config = verifyBackendExecutable();

      log(`Starting backend: ${config.command} ${config.args.join(' ')}`);
      updateSplashStatus('Starting backend server...');

      // Check TLS setting
      const tlsEnabled = store.get('tlsEnabled', false);
      log(`TLS mode: ${tlsEnabled ? 'HTTPS' : 'HTTP'}`);

      // Generate TLS certificate if enabled and missing
      let sslKeyFile = '';
      let sslCertFile = '';
      if (tlsEnabled) {
        const certDir = path.join(app.getPath('userData'), 'certs');
        const certPath = path.join(certDir, 'metricframe.crt');
        const keyPath = path.join(certDir, 'metricframe.key');

        if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
          log('Generating TLS certificate...');
          updateSplashStatus('Generating security certificate...');
          try {
            if (!fs.existsSync(certDir)) {
              fs.mkdirSync(certDir, { recursive: true });
            }
            if (isDev) {
              // Dev: use Python from venv
              const pythonCmd = path.join(resourcesPath, 'backend', '.venv', 'bin', 'python');
              execSync(`"${pythonCmd}" -m src.services.tls_cert "${certDir}" metricframe`, {
                cwd: path.join(resourcesPath, 'backend'),
                stdio: 'pipe',
              });
            } else {
              // Production: use PyInstaller binary with --generate-cert flag
              execSync(`"${config.command}" --generate-cert "${certDir}" metricframe`, {
                cwd: config.cwd,
                stdio: 'pipe',
              });
            }
            log('TLS certificate generated');
          } catch (certErr) {
            log(`Failed to generate certificate: ${certErr.message}`, 'ERROR');
            log('Falling back to HTTP', 'WARN');
            store.set('tlsEnabled', false);
          }
        } else {
          log('Using existing TLS certificate');
        }

        // Verify cert files exist after generation attempt
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
          sslKeyFile = keyPath;
          sslCertFile = certPath;
        }
      }

      // Set environment variables
      const env = {
        ...process.env,
        // Set desktop mode and SQLite database path
        METRICFRAME_DESKTOP_MODE: 'true',
        DATABASE_URL: `sqlite:///${path.join(app.getPath('userData'), 'metricframe.db')}`,
        CORS_ORIGINS: tlsEnabled && sslCertFile
          ? 'http://localhost:8000,http://127.0.0.1:8000,https://localhost:8000,https://127.0.0.1:8000,file://'
          : 'http://localhost:8000,http://127.0.0.1:8000,file://',
        // Disable debug for production
        DEBUG: 'false',
        // Encryption key for AI provider credentials
        AI_CREDENTIALS_MASTER_KEY: 'K2cLrptyN61-jcyNzDdLF-960i4i8d91nLeN10TKBv0=',
        // TLS certificate paths (empty string if not using TLS)
        ...(sslKeyFile && sslCertFile ? {
          SSL_KEYFILE: sslKeyFile,
          SSL_CERTFILE: sslCertFile,
        } : {}),
      };

      log(`Database path: ${env.DATABASE_URL}`);
      log(`Working directory: ${config.cwd}`);
      if (sslKeyFile) log(`SSL Key: ${sslKeyFile}`);
      if (sslCertFile) log(`SSL Cert: ${sslCertFile}`);

      backendProcess = spawn(config.command, config.args, {
        cwd: config.cwd,
        env: env,
        stdio: ['ignore', 'pipe', 'pipe'],
        // Detach on Windows to allow proper cleanup
        detached: process.platform === 'win32',
      });

      if (!backendProcess.pid) {
        throw new Error('Failed to spawn backend process');
      }

      log(`Backend process started with PID: ${backendProcess.pid}`);

      backendProcess.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        log(`Backend stdout: ${msg}`);
      });

      backendProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        log(`Backend stderr: ${msg}`, 'WARN');
      });

      backendProcess.on('error', (err) => {
        log(`Backend process error: ${err.message}`, 'ERROR');
        reject(new Error(`Failed to start backend: ${err.message}`));
      });

      backendProcess.on('exit', (code, signal) => {
        log(`Backend exited with code ${code}, signal ${signal}`, code === 0 ? 'INFO' : 'ERROR');

        if (!isQuitting && code !== 0) {
          // Backend crashed unexpectedly
          log('Backend may have crashed during startup. Check log file for stderr output.', 'ERROR');

          const errorMsg = `The MetricFrame backend has stopped unexpectedly (exit code: ${code}).\n\n` +
            `This may indicate:\n` +
            `- A missing dependency in the PyInstaller bundle\n` +
            `- A file permission issue\n` +
            `- A database initialization error\n\n` +
            `Please check the log file for details:\n${logFile}`;
          dialog.showErrorBox('Backend Error', errorMsg);
          app.quit();
        }
      });

      // Wait for backend to be ready
      updateSplashStatus('Waiting for backend to initialize...');
      waitForBackend(45000) // Increased timeout for first-time database setup
        .then(() => {
          log('Backend is ready and responding');
          resolve();
        })
        .catch((err) => {
          log(`Backend startup failed: ${err.message}`, 'ERROR');
          reject(err);
        });

    } catch (err) {
      log(`Backend startup error: ${err.message}`, 'ERROR');
      reject(err);
    }
  });
}

/**
 * Wait for the backend to be ready
 */
function waitForBackend(timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let attempts = 0;

    const checkHealth = () => {
      attempts++;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      updateSplashStatus(`Connecting to backend... (${elapsed}s)`);

      const tlsMode = store.get('tlsEnabled', false);
      const healthUrl = tlsMode ? 'https://127.0.0.1:8000/health' : 'http://127.0.0.1:8000/health';
      const httpModule = tlsMode ? https : http;
      const requestOptions = tlsMode ? { rejectUnauthorized: false } : {};

      const req = httpModule.get(healthUrl, requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            log(`Backend health check passed after ${attempts} attempts`);
            resolve();
          } else {
            log(`Backend health check returned status ${res.statusCode}`, 'WARN');
            retry();
          }
        });
      });

      req.on('error', (err) => {
        if (attempts % 10 === 0) {
          log(`Health check attempt ${attempts} failed: ${err.message}`, 'DEBUG');
        }
        retry();
      });

      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime > timeout) {
        const errorMsg = `Backend failed to start within ${timeout/1000} seconds.\n` +
          `Check if another instance is running on port 8000.\n` +
          `Log file: ${logFile}`;
        reject(new Error(errorMsg));
      } else {
        setTimeout(checkHealth, 500);
      }
    };

    // Give the process a moment to start
    setTimeout(checkHealth, 1000);
  });
}

/**
 * Stop the backend server
 */
function stopBackend() {
  if (backendProcess) {
    log('Stopping backend...');

    try {
      // Try graceful shutdown first
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProcess.pid.toString(), '/f', '/t']);
      } else {
        backendProcess.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (backendProcess && !backendProcess.killed) {
            log('Force killing backend process', 'WARN');
            backendProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    } catch (err) {
      log(`Error stopping backend: ${err.message}`, 'ERROR');
    }

    backendProcess = null;
  }
}

/**
 * Create the main application window
 */
function createWindow() {
  const { width, height } = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1024,
    minHeight: 768,
    title: 'MetricFrame',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // Don't show until ready
  });

  // Save window size on resize
  mainWindow.on('resize', () => {
    if (!mainWindow.isDestroyed()) {
      const { width, height } = mainWindow.getBounds();
      store.set('windowBounds', { width, height });
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * Load the frontend
 */
async function loadFrontend() {
  const frontendUrl = getFrontendPath();
  log(`Loading frontend from: ${frontendUrl}`);
  updateSplashStatus('Loading application...');

  if (isDev) {
    // In development, load from Vite dev server
    await mainWindow.loadURL(frontendUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from bundled files
    await mainWindow.loadURL(frontendUrl);
  }

  log('Frontend loaded successfully');
}

/**
 * Get splash screen HTML
 */
function getSplashHTML() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
            color: white;
          }
          h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
          .version { color: #64748b; font-size: 0.9rem; margin-bottom: 2rem; }
          #status { color: #94a3b8; font-size: 1.1rem; min-height: 1.5em; }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.2);
            border-top-color: #0ea5e9;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-top: 2rem;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          .error { color: #ef4444; }
        </style>
      </head>
      <body>
        <h1>MetricFrame</h1>
        <div class="version">AI & Cybersecurity Metrics Dashboard</div>
        <p id="status">${startupStatus}</p>
        <div class="spinner"></div>
      </body>
    </html>
  `;
}

/**
 * Application startup
 */
async function startup() {
  try {
    initLogging();
    log('MetricFrame starting...');
    log(`Running in ${isDev ? 'development' : 'production'} mode`);
    log(`Resources path: ${resourcesPath}`);
    log(`User data path: ${app.getPath('userData')}`);

    // Show splash/loading
    createWindow();
    await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSplashHTML())}`);
    mainWindow.show();

    // Start backend (skip in dev mode if using external backend)
    if (!isDev) {
      log('Starting backend server...');
      await startBackend();
    } else {
      log('Development mode: skipping backend startup (use external backend)');
    }

    // Load frontend
    log('Loading frontend...');
    await loadFrontend();

    log('MetricFrame started successfully');

  } catch (error) {
    log(`Startup error: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');

    const errorMsg = `Failed to start MetricFrame:\n\n${error.message}\n\n` +
      `Please check the log file for details:\n${logFile}`;

    dialog.showErrorBox('Startup Error', errorMsg);
    app.quit();
  }
}

// App event handlers
app.whenReady().then(startup);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    startup();
  }
});

app.on('before-quit', () => {
  log('Application quitting...');
  isQuitting = true;
  stopBackend();
});

// Trust self-signed certificates for localhost only (desktop TLS)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
      log(`Trusting self-signed certificate for ${parsedUrl.hostname}`);
      event.preventDefault();
      callback(true);
      return;
    }
  } catch (e) {
    // URL parsing failed
  }
  callback(false);
});

// IPC handlers for TLS settings (used by Settings UI)
ipcMain.handle('get-tls-enabled', () => {
  return store.get('tlsEnabled', false);
});

ipcMain.handle('set-tls-enabled', (event, enabled) => {
  store.set('tlsEnabled', enabled);
  log(`TLS setting changed to: ${enabled}`);
  return { success: true, requiresRestart: true };
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'ERROR');
  log(error.stack, 'ERROR');
  dialog.showErrorBox('Error', `An unexpected error occurred:\n\n${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection: ${reason}`, 'ERROR');
});
