import { Button } from '@/components/ui/button'

interface ConvertActionsProps {
  isConverting: boolean
  canConvert: boolean
  onStartConvert: () => void
}

export function ConvertActions({
  isConverting,
  canConvert,
  onStartConvert
}: ConvertActionsProps) {
  return (
    <div className="flex gap-4 mb-6">
      <Button
        onClick={onStartConvert}
        disabled={!canConvert}
      >
        {isConverting ? '转换中...' : '开始批量转换'}
      </Button>
    </div>
  )
}
