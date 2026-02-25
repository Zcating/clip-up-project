import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { VideoFile } from './types'
import { VideoTable } from './components/video-table'
import { VideoEmpty } from './components/video-empty'

function Home() {
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
            <VideoEmpty />
          ) : (
            <VideoTable videos={videoFiles} onRemove={handleRemoveVideo} />
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
