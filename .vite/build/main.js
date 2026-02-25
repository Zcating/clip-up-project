"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const child_process = require("child_process");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");
class DLogToRec709Converter {
  // 默认 D-Log 类型
  /**
   * 构造函数
   * @param config 转换器配置选项
   */
  constructor(config = {}) {
    this.ffmpegPath = config.ffmpegPath || ffmpegStatic || "";
    this.ffprobePath = config.ffprobePath || ffprobeStatic.path;
    this.mode = config.mode || "advanced";
    this.dlogType = config.dlogType || "dlogm";
  }
  /**
   * 构建视频滤镜字符串
   * 根据转换方法和 LUT 配置生成相应的 FFmpeg 滤镜链
   * @param method 转换方法：simple 或 advanced
   * @param lutPath LUT 文件路径（可选）
   * @returns FFmpeg 滤镜字符串
   */
  buildFilter(method = "advanced", lutPath) {
    if (lutPath) {
      return this.buildLutFilter(lutPath);
    }
    if (method === "simple") {
      return this.buildSimpleFilter();
    }
    return this.buildAdvancedFilter();
  }
  /**
   * 构建 LUT 滤镜
   * 使用 3D LUT 文件进行颜色转换
   * @param lutPath LUT 文件路径
   * @returns LUT 滤镜字符串
   */
  buildLutFilter(lutPath) {
    return `lut3d=${lutPath}`;
  }
  /**
   * 构建简单滤镜
   * 使用基础色彩空间转换参数将 D-Log 转为 Rec709
   * @returns 简单滤镜字符串
   */
  buildSimpleFilter() {
    return "gamma=rec709:colorprim=bt709:colortransfer=bt709:colorspace=bt709";
  }
  /**
   * 构建高级滤镜
   * 使用 zscale 滤镜进行更精确的色彩空间转换
   * 通过线性转换中间步骤确保色彩准确性
   * @returns 高级滤镜字符串
   */
  buildAdvancedFilter() {
    const dlogFilters = {
      dlog: "zscale=transfer=linear,primaries=bt709:transfer=bt709,zscale=transfer=bt709:primaries=bt709:matrix=bt709",
      dlogm: "zscale=transfer=linear,primaries=bt709:transfer=bt709,zscale=transfer=bt709:primaries=bt709:matrix=bt709"
    };
    const baseFilter = dlogFilters[this.dlogType] || dlogFilters.dlog;
    return baseFilter;
  }
  /**
   * 转换单个视频文件
   * 将输入视频从 D-Log 色彩空间转换为 Rec709 标准
   * @param inputPath 输入视频文件路径
   * @param outputPath 输出视频文件路径
   * @param options 转换选项配置
   * @returns 转换结果 Promise
   */
  async convert(inputPath, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        preset = "slow",
        // 默认使用 slow 预设以获得更好的压缩质量
        crf = 18,
        // 默认 CRF 值，平衡质量与文件大小
        overwrite = true,
        // 默认覆盖已存在的文件
        progress = null,
        // 默认不启用进度回调
        method = this.mode,
        // 使用实例默认的转换方法
        lut = null
        // 默认不使用 LUT
      } = options;
      if (!inputPath || !outputPath) {
        return reject(new Error("输入路径和输出路径不能为空"));
      }
      if (!fs.existsSync(inputPath)) {
        return reject(new Error(`输入文件不存在: ${inputPath}`));
      }
      if (lut && !fs.existsSync(lut)) {
        return reject(new Error(`LUT 文件不存在: ${lut}`));
      }
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const filterStr = this.buildFilter(method, lut || void 0);
      const args = [
        "-i",
        inputPath,
        // 输入文件
        "-vf",
        filterStr + ",scale=iw:ih,format=yuv420p",
        // 视频滤镜：色彩转换、缩放、像素格式
        "-c:v",
        "libx264",
        // 使用 H.264 编码
        "-preset",
        preset,
        // 编码预设
        "-crf",
        crf.toString(),
        // 质量参数
        "-c:a",
        "aac",
        // 音频编码使用 AAC
        "-b:a",
        "192k",
        // 音频比特率
        "-movflags",
        "+faststart",
        // 启用 faststart，便于流媒体播放
        overwrite ? "-y" : "-n",
        // -y 覆盖输出，-n 不覆盖
        outputPath
        // 输出文件路径
      ].filter((item) => typeof item === "string");
      const ffmpeg = child_process.spawn(this.ffmpegPath, args);
      let stderr = "";
      ffmpeg.stderr.on("data", (data) => {
        const str = data.toString();
        stderr += str;
        if (progress) {
          const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const seconds = parseInt(timeMatch[3], 10);
            const centiseconds = parseInt(timeMatch[4], 10);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
            progress(totalSeconds);
          }
        }
      });
      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true, outputPath });
        } else {
          reject(new Error(`FFmpeg 进程退出，错误码: ${code}
${stderr}`));
        }
      });
      ffmpeg.on("error", (err) => {
        reject(new Error(`无法启动 FFmpeg: ${err.message}`));
      });
      return ffmpeg;
    });
  }
  /**
   * 批量转换视频文件
   * 并发处理多个视频文件的转换任务
   * @param files 批量转换文件数组
   * @param concurrency 并发数量，默认为 2
   * @param options 批量转换选项
   * @returns 转换结果数组 Promise
   */
  async batchConvert(files, concurrency = 2, options = {}) {
    const results = [];
    let currentIndex = 0;
    const processFile = async () => {
      const index = currentIndex++;
      if (index >= files.length) {
        return null;
      }
      const { input, output, config } = files[index];
      const batchResult = await this.convert(input, output, config).then(() => ({
        input,
        output,
        error: null,
        success: true
      })).catch((err) => ({
        input,
        output,
        error: err instanceof Error ? err.message : String(err),
        success: false
      }));
      if (options.onProgress) {
        options.onProgress(index, files.length, batchResult);
      }
      results[index] = batchResult;
      return batchResult;
    };
    while (currentIndex < files.length) {
      const batch = [];
      for (let i = 0; i < concurrency; i++) {
        batch.push(processFile());
      }
      await Promise.all(batch);
    }
    return results;
  }
  /**
   * 获取视频文件信息
   * 使用 FFprobe 获取视频的详细元数据信息
   * @param inputPath 视频文件路径
   * @returns 视频信息对象 Promise
   */
  async getVideoInfo(inputPath) {
    return new Promise((resolve, reject) => {
      const args = [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        inputPath
      ];
      const ffprobe = child_process.spawn(this.ffprobePath, args);
      let stdout = "";
      ffprobe.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      ffprobe.on("close", (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout);
            resolve(info);
          } catch {
            reject(new Error("解析视频信息失败"));
          }
        } else {
          reject(new Error(`FFprobe 退出，错误码: ${code}`));
        }
      });
      ffprobe.on("error", (err) => {
        reject(new Error(`无法启动 FFprobe: ${err.message}`));
      });
    });
  }
}
let mainWindow = null;
const createWindow = () => {
  mainWindow = new electron.BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  {
    mainWindow.loadURL("http://localhost:5173");
  }
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("页面加载失败:", errorCode, errorDescription);
  });
};
electron.ipcMain.handle("open-video-files", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "视频文件", extensions: ["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm", "m4v", "mpg", "mpeg"] }
    ]
  });
  if (result.canceled) {
    return [];
  }
  return result.filePaths;
});
electron.ipcMain.handle("get-video-metadata", async (_event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString()
    };
  } catch (error) {
    console.error("获取视频元数据失败:", error);
    return null;
  }
});
electron.ipcMain.handle("batch-convert-videos", async (_event, options) => {
  const { inputFiles, outputDir, method = "advanced", dlogType = "dlogm", concurrency = 2 } = options;
  if (inputFiles.length === 0) {
    return { success: false, error: "没有输入文件" };
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const converter = new DLogToRec709Converter({ mode: method, dlogType });
  const files = inputFiles.map((inputPath) => {
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${fileName}_rec709.mp4`);
    return {
      input: inputPath,
      output: outputPath,
      config: {
        mode: method,
        dlogType,
        lut: path.join(__dirname, "DJI OSMO Pocket 3 D-Log M to Rec.709 V1.cube")
      }
    };
  });
  const results = await converter.batchConvert(files, concurrency, {
    onProgress: (currentIndex, total, result) => {
      mainWindow?.webContents.send("convert-progress", { currentIndex, total, result });
    }
  });
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
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
electron.ipcMain.handle("select-output-directory", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});
electron.app.on("ready", createWindow);
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
