const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron');

/**
 * Creates the electron window and binds itself to the given url
 * 
 * @param {string} url - The entry url to bind the application to
 */
function createWindow(url) {
    // Create the browser window with specified preferences
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    console.log(`Connecting to '${url}'...`);
    // Change the window to the given url
    mainWindow.loadURL(url);
}

const url = "http://google.com";
// Wait for electron to be ready, then create the window
app.whenReady().then(() => createWindow(url));
