const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings) => ipcRenderer.invoke('settings:set', settings),
});
