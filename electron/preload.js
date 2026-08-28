const { contextBridge, ipcRenderer } = require('electron');

/**
 * تعريض متغيرات البيئة والوظائف لعملية الرندر بشكل آمن.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  getInitStatus: () => ipcRenderer.invoke('get-init-status'),
  setInitStatus: (status) => ipcRenderer.invoke('set-init-status', status),
  openFile: (path) => ipcRenderer.invoke('open-file', path),
  saveAndOpenPdf: (data) => ipcRenderer.invoke('save-and-open-pdf', data),
  showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),
  getPdfPath: (fileName) => ipcRenderer.invoke('get-pdf-path', fileName),
  savePdfToLibrary: (data) => ipcRenderer.invoke('save-pdf-to-library', data),
  openPdfFolder: () => ipcRenderer.invoke('open-pdf-folder'),
  system: {
    checkUpdate: () => ipcRenderer.invoke('system:check-update'),
    applyHotPatch: (zipBuffer) => ipcRenderer.invoke('system:apply-hot-patch', zipBuffer),
    applyFilesUpdate: (files) => ipcRenderer.invoke('system:apply-files-update', files),
    restartApp: () => ipcRenderer.invoke('system:restart-app')
  },
  educational: {
    getCatalog: () => ipcRenderer.invoke('educational:get-catalog'),
    saveCatalog: (catalog) => ipcRenderer.invoke('educational:save-catalog', catalog),
    saveFile: (data) => ipcRenderer.invoke('educational:save-file', data),
    deleteFile: (data) => ipcRenderer.invoke('educational:delete-file', data),
    getStorageStatus: () => ipcRenderer.invoke('educational:get-storage-status')
  },
  process: {
    env: {
      API_KEY: process.env.API_KEY
    }
  }
});

// الحفاظ على التوافق مع الكود القديم الذي يستخدم window.process
contextBridge.exposeInMainWorld('process', {
  env: {
    API_KEY: process.env.API_KEY
  }
});
