import { Button } from '@/components/ui/button'

interface ImportHeaderProps {
  isImporting: boolean
  hasVideos: boolean
  onImport: () => void
  onClear: () => void
}

export function ImportHeader({ isImporting, hasVideos, onImport, onClear }: ImportHeaderProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">批量导入视频</h1>

      <div className="flex gap-4 mb-6">
        <Button onClick={onImport} disabled={isImporting}>
          {isImporting ? '导入中...' : '选择视频文件'}
        </Button>

        {hasVideos && (
          <Button onClick={onClear} variant="outline">
            清空列表
          </Button>
        )}
      </div>
    </>
  )
}
