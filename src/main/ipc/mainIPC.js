const { ipcMain } = require('electron')

function setupIPC() {
  ipcMain.on('minimize', (e) => {
    const window = BrowserWindow.fromWebContents(e.sender)
    window.minimize()
  })

  ipcMain.on('maximize', (e) => {
    const window = BrowserWindow.fromWebContents(e.sender)
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.on('close', (e) => {
    const window = BrowserWindow.fromWebContents(e.sender)
    window.close()
  })
}

module.exports = setupIPC