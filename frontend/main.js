/**
 * create an desktop environment to hold the TAGEF-Net app
 * 
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require("path");
const url = require("url");

let win;
const createWindow = () => {
  win = new BrowserWindow({ 
    width: 1280, height: 768,
    autoHideMenuBar: true,
  });
  // loading main app 
  win.loadURL(
    url.format({
      pathname: path.join(__dirname, `/dist/index.html`),
      protocol: "file:",
      slashes: true
    })
  );
  // win.webContents.openDevTools();
  win.setMenu(null);
  win.on('closed', () => {
    win = null;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});
