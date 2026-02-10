/**
 * MetricFrame Desktop App - Preload Script
 *
 * This script runs in the renderer process but has access to Node.js APIs.
 * It provides a secure bridge between the frontend and Electron.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose a limited API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get app version
  getVersion: () => process.env.npm_package_version || '1.0.0',

  // Check if running in Electron
  isElectron: () => true,

  // Platform info
  platform: process.platform,

  // Open external URL in default browser
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  },

  // TLS settings
  getTlsEnabled: () => ipcRenderer.invoke('get-tls-enabled'),
  setTlsEnabled: (enabled) => ipcRenderer.invoke('set-tls-enabled', enabled),
});

// The frontend should use the backend API at localhost:8000
// This is configured automatically when the app starts
console.log('MetricFrame Desktop: Preload script loaded');
