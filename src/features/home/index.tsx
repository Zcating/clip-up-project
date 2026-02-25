import { useState, useCallback, useEffect } from 'react'
import type { VideoFile, ConvertProgress, BatchConvertResponse } from './types'
import { VideoTable } from './components/video-table'
import { VideoEmpty } from './components/video-empty'
import { ImportHeader } from './components/import-header'
import { OutputConfig } from './components/output-config'
import { ConvertActions } from './components/convert-actions'
import { ConversionStatus } from './components/conversion-status'
import { ConversionResult } from './components/conversion-result'

/**
 * Home 组件
 *
 * 应用程序的主页面，包含以下主要功能：
 * 1. 批量导入视频文件
 * 2. 显示已导入的视频列表
 * 3. 配置输出目录
 * 4. 执行批量色彩还原转换
 * 5. 显示转换进度和结果
 */
function Home() {
  // 状态定义

  // 存储已导入的视频文件列表
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([])

  // 标记是否正在导入视频（用于显示加载状态）
  const [isImporting, setIsImporting] = useState(false)

  // 标记是否正在进行转换任务
  const [isConverting, setIsConverting] = useState(false)

  // 存储用户选择的输出目录路径
  const [outputDir, setOutputDir] = useState<string>('')

  // 存储当前转换任务的总体进度信息（如当前正在处理第几个文件）
  const [convertProgress, setConvertProgress] = useState<ConvertProgress | null>(null)

  // 存储每个文件的具体转换进度百分比 (key: 文件索引, value: 进度0-100)
  const [fileProgressMap, setFileProgressMap] = useState<Record<number, number>>({})

  // 存储批量转换完成后的最终结果
  const [convertResult, setConvertResult] = useState<BatchConvertResponse | null>(null)

  // 副作用：监听 Electron 主进程发送的进度事件
  useEffect(() => {
    // 监听总体转换进度（例如：切换到下一个文件）
    const unsubscribeProgress = window.electronAPI.onConvertProgress((data) => {
      setConvertProgress(data)
      // 当收到总体进度更新时，意味着上一个文件已完成，确保将其进度设置为 100%
      setFileProgressMap((prev) => ({
        ...prev,
        [data.currentIndex]: 100,
      }))
    })

    // 监听单个文件的详细转换进度（例如：ffmpeg 处理进度）
    const unsubscribeFileProgress = window.electronAPI.onConvertFileProgress((data) => {
      setFileProgressMap((prev) => ({
        ...prev,
        [data.currentIndex]: data.progress,
      }))
    })

    // 组件卸载时取消监听，防止内存泄漏
    return () => {
      unsubscribeProgress()
      unsubscribeFileProgress()
    }
  }, [])

  /**
   * 处理导入视频按钮点击
   * 打开文件选择对话框，读取元数据，并更新视频列表
   */
  const handleImportVideos = useCallback(async () => {
    setIsImporting(true)
    try {
      // 调用 Electron API 打开文件选择框
      const filePaths = await window.electronAPI.openVideoFiles()
      if (filePaths.length === 0) {
        setIsImporting(false)
        return
      }

      // 并行获取所有选中视频的元数据
      const videoMetadataPromises = filePaths.map(async (filePath) => {
        const metadata = await window.electronAPI.getVideoMetadata(filePath)
        return metadata
      })

      const metadataResults = await Promise.all(videoMetadataPromises)
      // 过滤掉获取元数据失败的文件
      const validVideos = metadataResults.filter((m): m is VideoFile => m !== null)

      // 将新导入的视频追加到现有列表中
      setVideoFiles((prev) => [...prev, ...validVideos])
    } catch (error) {
      console.error('导入视频失败:', error)
    } finally {
      setIsImporting(false)
    }
  }, [])

  /**
   * 处理移除单个视频
   * @param index 要移除的视频在列表中的索引
   */
  const handleRemoveVideo = useCallback((index: number) => {
    setVideoFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  /**
   * 处理清空所有视频
   * 同时重置相关的转换状态
   */
  const handleClearAll = useCallback(() => {
    setVideoFiles([])
    setConvertResult(null)
    setConvertProgress(null)
  }, [])

  /**
   * 处理选择输出目录
   * 打开文件夹选择对话框并更新状态
   */
  const handleSelectOutputDir = useCallback(async () => {
    const dir = await window.electronAPI.selectOutputDirectory()
    if (dir) {
      setOutputDir(dir)
    }
  }, [])

  /**
   * 处理开始批量转换
   * 验证条件，重置进度状态，并调用 Electron API 开始任务
   */
  const handleBatchConvert = useCallback(async () => {
    // 基本校验：必须有视频文件且已选择输出目录
    if (videoFiles.length === 0 || !outputDir) {
      return
    }

    setIsConverting(true)
    // 重置之前的进度和结果状态
    setConvertProgress(null)
    setFileProgressMap({})
    setConvertResult(null)

    try {
      const inputFiles = videoFiles.map((v) => v.path)
      // 调用 Electron API 执行批量转换
      const result = await window.electronAPI.batchConvertVideos({
        inputFiles,
        outputDir,
        method: 'advanced', // 默认使用高级模式
        dlogType: 'dlogm', // 默认 D-Log M
        concurrency: 2, // 并发数为 2
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

  // 计算是否满足开始转换的条件
  const canConvert = videoFiles.length > 0 && !!outputDir && !isConverting

  // 计算总体进度百分比（用于显示总进度条）
  const totalFiles = videoFiles.length
  const totalProgressPercent =
    totalFiles > 0 ? Object.values(fileProgressMap).reduce((a, b) => a + b, 0) / totalFiles : 0

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 顶部区域：导入和列表管理 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <ImportHeader
            isImporting={isImporting}
            hasVideos={videoFiles.length > 0}
            onImport={handleImportVideos}
            onClear={handleClearAll}
          />

          <div className="text-sm text-gray-500 mb-4">已选择 {videoFiles.length} 个视频文件</div>

          {/* 视频列表展示：空状态或表格 */}
          {videoFiles.length === 0 ? (
            <VideoEmpty />
          ) : (
            <VideoTable videos={videoFiles} onRemove={handleRemoveVideo} disabled={isConverting} />
          )}
        </div>

        {/* 底部区域：输出配置、操作按钮及进度/结果展示 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <OutputConfig outputDir={outputDir} onSelectDir={handleSelectOutputDir} />

          <ConvertActions
            isConverting={isConverting}
            canConvert={canConvert}
            onStartConvert={handleBatchConvert}
          />

          {/* 转换进行中：显示详细进度 */}
          {isConverting && (
            <ConversionStatus
              convertProgress={convertProgress}
              fileProgressMap={fileProgressMap}
              videoFiles={videoFiles}
              totalFiles={totalFiles}
              totalProgressPercent={totalProgressPercent}
            />
          )}

          {/* 转换完成：显示结果汇总 */}
          {convertResult && <ConversionResult convertResult={convertResult} />}
        </div>
      </div>
    </div>
  )
}

export default Home
