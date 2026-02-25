export interface VideoFile {
  name: string
  path: string
  size: number
  lastModified: string
}

declare global {
  interface Window {
    electronAPI: {
      openVideoFiles: () => Promise<string[]>
      getVideoMetadata: (filePath: string) => Promise<VideoFile | null>
      setTitle: (title: string) => void
    }
  }
}
