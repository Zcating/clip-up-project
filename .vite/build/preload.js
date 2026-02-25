"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  setTitle: (title) => electron.ipcRenderer.send("set-title", title),
  openVideoFiles: () => electron.ipcRenderer.invoke("open-video-files"),
  getVideoMetadata: (filePath) => electron.ipcRenderer.invoke("get-video-metadata", filePath),
  selectOutputDirectory: () => electron.ipcRenderer.invoke("select-output-directory"),
  batchConvertVideos: (options) => electron.ipcRenderer.invoke("batch-convert-videos", options),
  onConvertProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on("convert-progress", handler);
    return () => electron.ipcRenderer.removeListener("convert-progress", handler);
  }
});
