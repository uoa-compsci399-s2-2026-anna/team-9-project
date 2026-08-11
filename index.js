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

    // Set python output channels to utf8 encoding
    pythonProcess.stdout.setEncoding('utf8');
    pythonProcess.stderr.setEncoding('utf8');

    // Capture standard output from python process
    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python: ${data}`);
    });

    // Capture standard error from pthon process
    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
    });

    // Reject after 1 second
    setTimeout(reject, 1000);
}

/**
 * Creates the electron window and binds itself to the given url
 * 
 * @param {Promise} url - A promise to the entry url to bind the application to
 */
async function createWindow(url) {
    // Create the browser window with specified preferences
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    let url = await url;
    console.log(`Connecting to '${url}'...`);
    // Change the window to the given url
    mainWindow.loadURL(url);
}

const url = new Promise(spawn_python_process);
// Wait for electron to be ready, then create the window
app.whenReady().then(() => createWindow(url));
