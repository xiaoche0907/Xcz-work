/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React from 'react'
import { ChevronLeft, FolderHeart } from 'lucide-react'
import { Asset } from '../../../shared/types'
import { AssetGrid } from '../components/AssetGrid'
import { useAppStore } from '../store/useAppStore'

interface BoardDetailPageProps {
  onDoubleClickAsset: (asset: Asset) => void
}

export const BoardDetailPage: React.FC<BoardDetailPageProps> = ({ onDoubleClickAsset }) => {
  const { activeBoardId, boards, setActiveTab, setActiveBoardId } = useAppStore()
  const board = boards.find((item) => item.id === activeBoardId)

  const handleBack = () => {
    setActiveBoardId(null)
    setActiveTab('boards')
  }

  if (!board) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-white text-[12px] text-gray-400">
        <p>该看板不存在或已被删除。</p>
        <button type="button" onClick={handleBack} className="mt-2 text-brand-600 hover:underline">
          返回看板列表
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-app-border bg-white px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="app-icon-button"
            title="返回看板列表"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="h-4 w-px bg-app-border" />
          <FolderHeart size={16} className="shrink-0 text-brand-500" />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold text-gray-900">{board.name}</h1>
            <p className="mt-0.5 truncate text-[11px] text-gray-400">
              {board.description || '暂无看板描述。你可以通过右键菜单把图片添加到该看板。'}
            </p>
          </div>
        </div>
        <span className="text-[12px] text-gray-400">{board.assets.length} 文件</span>
      </div>

      <AssetGrid onDoubleClickAsset={onDoubleClickAsset} />
    </div>
  )
}
