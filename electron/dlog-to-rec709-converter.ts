// 引入 Node.js 原生模块
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * 视频转换选项接口
 * 定义单个视频转换任务的配置参数
 */
export interface ConvertOptions {
  preset?: string;           // FFmpeg 编码预设 (如 ultrafast, slow 等)
  crf?: number;               // 恒定速率因子，值越小质量越高 (0-51)
  overwrite?: boolean;       // 是否覆盖已存在的输出文件
  progress?: (time: number) => void;  // 进度回调函数，参数为当前处理秒数
  method?: 'simple' | 'advanced';  // 转换方法：简单模式或高级模式
  lut?: string;              // LUT (Look-Up Table) 文件路径，用于自定义颜色映射
  dlogType?: 'dlog' | 'dlogm';  // D-Log 类型：dlog 或 dlogm
  mode?: 'simple' | 'advanced';  // 转换模式：简单模式或高级模式
}

/**
 * 转换结果接口
 * 返回转换操作的成功状态和输出文件路径
 */
interface ConvertResult {
  success: boolean;           // 转换是否成功
  outputPath: string;         // 输出文件的完整路径
}

/**
 * 转换器配置接口
 * 用于初始化 DLogToRec709Converter 类的配置选项
 */
interface ConvertConfig {
  ffmpegPath: string;        // 自定义 FFmpeg 可执行文件路径
  ffprobePath: string;       // 自定义 FFprobe 可执行文件路径
  mode?: 'simple' | 'advanced';  // 默认转换模式
  dlogType?: 'dlog' | 'dlogm';   // 默认 D-Log 类型
}

/**
 * 批量转换文件接口
 * 定义批量转换任务中的单个文件信息
 */
interface BatchFile {
  input: string;              // 输入文件路径
  output: string;             // 输出文件路径
  config: {
    mode?: 'simple' | 'advanced';  // 默认转换模式
    dlogType?: 'dlog' | 'dlogm';   // 默认 D-Log 类型
    lut?: string;              // LUT (Look-Up Table) 文件路径，用于自定义颜色映射
  };      // 该文件的转换配置
}

/**
 * 批量转换结果接口
 * 返回单个文件转换的结果信息
 */
interface BatchResult {
  input: string;              // 输入文件路径
  output: string;             // 输出文件路径
  error: string | null;       // 错误信息，成功时为 null
  success: boolean;           // 转换是否成功
}

/**
 * 批量转换选项接口
 * 定义批量转换任务的配置参数
 */
interface BatchOptions {
  concurrency?: number;       // 并发转换的文件数量
  onProgress?: (currentIndex: number, total: number, result: BatchResult) => void;  // 进度回调
  onFileProgress?: (currentIndex: number, total: number, progress: number) => void; // 单个文件进度回调 (0-100)
}

/**
 * D-Log 转 Rec709 转换器类
 * 用于将松下 D-Log 格式视频转换为 Rec709 标准色彩空间的工具类
 * 使用 FFmpeg 进行视频处理，支持单个转换和批量转换
 */
export class DLogToRec709Converter {
  private ffmpegPath: string;       // FFmpeg 可执行文件路径
  private ffprobePath: string;      // FFprobe 可执行文件路径

  /**
   * 构造函数
   * @param config 转换器配置选项
   */
  constructor(config: ConvertConfig) {
    // 初始化 FFmpeg 路径，优先使用自定义路径，否则使用 ffmpeg-static
    this.ffmpegPath = config.ffmpegPath;
    // 初始化 FFprobe 路径
    this.ffprobePath = config.ffprobePath;
  }

  /**
   * 构建视频滤镜字符串
   * 根据转换方法和 LUT 配置生成相应的 FFmpeg 滤镜链
   * @param method 转换方法：simple 或 advanced
   * @param lutPath LUT 文件路径（可选）
   * @returns FFmpeg 滤镜字符串
   */
  private buildFilter(method: 'simple' | 'advanced' = 'advanced', dlogType: 'dlog' | 'dlogm' = 'dlogm', lutPath?: string): string {
    // 如果提供了 LUT 文件路径，使用 LUT 滤镜
    if (lutPath) {
      return this.buildLutFilter(lutPath);
    }

    // 根据方法选择对应的滤镜构建方式
    if (method === 'simple') {
      return this.buildSimpleFilter();
    }
    return this.buildAdvancedFilter(dlogType);
  }

  /**
   * 构建 LUT 滤镜
   * 使用 3D LUT 文件进行颜色转换
   * @param lutPath LUT 文件路径
   * @returns LUT 滤镜字符串
   */
  private buildLutFilter(lutPath: string): string {
    const normalizedPath = lutPath.replace(/\\/g, '/');
    const escapedPath = normalizedPath.replace(/:/g, '\\:');
    return `lut3d=file='${escapedPath}'`;
  }

  /**
   * 构建简单滤镜
   * 使用基础色彩空间转换参数将 D-Log 转为 Rec709
   * @returns 简单滤镜字符串
   */
  private buildSimpleFilter(): string {
    return 'gamma=rec709:colorprim=bt709:colortransfer=bt709:colorspace=bt709';
  }

  /**
   * 构建高级滤镜
   * 使用 zscale 滤镜进行更精确的色彩空间转换
   * 通过线性转换中间步骤确保色彩准确性
   * @returns 高级滤镜字符串
   */
  private buildAdvancedFilter(dlogType: 'dlog' | 'dlogm' = 'dlogm'): string {
    // D-Log 和 D-LogM 使用相同的滤镜链
    const dlogFilters: Record<string, string> = {
      dlog: 'zscale=transfer=linear,primaries=bt709:transfer=bt709,zscale=transfer=bt709:primaries=bt709:matrix=bt709',
      dlogm: 'zscale=transfer=linear,primaries=bt709:transfer=bt709,zscale=transfer=bt709:primaries=bt709:matrix=bt709'
    };

    // 根据 dlogType 选择对应的滤镜，默认使用 dlog
    const baseFilter = dlogFilters[dlogType] || dlogFilters.dlog;
    return baseFilter;
  }

  /**
   * 获取视频时长
   * @param inputPath 视频文件路径
   * @returns 视频时长（秒）
   */
  private getVideoDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        inputPath
      ];

      const ffprobe = spawn(this.ffprobePath, args);
      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          const duration = parseFloat(stdout);
          if (isNaN(duration)) {
            reject(new Error('无法解析视频时长'));
          } else {
            resolve(duration);
          }
        } else {
          reject(new Error(`ffprobe 退出，错误码: ${code}\n${stderr}`));
        }
      });

      ffprobe.on('error', (err) => {
        reject(new Error(`无法启动 ffprobe: ${err.message}`));
      });
    });
  }

  /**
   * 转换单个视频文件
   * 将输入视频从 D-Log 色彩空间转换为 Rec709 标准
   * @param inputPath 输入视频文件路径
   * @param outputPath 输出视频文件路径
   * @param options 转换选项配置
   * @returns 转换结果 Promise
   */
  async convert(
    inputPath: string,
    outputPath: string,
    options: ConvertOptions = {},
  ): Promise<ConvertResult> {
    return new Promise((resolve, reject) => {
      // 解构转换选项，设置默认值
      const {
        preset = 'slow',      // 默认使用 slow 预设以获得更好的压缩质量
        crf = 18,             // 默认 CRF 值，平衡质量与文件大小
        overwrite = true,     // 默认覆盖已存在的文件
        progress = null,      // 默认不启用进度回调
        method,               // 使用实例默认的转换方法
        dlogType = 'dlogm',
        lut = null            // 默认不使用 LUT
      } = options;

      // 验证输入路径和输出路径不能为空
      if (!inputPath || !outputPath) {
        return reject(new Error('输入路径和输出路径不能为空'));
      }

      // 检查输入文件是否存在
      if (!fs.existsSync(inputPath)) {
        return reject(new Error(`输入文件不存在: ${inputPath}`));
      }

      // 如果使用 LUT，检查 LUT 文件是否存在
      if (lut && !fs.existsSync(lut)) {
        return reject(new Error(`LUT 文件不存在: ${lut}`));
      }

      // 确保输出目录存在，不存在则创建
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 构建滤镜字符串
      const filterStr = this.buildFilter(method, dlogType, lut || undefined);

      // 构建 FFmpeg 命令参数数组
      const args: string[] = [
        '-i', inputPath,                    // 输入文件
        '-vf', filterStr + ',scale=iw:ih,format=yuv420p',  // 视频滤镜：色彩转换、缩放、像素格式
        '-c:v', 'libx264',                   // 使用 H.264 编码
        '-preset', preset,                   // 编码预设
        '-crf', crf.toString(),              // 质量参数
        '-c:a', 'aac',                       // 音频编码使用 AAC
        '-b:a', '192k',                      // 音频比特率
        '-movflags', '+faststart',           // 启用 faststart，便于流媒体播放
        overwrite ? '-y' : '-n',             // -y 覆盖输出，-n 不覆盖
        outputPath                           // 输出文件路径
      ].filter((item): item is string => typeof item === 'string');

      // 启动 FFmpeg 子进程
      const ffmpeg = spawn(this.ffmpegPath, args);
      let stderr = '';

      // 监听 FFmpeg 标准错误输出，用于解析进度信息
      ffmpeg.stderr.on('data', (data: Buffer) => {
        const str = data.toString();
        stderr += str;

        // 如果提供了进度回调函数，解析时间信息
        if (progress) {
          // 使用正则表达式匹配 FFmpeg 输出的时间格式 HH:MM:SS.CC
          const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
          if (timeMatch) {
            // 解析时间组成部分并计算总秒数
            const hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const seconds = parseInt(timeMatch[3], 10);
            const centiseconds = parseInt(timeMatch[4], 10);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
            // 调用进度回调
            progress(totalSeconds);
          }
        }
      });

      // 监听 FFmpeg 进程结束事件
      ffmpeg.on('close', (code: number | null) => {
        // 退出码 0 表示成功
        if (code === 0) {
          resolve({ success: true, outputPath });
        } else {
          reject(new Error(`FFmpeg 进程退出，错误码: ${code}\n${stderr}`));
        }
      });

      // 监听 FFmpeg 进程错误事件
      ffmpeg.on('error', (err: Error) => {
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
  async batchConvert(files: BatchFile[], concurrency = 2, options: BatchOptions = {}): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    let currentIndex = 0;

    /**
     * 处理单个文件的转换任务
     * @returns 转换结果或 null（如果所有文件已处理完）
     */
    const processFile = async (): Promise<BatchResult | null> => {
      // 获取当前文件索引并递增
      const index = currentIndex++;
      // 如果索引超出文件数组范围，返回 null
      if (index >= files.length) {
        return null;
      }

      // 从文件数组中获取当前文件信息
      const { input, output, config } = files[index];

      let duration = 0;
      try {
        duration = await this.getVideoDuration(input);
      } catch (e) {
        console.warn(`无法获取视频时长: ${input}`, e);
      }

      const fileConfig: ConvertOptions = {
        ...config,
        progress: (time: number) => {
          if (duration <= 0 || typeof options.onFileProgress !== 'function') {
            return;
          }
          const percent = Math.min(100, (time / duration) * 100);
          options.onFileProgress(index, files.length, percent);

        }
      };

      // 执行转换并处理结果
      const batchResult = await this.convert(input, output, fileConfig).then(() => ({
        input,
        output,
        error: null,
        success: true
      } as BatchResult)).catch((err) => ({
        input,
        output,
        error: err instanceof Error ? err.message : String(err),
        success: false
      } as BatchResult));

      // 如果提供了进度回调，通知转换进度
      if (options.onProgress) {
        options.onProgress(index, files.length, batchResult);
      }

      // 将结果存储到结果数组的对应位置
      results[index] = batchResult;

      return batchResult;
    };

    // 存储所有批次的 Promise
    const batches: Promise<BatchResult | null>[][] = [];

    // 循环处理所有文件直到完成
    while (currentIndex < files.length) {
      // 创建当前批次的 Promise 数组
      const batch: Promise<BatchResult | null>[] = [];
      // 根据并发数量创建多个转换任务
      for (let i = 0; i < concurrency; i++) {
        batch.push(processFile());
      }
      // 将当前批次添加到批次列表
      batches.push(batch);
      // 等待当前批次所有转换完成
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
  async getVideoInfo(inputPath: string): Promise<object> {
    return new Promise((resolve, reject) => {
      // FFprobe 命令参数：静默模式、JSON 格式输出、显示格式和流信息
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        inputPath
      ];

      // 启动 FFprobe 子进程
      const ffprobe = spawn(this.ffprobePath, args);
      let stdout = '';

      // 监听标准输出，收集 FFprobe 结果
      ffprobe.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      // 监听 FFprobe 进程结束事件
      ffprobe.on('close', (code: number | null) => {
        if (code === 0) {
          try {
            // 解析 JSON 格式的输出
            const info = JSON.parse(stdout);
            resolve(info);
          } catch {
            reject(new Error('解析视频信息失败'));
          }
        } else {
          reject(new Error(`FFprobe 退出，错误码: ${code}`));
        }
      });

      // 监听 FFprobe 进程错误事件
      ffprobe.on('error', (err: Error) => {
        reject(new Error(`无法启动 FFprobe: ${err.message}`));
      });
    });
  }
}
