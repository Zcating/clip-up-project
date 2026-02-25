import { Button } from '@/components/ui/button'

interface OutputConfigProps {
  outputDir: string
  onSelectDir: () => void
}

export function OutputConfig({
  outputDir,
  onSelectDir
}: OutputConfigProps) {
  return (
    <>
      <h2 className="text-xl font-bold text-gray-800 mb-4">批量色彩还原</h2>

      <div className="flex gap-4 mb-4">
        <Button
          onClick={onSelectDir}
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
    </>
  )
}
