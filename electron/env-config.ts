import { app } from 'electron';
import path from 'path';

// Declare global variables as they are injected by the build system
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const isPackaged = app.isPackaged;

// Determine paths for ffmpeg and ffprobe
let ffmpegPath: string = '';
let ffprobePath: string = '';

if (isPackaged) {
  // Production: use resources path
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '';
  ffmpegPath = path.join(process.resourcesPath, 'ffmpeg' + ext);
  ffprobePath = path.join(process.resourcesPath, 'ffprobe' + ext);
} else {
  try {
    // Development: use static binaries from node_modules
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ffmpegPath = require('ffmpeg-static') as string;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ffprobePath = (require('ffprobe-static') as { path: string }).path;
  } catch (error) {
    console.error('Failed to load ffmpeg/ffprobe in dev environment:', error);
  }
}

// Assets path
const assetsPath = path.join(__dirname, 'assets');

// Entry URL for the main window
const entryUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL
  ? MAIN_WINDOW_VITE_DEV_SERVER_URL
  : path.join(__dirname, '../renderer/main_window/index.html');

// isLocalFile logic: true when there is NO dev server URL
const isLocalFile = !MAIN_WINDOW_VITE_DEV_SERVER_URL;

// DevTools logic: open in development
const openDevTools = !!MAIN_WINDOW_VITE_DEV_SERVER_URL;

export const envConfig = {
  isPackaged,
  ffmpegPath,
  ffprobePath,
  assetsPath,
  entryUrl,
  isLocalFile,
  openDevTools,
};

// Export these for type checking if needed elsewhere, 
// though they are global variables injected at runtime.
export { MAIN_WINDOW_VITE_DEV_SERVER_URL, MAIN_WINDOW_VITE_NAME };
