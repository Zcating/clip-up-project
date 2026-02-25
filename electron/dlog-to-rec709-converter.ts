import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

export interface ConvertOptions {
  preset?: string;
  crf?: number;
  overwrite?: boolean;
  progress?: (time: number) => void;
  method?: 'simple' | 'advanced';
  lut?: string;
  dlogType?: 'dlog' | 'dlogm';
}

interface ConvertResult {
  success: boolean;
  outputPath: string;
}

interface ConvertConfig {
  ffmpegPath?: string;
  ffprobePath?: string;
  mode?: 'simple' | 'advanced';
  dlogType?: 'dlog' | 'dlogm';
}

interface BatchFile {
  input: string;
  output: string;
  config: ConvertConfig;
}

interface BatchResult {
  input: string;
  output: string;
  error: string | null;
  success: boolean;
}

interface ConvertResult {
  success: boolean;
  outputPath: string;
}


interface BatchOptions {
  concurrency?: number;
  onProgress?: (currentIndex: number, total: number, result: BatchResult) => void;
}

export class DLogToRec709Converter {
  private ffmpegPath: string;
  private ffprobePath: string;
  private mode: 'simple' | 'advanced';
  private dlogType: 'dlog' | 'dlogm';

  constructor(config: ConvertConfig = {}) {
    this.ffmpegPath = config.ffmpegPath || ffmpegStatic || '';
    this.ffprobePath = config.ffprobePath || ffprobeStatic.path;
    this.mode = config.mode || 'advanced';
    this.dlogType = config.dlogType || 'dlogm';
  }

  private buildFilter(method: 'simple' | 'advanced' = 'advanced', lutPath?: string): string {
    if (lutPath) {
      return this.buildLutFilter(lutPath);
    }

    if (method === 'simple') {
      return this.buildSimpleFilter();
    }
    return this.buildAdvancedFilter();
  }

  private buildLutFilter(lutPath: string): string {
    return `lut3d=${lutPath}`;
  }

  private buildSimpleFilter(): string {
    return 'gamma=rec709:colorprim=bt709:colortransfer=bt709:colorspace=bt709';
  }

  private buildAdvancedFilter(): string {
    const dlogFilters: Record<string, string> = {
      dlog: 'zscale=transfer=linear,primaries=bt709:transfer=bt709,zscale=transfer=bt709:primaries=bt709:matrix=bt709',
      dlogm: 'zscale=transfer=linear,primaries=bt709:transfer=bt709,zscale=transfer=bt709:primaries=bt709:matrix=bt709'
    };

    const baseFilter = dlogFilters[this.dlogType] || dlogFilters.dlog;
    return baseFilter;
  }

  async convert(
    inputPath: string,
    outputPath: string,
    options: ConvertOptions = {},
  ): Promise<ConvertResult> {
    return new Promise((resolve, reject) => {
      const {
        preset = 'slow',
        crf = 18,
        overwrite = true,
        progress = null,
        method = this.mode,
        lut = null
      } = options;

      if (!inputPath || !outputPath) {
        return reject(new Error('输入路径和输出路径不能为空'));
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

      const filterStr = this.buildFilter(method, lut || undefined);

      const args: string[] = [
        '-i', inputPath,
        '-vf', filterStr + ',scale=iw:ih,format=yuv420p',
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', crf.toString(),
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        overwrite ? '-y' : '-n',
        outputPath
      ].filter((item): item is string => typeof item === 'string');

      const ffmpeg = spawn(this.ffmpegPath, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data: Buffer) => {
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

      ffmpeg.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ success: true, outputPath });
        } else {
          reject(new Error(`FFmpeg 进程退出，错误码: ${code}\n${stderr}`));
        }
      });

      ffmpeg.on('error', (err: Error) => {
        reject(new Error(`无法启动 FFmpeg: ${err.message}`));
      });

      return ffmpeg;
    });
  }

  async batchConvert(files: BatchFile[], concurrency = 2, options: BatchOptions = {}): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    let currentIndex = 0;

    const processFile = async (): Promise<BatchResult | null> => {
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
      } as BatchResult)).catch((err) => ({
        input,
        output,
        error: err instanceof Error ? err.message : String(err),
        success: false
      } as BatchResult));

      if (options.onProgress) {
        options.onProgress(index, files.length, batchResult);
      }

      results[index] = batchResult;

      return batchResult;
    };

    const batches: Promise<BatchResult | null>[][] = [];

    while (currentIndex < files.length) {
      const batch: Promise<BatchResult | null>[] = [];
      for (let i = 0; i < concurrency; i++) {
        batch.push(processFile());
      }
      batches.push(batch);
      await Promise.all(batch);
    }

    return results;
  }

  async getVideoInfo(inputPath: string): Promise<object> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        inputPath
      ];

      const ffprobe = spawn(this.ffprobePath, args);
      let stdout = '';

      ffprobe.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      ffprobe.on('close', (code: number | null) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout);
            resolve(info);
          } catch {
            reject(new Error('解析视频信息失败'));
          }
        } else {
          reject(new Error(`FFprobe 退出，错误码: ${code}`));
        }
      });

      ffprobe.on('error', (err: Error) => {
        reject(new Error(`无法启动 FFprobe: ${err.message}`));
      });
    });
  }
}

