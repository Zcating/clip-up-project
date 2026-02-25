// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title: string) => ipcRenderer.send('set-title', title),
  openVideoFiles: () => ipcRenderer.invoke('open-video-files'),
  getVideoMetadata: (filePath: string) => ipcRenderer.invoke('get-video-metadata', filePath),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  batchConvertVideos: (options: {
    inputFiles: string[]
    outputDir: string
    method?: 'simple' | 'advanced'
    dlogType?: 'dlog' | 'dlogm'
    concurrency?: number
  }) => ipcRenderer.invoke('batch-convert-videos', options),
  onConvertProgress: (
    callback: (data: { currentIndex: number; total: number; result: unknown }) => void,
  ) => {
    const handler = (
      _event: unknown,
      data: { currentIndex: number; total: number; result: unknown },
    ) => callback(data)
    ipcRenderer.on('convert-progress', handler)
    return () => ipcRenderer.removeListener('convert-progress', handler)
  },
  onConvertFileProgress: (
    callback: (data: { currentIndex: number; total: number; progress: number }) => void,
  ) => {
    const handler = (
      _event: unknown,
      data: { currentIndex: number; total: number; progress: number },
    ) => callback(data)
    ipcRenderer.on('convert-file-progress', handler)
    return () => ipcRenderer.removeListener('convert-file-progress', handler)
  },
})
