// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title: string) => ipcRenderer.send('set-title', title),
  openVideoFiles: () => ipcRenderer.invoke('open-video-files'),
  getVideoMetadata: (filePath: string) => ipcRenderer.invoke('get-video-metadata', filePath)
})
