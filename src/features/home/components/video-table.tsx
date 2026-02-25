import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { VideoFile } from '../types'
import { formatFileSize } from '../utils/format-file-size'

interface VideoTableProps {
  videos: VideoFile[]
  onRemove: (index: number) => void
}

export function VideoTable({ videos, onRemove }: VideoTableProps) {
  return (
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
          {videos.map((video, index) => (
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
                  onClick={() => onRemove(index)}
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
  )
}
