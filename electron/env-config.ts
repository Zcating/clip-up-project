import { app } from 'electron'
import path from 'path'

// Declare global variables as they are injected by the build system
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string
declare const MAIN_WINDOW_VITE_NAME: string

const isPackaged = app.isPackaged

interface EnvConfig {
  isProduction: boolean
  ffmpegPath: string
  ffprobePath: string
  assetsPath: string
  entryUrl: string
  devServerUrl: string
  appName: string
}

function getEnvConfig(): EnvConfig {
  if (app.isPackaged) {
    return {
      isProduction: isPackaged,
      ffmpegPath: path.join(process.resourcesPath, 'ffmpeg.exe'),
      ffprobePath: path.join(process.resourcesPath, 'ffprobe.exe'),
      assetsPath: path.join(process.resourcesPath, 'assets'),
      entryUrl: path.join(process.resourcesPath, 'app.asar/.vite/renderer/main_window/index.html'),
      devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
      appName: MAIN_WINDOW_VITE_NAME,
    }
  } else {
    return {
      isProduction: isPackaged,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ffmpegPath: require('ffmpeg-static'),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ffprobePath: require('ffprobe-static').path,
      assetsPath: path.join(__dirname, 'assets'),
      entryUrl: path.join(__dirname, '../renderer/main_window/index.html'),
      devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
      appName: MAIN_WINDOW_VITE_NAME,
    }
  }
}

export const envConfig = getEnvConfig()
