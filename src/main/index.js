const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false, // Change to true and use `contextBridge` if security is needed
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../../build/renderer/index.html'));
  } else {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // Only in dev mode
  }

    // win.loadFile(path.join(__dirname, '../../build/renderer/index.html'));

}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
