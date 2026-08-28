const { spawn } = require("child_process");
const { app, BrowserWindow } = require("electron");
const path = require("path");

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
  const platform = process.platform;

  // Pass the command, script path, and arguments as an array
  // OS Dependent
  let processPath = "";
  let args = [];
  if (platform == "win32") {
    if (isDev) {
      // If the dev flag is set (and should run using python venv)
      processPath = ".\\.venv\\Scripts\\python.exe";
      args = ["-u", "main.py"];
    } else {
      // If we are running an executable
      processPath = ".\\dist\\main.exe";
      if (app.isPackaged) {
        // Path to resources folder
        processPath = path.join(process.resourcesPath, "/dist/main.exe");
        args = ["packaged"];
      }
    }
  } else if (platform == "darwin" || platform == "linux") {
    if (isDev) {
      // If the dev flag is set (and should run using python venv)
      processPath = "./.venv/bin/python";
      args = ["-u", "main.py"];
    } else {
      // If we are runnning an executable
      processPath = "./dist/main";
      if (app.isPackaged) {
        // Path to resources folder
        processPath = path.join(process.resourcesPath, "/dist/main");
        args = ["packaged"];
      }
    }
  }
  pythonProcess = spawn(processPath, args);

  // Set python output channels to utf8 encoding
  pythonProcess.stdout.setEncoding("utf8");
  pythonProcess.stderr.setEncoding("utf8");

  // Capture standard output from python process
  pythonProcess.stdout.on("data", (data) => {
    console.log(`Python: ${data}`);

    // If the data captured is the url to the application
    if (data.toString().startsWith("http://")) {
      // Resolve the promise with the url (with no excess whitespace)
      let url = data.toString().split("\n")[0].trim();
      resolve(url + "/src/ui/index.html");
    }
  });

  // Capture standard error from pthon process
  pythonProcess.stderr.on("data", (data) => {
    console.error(`Python Error: ${data}`);
  });

  // Handle python process closing
  pythonProcess.on("close", (code) => {
    // Print exit code as it can be useful
    console.log(`Python script exited with code ${code}`);
  });

  // Reject the promise after 5 seconds
  setTimeout(() => reject(new Error("Python server failed to launch")), 5000);
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
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  var url;

  try {
    url = await python_url;
  } catch (exception) {
    console.error(`ERROR: The promise was rejected: ${exception}`);

    // Exit application as it is not recoverable
    app.exit();

    return;
  }

  console.log(`Connecting to '${url}'...`);

  // Change the window to the given url
  mainWindow.loadURL(url);

  // Maximise the window and then show it
  mainWindow.maximize();
  mainWindow.show();
}

// Handle the application quitting
app.on("will-quit", () => {
  // Print that it is quitting
  console.log("App is quitting...");
  // Kill the python process to ensure the port is freed
  pythonProcess.kill();
});

const url = new Promise(spawnPythonProcess);
// Wait for electron to be ready, then create the window
app.whenReady().then(() => createWindow(url));
