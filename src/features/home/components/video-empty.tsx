export function VideoEmpty() {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="mt-2 text-gray-600">点击上方按钮选择视频文件</p>
      <p className="mt-1 text-gray-400 text-sm">支持 MP4, AVI, MOV, MKV, WMV, FLV, WebM 等格式</p>
    </div>
  )
}
