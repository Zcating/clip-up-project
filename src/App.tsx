import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface VideoFile {
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function App() {
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const handleImportVideos = useCallback(async () => {
    setIsImporting(true)
    try {
      const filePaths = await window.electronAPI.openVideoFiles()

      if (filePaths.length === 0) {
        setIsImporting(false)
        return
      }

      const videoMetadataPromises = filePaths.map(async (filePath) => {
        const metadata = await window.electronAPI.getVideoMetadata(filePath)
        return metadata
      })

      const metadataResults = await Promise.all(videoMetadataPromises)
      const validVideos = metadataResults.filter((m): m is VideoFile => m !== null)

      setVideoFiles(prev => [...prev, ...validVideos])
    } catch (error) {
      console.error('导入视频失败:', error)
    } finally {
      setIsImporting(false)
    }
  }, [])

  const handleRemoveVideo = useCallback((index: number) => {
    setVideoFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleClearAll = useCallback(() => {
    setVideoFiles([])
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">批量导入视频</h1>

          <div className="flex gap-4 mb-6">
            <Button
              onClick={handleImportVideos}
              disabled={isImporting}
            >
              {isImporting ? '导入中...' : '选择视频文件'}
            </Button>

            {videoFiles.length > 0 && (
              <Button
                onClick={handleClearAll}
                variant="outline"
              >
                清空列表
              </Button>
            )}
          </div>

          <div className="text-sm text-gray-500 mb-4">
            已选择 {videoFiles.length} 个视频文件
          </div>

          {videoFiles.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-gray-600">点击上方按钮选择视频文件</p>
              <p className="mt-1 text-gray-400 text-sm">支持 MP4, AVI, MOV, MKV, WMV, FLV, WebM 等格式</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>文件名</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>修改时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videoFiles.map((video, index) => (
                    <TableRow key={`${video.path}-${index}`}>
                      <TableCell>
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          <span className="text-sm text-gray-900 truncate max-w-xs" title={video.path}>
                            {video.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatFileSize(video.size)}
                      </TableCell>
                      <TableCell>
                        {new Date(video.lastModified).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVideo(index)}
                          className="text-red-600 hover:text-red-800 h-auto p-0"
                        >
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
