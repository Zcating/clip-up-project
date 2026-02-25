import type { BatchConvertResponse } from '../types'

interface ConversionResultProps {
  convertResult: BatchConvertResponse
}

export function ConversionResult({ convertResult }: ConversionResultProps) {
  return (
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
      {convertResult.results.filter(r => !r.success).length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-red-800 mb-2">失败文件详情:</p>
          <ul className="text-sm text-red-700 space-y-1">
            {convertResult.results
              .filter(r => !r.success)
              .map((result, index) => (
                <li key={index} className="break-all">
                  {result.input}: {result.error || '未知错误'}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
