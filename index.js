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
    pythonProcess = spawn('python3', ['-u', 'main.py']);

    // Set python output channels to utf8 encoding
    pythonProcess.stdout.setEncoding('utf8');
    pythonProcess.stderr.setEncoding('utf8');

    // Capture standard output from python process
    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python: ${data}`);

        // If the data captured is the url to the application
        if (data.toString().startsWith("http://")) {
            // Resolve the promise with the url (with no excess whitespace)
            resolve(data.toString().trim());
        }
    });

    // Capture standard error from pthon process
    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
    });

    // Handle python process closing
    pythonProcess.on('close', (code) => {
        // Print exit code as it can be useful
        console.log(`Python script exited with code ${code}`);
    });

    // Reject the promise after 1 second
    setTimeout(reject, 1000);
}

/**
 * Creates the electron window and binds itself to the given url
 * 
 * @param {Promise} url - A promise to the entry url to bind the application to
 */
async function createWindow(python_url) {
    // Create the browser window with specified preferences
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    var url;

    try {
        url = await python_url;
    } catch(exception) {
        console.error(`ERROR: The promise was rejected: ${exception}`);

        // Exit application as it is not recoverable
        app.exit();

        return;
    }

    console.log(`Connecting to '${url}'...`);

    // Change the window to the given url
    mainWindow.loadURL(url);
}

// Handle the application quitting
app.on('will-quit', () => {
    // Print that it is quitting
    console.log('App is quitting...');
    // Kill the python process to ensure the port is freed
    pythonProcess.kill();
});

const url = new Promise(spawn_python_process);
// Wait for electron to be ready, then create the window
app.whenReady().then(() => createWindow(url));
