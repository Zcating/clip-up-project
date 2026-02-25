export interface VideoFile {
  name: string
  path: string
  size: number
  lastModified: string
}

export interface ConvertOptions {
  inputFiles: string[]
  outputDir: string
  method?: 'simple' | 'advanced'
  dlogType?: 'dlog' | 'dlogm'
  concurrency?: number
}

export interface ConvertResult {
  input: string
  output: string
  error: string | null
  success: boolean
}

export interface ConvertSummary {
  total: number
  success: number
  failed: number
}

export interface BatchConvertResponse {
  success: boolean
  results: ConvertResult[]
  summary: ConvertSummary
  error?: string
}

export interface ConvertProgress {
  currentIndex: number
  total: number
  result: ConvertResult
}

export interface ConvertFileProgress {
  currentIndex: number
  total: number
  progress: number
}

declare global {
  interface Window {
    electronAPI: {
      openVideoFiles: () => Promise<string[]>
      getVideoMetadata: (filePath: string) => Promise<VideoFile | null>
      setTitle: (title: string) => void
      selectOutputDirectory: () => Promise<string | null>
      batchConvertVideos: (options: ConvertOptions) => Promise<BatchConvertResponse>
      onConvertProgress: (callback: (data: ConvertProgress) => void) => () => void
      onConvertFileProgress: (callback: (data: ConvertFileProgress) => void) => () => void
    }
  }
}
