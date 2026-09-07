/**
 * Safely expose APIs for communication between the main process and renderer processes
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings) => ipcRenderer.invoke('settings:set', settings),
});

contextBridge.exposeInMainWorld('simulationStateAPI', {
    set: (state) => ipcRenderer.send('simulationState:set', state),
});

contextBridge.exposeInMainWorld('fullscreenAPI', {
    toggle: () => ipcRenderer.send('fullscreen:toggle'),
    onChange: (callback) => ipcRenderer.on('fullscreen:changed', (_event, value) => callback(value)),
});
