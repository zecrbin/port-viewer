const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('portLantern', {
  listPorts: () => ipcRenderer.invoke('ports:list'),
  getProcessDetails: (pid) => ipcRenderer.invoke('process:details', pid),
  killProcess: (pid, force) => ipcRenderer.invoke('process:kill', { pid, force }),
  revealProcess: (executablePath) => ipcRenderer.invoke('process:reveal', executablePath),
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close')
});
