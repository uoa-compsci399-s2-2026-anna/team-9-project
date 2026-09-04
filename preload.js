const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('settingsAPI', {
//     get: () => ipcRenderer.invoke('settings:get'),
//     set: (settings) => ipcRenderer.invoke('settings:set', settings),
// });
contextBridge.exposeInMainWorld('settingsAPI', {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings) => ipcRenderer.invoke('settings:set', settings),
});

contextBridge.exposeInMainWorld('simulationStateAPI', {
    set: (state) => ipcRenderer.send('simulationState:set', state),
});