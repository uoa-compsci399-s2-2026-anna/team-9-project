const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const Store = require('electron-store'); // Refer to https://github.com/sindresorhus/electron-store
const settingsSchema = require('./src/shared/settingsSchema.json');
const simulationStateSchema = require('./src/shared/simulationStateSchema.json');
const log = require('electron-log/main');

// Squirrel launches the appplication multiple extra times during install/update/uninstall
// so it can create/remove the start menu shortcut. This detects those launches,
// handles the shortcut, and quits the application immediately.
if (require('electron-squirrel-startup')) {
    app.quit();
    return;
}

// Initialise the default settings from the settings schema
const DEFAULT_SETTINGS = Object.fromEntries(
    Object.entries(settingsSchema).map(([key, field]) => [key, field.default])
);

// Initialise the default simulation state from the simulate state schema
const DEFAULT_SIMULATION_STATE = Object.fromEntries(
    Object.entries(simulationStateSchema).map(([key, field]) => [key, structuredClone(field.default)])
);

const store = new Store();

function getDefaultSettings() {
    return {
        ...DEFAULT_SETTINGS,
        // By default, whether dark mode is used depends on the theme of the user's device
        darkMode: nativeTheme.shouldUseDarkColors,
    };
}

// Initialise the settings store in case of any missing values
const existingSettings = store.get('settings') || {};
store.set('settings', {
    ...getDefaultSettings(),
    ...existingSettings,
});

// Initialise the simulation state to the default simulation state
let simulationState = { ...DEFAULT_SIMULATION_STATE };

// Handle settings saved between run
ipcMain.handle('settings:get', () => {
    return store.get('settings');
});

ipcMain.handle('settings:getDefaults', () => {
    return getDefaultSettings();
});

ipcMain.handle('settings:set', (_event, newSettings) => {
    store.set('settings', {
        ...store.get('settings'),
        ...newSettings
    });
});

let mainWindow;

// Refresh the current web page
ipcMain.on('app:refresh', () => {
    if (!mainWindow) {
        return;
    }

    const currentUrl = new URL(mainWindow.webContents.getURL());
    // Include the current settings in the search parameters
    currentUrl.searchParams.set('settings', JSON.stringify(store.get('settings') || {}));
    mainWindow.loadURL(currentUrl.toString());
});

// Update the simulation state based on the new state
ipcMain.on('simulationState:set', (_event, newState) => {
    simulationState = { ...simulationState, ...newState };
});

ipcMain.handle('simulationState:getDefaults', () => {
    return DEFAULT_SIMULATION_STATE;
});

ipcMain.on('fullscreen:toggle', () => {
    if (!mainWindow) { 
        return;
    }
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.handle('fullscreen:get', () => {
    return mainWindow?.isFullScreen() ?? false;
});

// The python web-server sub-process
var pythonProcess = null;

// Whether the dev parameter was passed or not
const isDev = process.argv[2] == "dev";

/**
 * Creates the python web-server process and gets url
 * 
 * @param {*} resolve Promise resolve handle, will return the url of the python server
 * @param {*} reject Promise reject handle, will reject after 5 seconds (failed to launch)
 */
function spawnPythonProcess(resolve, reject) {
    log.info('ELECTRON: Finding python process path')
    const platform = process.platform;

    // Pass the command, script path, and arguments as an array
    // OS Dependent
    let processPath = "";
    let args = [];
    if (platform == "win32") {
        if (isDev) {
            // If the dev flag is set (and should run using python venv)
            processPath = '.\\.venv\\Scripts\\python.exe';
            args = ['-u', 'main.py'];
        } else {
            // If we are running an executable
            processPath = '.\\dist\\main.exe';
            if (app.isPackaged) {
                // Path to resources folder
                processPath = path.join(process.resourcesPath, '/dist/main.exe');
                args = ['packaged'];
            }
        }
    } else if (platform == "darwin" || platform == "linux") {
        if (isDev) {
            // If the dev flag is set (and should run using python venv)
            processPath = './.venv/bin/python';
            args = ['-u', 'main.py'];
        } else {
            // If we are runnning an executable
            processPath = './dist/main';
            if (app.isPackaged) {
                // Path to resources folder
                processPath = path.join(process.resourcesPath, '/dist/main');
                args = ['packaged'];
            }
        }
    }

    log.debug(`ELECTRON: Python process at ${processPath}`);
    log.info('ELECTRON: Spawning Python process');

    pythonProcess = spawn(processPath, args, {
        cwd: app.isPackaged ? process.resourcesPath : __dirname
    });

    pythonProcess.on('error', (err) => {
        log.error(`Failed to start Python process: ${err.message}`);
    });

    // Set python output channels to utf8 encoding
    pythonProcess.stdout.setEncoding('utf8');
    pythonProcess.stderr.setEncoding('utf8');

    // Capture standard output from python process
    pythonProcess.stdout.on('data', (data) => {
        log.info(`${data}`);

        // If the data captured is the url to the application
        if (data.toString().startsWith("http://")) {
            // Resolve the promise with the url (with no excess whitespace)
            let url = data.toString().split("\n")[0].trim();
            log.debug(`ELECTRON: URL to Python process is ${url}`);
            resolve(url);
        }
    });

    // Capture standard error from pthon process
    pythonProcess.stderr.on('data', (data) => {
        log.error(`${data}`);
    });

    // Handle python process closing
    pythonProcess.on('close', (code) => {
        // Print exit code as it can be useful
        log.info(`ELECTRON: Python script exited with code ${code}`);
    });

    // Reject the promise after 30 seconds
    const maxWaitTimeMs = 30_000;
    setTimeout(() => reject(new Error("Python server failed to launch")), maxWaitTimeMs);
}

/**
 * Gets the path to the given UI file to show while the application is
 * launching.
 *
 * @param filename The file we are looking for
 * @returns The path to the loader.html file.
 */
function getPathToUiFile(filename) {
    const filePath = path.join('/src/ui/', filename);
    var appDirectory = app.getAppPath();

    // If the application is packaged traverse back from the app.asar given by app.getAppPath()
    // i.e. .../team-9-project/resources/app.asar -> .../team-9-project/resources/
    if (app.isPackaged) {
        appDirectory = path.dirname(appDirectory);
    }

    // Join the app directory and the path to the file
    return path.join(appDirectory, filePath);
}

/**
 * Builds the initial URL for the application. Adds the stored settings state to the
 * base URL as search parameters. This state is then handled by the initial route.
 * 
 * @param {string} baseUrl The base URL for the application
 * @returns The base URL with the settings state included as search parameters
 */
function buildInitialUrl(baseUrl) {
    const parsed = new URL(baseUrl);
    // Use the saved state
    parsed.searchParams.set('settings', JSON.stringify(store.get('settings') || {}));
    return parsed.toString();
}

/**
 * Creates the electron window and binds itself to the given url
 * 
 * @param {Promise} url - A promise to the entry url to bind the application to
 */
async function createWindow(python_url) {
    // Create the browser window with specified preferences
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,    
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        }
    });

    // Inform the renderer process upon the application entering/exiting fullscreen
    mainWindow.on('enter-full-screen', () => mainWindow.webContents.send('fullscreen:changed', true));
    mainWindow.on('leave-full-screen', () => mainWindow.webContents.send('fullscreen:changed', false));

    /**
     * Override the default behaviour when a user navigates to another URL.
     * 
     * Adds the setting state as search parameters to the target URL. Also adds
     * the fullscreen state as a search parameter.
     * 
     * If the user is navigating to a simulation page, the simulation state
     * are added as search parameters.
     * 
     * These states are handled by the target route (see app.py).
     * 
     * Loads the URL with the added search parameters.
     */
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const parsed = new URL(url);
        event.preventDefault();

        parsed.searchParams.set('settings', JSON.stringify(store.get('settings') || {}));
        parsed.searchParams.set('fullscreen', mainWindow.isFullScreen());

        if (parsed.pathname.startsWith('/simulation/')) {
            parsed.searchParams.set('state', JSON.stringify(simulationState));
        }

        mainWindow.loadURL(parsed.toString());
    });

    var url;

    // Show spinner while app is launching
    const loaderFilename = 'loader.html';
    const loaderFilePath = getPathToUiFile(loaderFilename);
    log.info(`ELECTRON: Loading loading screen at ${loaderFilePath}`);
    mainWindow.loadFile(loaderFilePath);

    // Maximise the window and then show it
    mainWindow.maximize();
    mainWindow.show();

    try {
        url = await python_url;
    } catch(exception) {
        log.error(`ELECTRON: The promise was rejected: ${exception}`);

        // Show failed to start screen if the promise rejects
        const failedToStartFilename = 'failedToStart.html';
        const failedToStartFilePath = getPathToUiFile(failedToStartFilename);
        log.info(`ELECTRON: Loading failed to load screen at ${failedToStartFilePath}`);
        mainWindow.loadFile(failedToStartFilePath);

        return;
    }

    // Include the persisted state in the initial URL
    url = buildInitialUrl(url);

    log.info(`ELECTRON: Connecting to Python process at '${url}'...`);

    // Change the window to the given url
    mainWindow.loadURL(url);
}

// Handle the application quitting
app.on('will-quit', () => {
    // Print that it is quitting
    log.info('ELECTRON: App is quitting...');
    // Kill the python process to ensure the port is freed
    pythonProcess.kill();
});

// Initialise logger
log.initialize();

const url = new Promise(spawnPythonProcess);
// Wait for electron to be ready, then create the window
app.whenReady().then(() => createWindow(url));
