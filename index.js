const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron');

function createWindow(url) {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    console.log(`Connecting to '${url}'...`);
    mainWindow.loadURL(url);
}

const url = "http://google.com";
app.whenReady().then(() => createWindow(url));
