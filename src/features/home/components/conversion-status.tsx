import { Progress } from '@/components/ui/progress'
import type { VideoFile, ConvertProgress } from '../types'

interface ConversionStatusProps {
  convertProgress: ConvertProgress | null
  fileProgressMap: Record<number, number>
  videoFiles: VideoFile[]
  totalFiles: number
  totalProgressPercent: number
}

export function ConversionStatus({
  convertProgress,
  fileProgressMap,
  videoFiles,
  totalFiles,
  totalProgressPercent,
}: ConversionStatusProps) {
  return (
    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-blue-800">
          已完成: {convertProgress ? convertProgress.currentIndex + 1 : 0} / {totalFiles}
          {convertProgress && convertProgress.result && (
            <span className={convertProgress.result.success ? ' text-green-600' : ' text-red-600'}>
              {' '}
              (上一个{convertProgress.result.success ? '成功' : '失败'})
            </span>
          )}
        </p>
        <p className="text-sm text-blue-800 font-medium">{totalProgressPercent.toFixed(2)}%</p>
      </div>
      <Progress value={totalProgressPercent} />

      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium text-blue-900">文件进度详情:</p>
        <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
          {videoFiles.map((video, index) => {
            const progress = fileProgressMap[index] || 0
            const isProcessing = progress > 0 || index === (convertProgress?.currentIndex ?? -1)

            if (!isProcessing) return null

            return (
              <div key={index} className="flex items-center gap-3 text-sm">
                <span className="w-48 truncate text-gray-600" title={video.name}>
                  {video.name}
                </span>
                <div className="flex-1">
                  <Progress value={progress} className="h-1.5" />
                </div>
                <span
                  className={`w-12 text-right font-medium ${progress === 100 ? 'text-green-600' : 'text-blue-600'
                    }`}
                >
                  {progress.toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
