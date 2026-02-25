import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { DLogToRec709Converter } from './dlog-to-rec709-converter';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
  });
};

ipcMain.handle('open-video-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg'] }
    ]
  });

  if (result.canceled) {
    return [];
  }

  return result.filePaths;
});

ipcMain.handle('get-video-metadata', async (_event, filePath: string) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString()
    };
  } catch (error) {
    console.error('获取视频元数据失败:', error);
    return null;
  }
});

ipcMain.handle('batch-convert-videos', async (_event, options: {
  inputFiles: string[];
  outputDir: string;
  method?: 'simple' | 'advanced';
  dlogType?: 'dlog' | 'dlogm';
  concurrency?: number;
}) => {
  const { inputFiles, outputDir, method = 'advanced', dlogType = 'dlogm', concurrency = 2 } = options;

  if (inputFiles.length === 0) {
    return { success: false, error: '没有输入文件' };
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const converter = new DLogToRec709Converter({ mode: method, dlogType });

  const files = inputFiles.map(inputPath => {
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${fileName}_rec709.mp4`);
    return {
      input: inputPath, output: outputPath, config: {
        mode: method, dlogType, lut: path.join(__dirname, 'DJI OSMO Pocket 3 D-Log M to Rec.709 V1.cube')
      }
    };
  });

  const results = await converter.batchConvert(files, concurrency, {
    onProgress: (currentIndex, total, result) => {
      mainWindow?.webContents.send('convert-progress', { currentIndex, total, result });
    }
  });

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return {
    success: failCount === 0,
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: failCount
    }
  };
});

ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
