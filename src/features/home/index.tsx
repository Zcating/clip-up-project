import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { VideoFile, ConvertProgress, BatchConvertResponse } from './types'
import { VideoTable } from './components/video-table'
import { VideoEmpty } from './components/video-empty'

function Home() {
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [outputDir, setOutputDir] = useState<string>('')
  const [convertProgress, setConvertProgress] = useState<ConvertProgress | null>(null)
  const [convertResult, setConvertResult] = useState<BatchConvertResponse | null>(null)

  useEffect(() => {
    const unsubscribe = window.electronAPI.onConvertProgress((data) => {
      setConvertProgress(data)
    })
    return () => unsubscribe()
  }, [])

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
    setConvertResult(null)
    setConvertProgress(null)
  }, [])

  const handleSelectOutputDir = useCallback(async () => {
    const dir = await window.electronAPI.selectOutputDirectory()
    if (dir) {
      setOutputDir(dir)
    }
  }, [])

  const handleBatchConvert = useCallback(async () => {
    if (videoFiles.length === 0 || !outputDir) {
      return
    }

    setIsConverting(true)
    setConvertProgress(null)
    setConvertResult(null)

    try {
      const inputFiles = videoFiles.map(v => v.path)
      const result = await window.electronAPI.batchConvertVideos({
        inputFiles,
        outputDir,
        method: 'advanced',
        dlogType: 'dlogm',
        concurrency: 2
      })
      if (result.error) {
        console.error('批量转换失败:', result.error)
      }
      console.log('批量转换成功:', result)
      setConvertResult(result)
    } catch (error) {
      console.error('批量转换失败:', error)
    } finally {
      setIsConverting(false)
    }
  }, [videoFiles, outputDir])

  const canConvert = videoFiles.length > 0 && outputDir && !isConverting

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

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">批量色彩还原</h2>

          <div className="flex gap-4 mb-4">
            <Button
              onClick={handleSelectOutputDir}
              variant="outline"
            >
              {outputDir ? '更换输出目录' : '选择输出目录'}
            </Button>

            {outputDir && (
              <span className="text-sm text-gray-500 self-center">
                输出目录: {outputDir}
              </span>
            )}
          </div>

          <div className="flex gap-4 mb-6">
            <Button
              onClick={handleBatchConvert}
              disabled={!canConvert}
            >
              {isConverting ? '转换中...' : '开始批量转换'}
            </Button>
          </div>

          {convertProgress && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                正在处理: {convertProgress.currentIndex + 1} / {convertProgress.total}
                {convertProgress.result && (
                  <span className={convertProgress.result.success ? ' text-green-600' : ' text-red-600'}>
                    {' '}({convertProgress.result.success ? '成功' : '失败'})
                  </span>
                )}
              </p>
            </div>
          )}

          {convertResult && (
            <div className={`p-4 rounded-lg ${convertResult.success ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <p className={`text-sm ${convertResult.success ? 'text-green-800' : 'text-yellow-800'}`}>
                转换完成: 共 {convertResult.summary.total} 个文件，
                成功 {convertResult.summary.success} 个，
                失败 {convertResult.summary.failed} 个
              </p>
              {convertResult.error && (
                <p className="text-sm text-red-600 mt-2">
                  错误信息: {convertResult.error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
