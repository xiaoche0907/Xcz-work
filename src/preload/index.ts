import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 暴露给渲染进程的自定义安全 API 桥梁
const api = {
  // --- Settings ---
  getSettings: () => ipcRenderer.invoke('db-get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('db-save-settings', settings),

  // --- Assets ---
  getAssets: () => ipcRenderer.invoke('db-get-assets'),
  saveAsset: (asset: any) => ipcRenderer.invoke('db-save-asset', asset),
  deleteAsset: (id: string) => ipcRenderer.invoke('db-delete-asset', id),

  // --- Folders ---
  getFolders: () => ipcRenderer.invoke('db-get-folders'),
  saveFolder: (folder: any) => ipcRenderer.invoke('db-save-folder', folder),
  deleteFolder: (id: string) => ipcRenderer.invoke('db-delete-folder', id),

  // --- Tags ---
  getTags: () => ipcRenderer.invoke('db-get-tags'),
  saveTag: (tag: any) => ipcRenderer.invoke('db-save-tag', tag),
  deleteTag: (id: string) => ipcRenderer.invoke('db-delete-tag', id),

  // --- Boards ---
  getBoards: () => ipcRenderer.invoke('db-get-boards'),
  saveBoard: (board: any) => ipcRenderer.invoke('db-save-board', board),
  deleteBoard: (id: string) => ipcRenderer.invoke('db-delete-board', id),

  // --- Files ---
  pickDialog: (options: any) => ipcRenderer.invoke('file-pick-dialog', options),
  openPath: (path: string) => ipcRenderer.invoke('file-open-path', path),
  importFiles: (filePaths: string[], folderId?: string) => ipcRenderer.invoke('file-import', { filePaths, folderId }),
  importFileData: (arrayBuffer: ArrayBuffer, fileName: string, folderId?: string) => ipcRenderer.invoke('file-import-data', { arrayBuffer, fileName, folderId }),

  // --- AI ---
  analyzeImage: (assetId: string, customUsage?: string) => ipcRenderer.invoke('ai-analyze-image', { assetId, customUsage }),
  generateSceneDescription: (assetIds: string[]) => ipcRenderer.invoke('ai-generate-scene', assetIds),

  // --- Window ---
  toggleAlwaysOnTop: () => ipcRenderer.invoke('win-toggle-always-on-top'),
  toggleFullScreen: () => ipcRenderer.invoke('win-toggle-fullscreen'),
  isAlwaysOnTop: () => ipcRenderer.invoke('win-get-always-on-top'),
  isFullScreen: () => ipcRenderer.invoke('win-get-fullscreen'),
  openExternal: (path: string) => ipcRenderer.invoke('file-open-external', path),
  saveCopy: (sourcePath: string, defaultName: string) => ipcRenderer.invoke('file-save-copy', { sourcePath, defaultName }),
  copyImage: (filePath: string) => ipcRenderer.invoke('file-copy-image', filePath),
  exportAssets: (assetPaths: string[], destDir: string) => ipcRenderer.invoke('file-export-assets', { assetPaths, destDir }),
  startDrag: (filePaths: string[]) => ipcRenderer.send('start-drag', filePaths)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('在 contextIsolated 模式下暴露 API 失败:', error)
  }
} else {
  // @ts-ignore (挂载至全局类型声明)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
