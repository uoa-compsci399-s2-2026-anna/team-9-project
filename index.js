const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron');

function createWindow(url) {
    const mainWindow = new BrowserWindow();

    console.log(`Connecting to '${url}'...`);
    mainWindow.loadURL(url);
}

const url = "http://google.com";
app.whenReady().then(() => createWindow(url));
