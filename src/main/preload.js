const { contextBridge, ipcRenderer } = require('electron');

const EVENTS = ['update:progress', 'update:ready', 'license:changed'];

contextBridge.exposeInMainWorld('awf', {
  call: async (channel, ...args) => {
    const r = await ipcRenderer.invoke(channel, ...args);
    if (!r.ok) throw new Error(r.error);
    return r.data;
  },
  on: (event, cb) => {
    if (!EVENTS.includes(event)) return () => {};
    const h = (e, payload) => cb(payload);
    ipcRenderer.on(event, h);
    return () => ipcRenderer.removeListener(event, h);
  },
});
