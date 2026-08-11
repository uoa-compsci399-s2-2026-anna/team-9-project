const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron');

// The python web-server sub-process
var pythonProcess = null;

/**
 * Creates the python web-server process and gets url
 * 
 * @param {*} resolve Promise resolve handle, will return the url of the python server
 * @param {*} reject Promise reject handle, will reject after 1 second (failed to launch)
 */
function spawn_python_process(resolve, reject) {
    // Pass the command, script path, and arguments as an array
    pythonProcess = spawn('python3', ['-u', 'index.py']);

    setTimeout(reject, 1000);
}

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
