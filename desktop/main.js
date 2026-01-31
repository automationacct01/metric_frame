/**
 * MetricFrame Desktop App - Electron Main Process
 *
 * This is the main entry point for the desktop application.
 * It manages:
 * - Starting the Python backend server
 * - Loading the frontend UI
 * - Application lifecycle (start, quit)
 */

const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const Store = require('electron-store');

// Configuration store
const store = new Store({
  defaults: {
    windowBounds: { width: 1400, height: 900 },
    backendPort: 8000,
  }
});

// Global references
let mainWindow = null;
let backendProcess = null;
let isQuitting = false;

// Determine if running in development or production
const isDev = process.argv.includes('--dev');
const resourcesPath = isDev
  ? path.join(__dirname, '..')
  : process.resourcesPath;

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
 * Start the Python backend server
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    const config = getBackendPath();

    console.log('Starting backend:', config.command, config.args.join(' '));

    // Set environment variables
    const env = {
      ...process.env,
      DATABASE_URL: `sqlite:///${path.join(app.getPath('userData'), 'metricframe.db')}`,
      CORS_ORIGINS: 'http://localhost:8000,file://',
    };

    backendProcess = spawn(config.command, config.args, {
      cwd: config.cwd,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend error: ${data}`);
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
      reject(err);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`Backend exited with code ${code}, signal ${signal}`);
      if (!isQuitting) {
        // Backend crashed unexpectedly
        dialog.showErrorBox(
          'Backend Error',
          'The MetricFrame backend has stopped unexpectedly. The application will now close.'
        );
        app.quit();
      }
    });

    // Wait for backend to be ready
    waitForBackend(30000)
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Wait for the backend to be ready
 */
function waitForBackend(timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkHealth = () => {
      const req = http.get('http://127.0.0.1:8000/health', (res) => {
        if (res.statusCode === 200) {
          console.log('Backend is ready!');
          resolve();
        } else {
          retry();
        }
      });

      req.on('error', retry);
      req.setTimeout(1000);
    };

    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Backend startup timeout'));
      } else {
        setTimeout(checkHealth, 500);
      }
    };

    checkHealth();
  });
}

/**
 * Stop the backend server
 */
function stopBackend() {
  if (backendProcess) {
    console.log('Stopping backend...');

    // Try graceful shutdown first
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
    } else {
      backendProcess.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (backendProcess && !backendProcess.killed) {
          backendProcess.kill('SIGKILL');
        }
      }, 5000);
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
    const { width, height } = mainWindow.getBounds();
    store.set('windowBounds', { width, height });
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

  if (isDev) {
    // In development, load from Vite dev server
    await mainWindow.loadURL(frontendUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, modify fetch to use backend
    await mainWindow.loadURL(frontendUrl);
  }
}

/**
 * Application startup
 */
async function startup() {
  try {
    // Show splash/loading
    createWindow();

    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head>
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
            h1 { font-size: 2.5rem; margin-bottom: 1rem; }
            p { color: #94a3b8; font-size: 1.1rem; }
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
          </style>
        </head>
        <body>
          <h1>MetricFrame</h1>
          <p>Starting application...</p>
          <div class="spinner"></div>
        </body>
      </html>
    `);

    mainWindow.show();

    // Start backend (skip in dev mode if using external backend)
    if (!isDev) {
      console.log('Starting backend server...');
      await startBackend();
    }

    // Load frontend
    console.log('Loading frontend...');
    await loadFrontend();

  } catch (error) {
    console.error('Startup error:', error);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start MetricFrame: ${error.message}`
    );
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
  isQuitting = true;
  stopBackend();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Error', error.message);
});
