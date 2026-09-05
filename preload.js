const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings) => ipcRenderer.invoke('settings:set', settings),
});

contextBridge.exposeInMainWorld('simulationStateAPI', {
    set: (state) => ipcRenderer.send('simulationState:set', state),
});

contextBridge.exposeInMainWorld('fullscreenAPI', {
    set: (value) => ipcRenderer.send('fullscreen:set', value),
    get: () => ipcRenderer.invoke('fullscreen:get'),
    onChange: (callback) => ipcRenderer.on('fullscreen:changed', (_event, value) => callback(value)),
});
