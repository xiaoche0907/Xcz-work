/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React from 'react'
import { AlertCircle, CheckCircle2, Loader, Star } from 'lucide-react'
import { Asset } from '../../../shared/types'
import { useAppStore } from '../store/useAppStore'

interface AssetCardProps {
  asset: Asset
  isSelected: boolean
  onClick: (event: React.MouseEvent) => void
  onDoubleClick: () => void
  onFavoriteClick: (event: React.MouseEvent) => void
  onContextMenu: (event: React.MouseEvent) => void
  thumbnailSize: number
  isEditing?: boolean
  onRename?: (newName: string) => void
  onCancelRename?: () => void
  layoutMode?: 'waterfall' | 'grid' | 'adaptive' | 'list'
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  isSelected,
  onClick,
  onDoubleClick,
  onFavoriteClick,
  onContextMenu,
  thumbnailSize,
  isEditing,
  onRename,
  onCancelRename,
  layoutMode = 'grid'
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      const name = asset.fileName
      const dotIndex = name.lastIndexOf('.')
      inputRef.current.focus()
      if (dotIndex > 0) {
        inputRef.current.setSelectionRange(0, dotIndex)
      } else {
        inputRef.current.select()
      }
    }
  }, [isEditing, asset.fileName])
  const formattedSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const unit = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const index = Math.floor(Math.log(bytes) / Math.log(unit))
    return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(1))} ${sizes[index]}`
  }

  const renderAIStatus = () => {
    if (asset.aiStatus === 'processing') {
      return (
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-brand-500 px-1.5 py-0.5 text-[9px] text-white shadow-sm">
          <Loader size={9} className="animate-spin" />
          AI
        </span>
      )
    }

    if (asset.aiStatus === 'done') {
      return (
        <span
          className="absolute bottom-1.5 left-1.5 rounded-full bg-emerald-500 p-0.5 text-white"
          title="AI 已完成"
        >
          <CheckCircle2 size={10} />
        </span>
      )
    }

    if (asset.aiStatus === 'failed') {
      return (
        <span
          className="absolute bottom-1.5 left-1.5 rounded-full bg-red-500 p-0.5 text-white"
          title="AI 分析失败"
        >
          <AlertCircle size={10} />
        </span>
      )
    }

    return null
  }

  const showFileSize = useAppStore((state) => state.showFileSize)
  const showResolution = useAppStore((state) => state.showResolution)

  const isWaterfall = layoutMode === 'waterfall'
  const isAdaptive = layoutMode === 'adaptive'

  // 自适应模式下，高度固定为 thumbnailSize，宽度根据图片比例变化
  // 瀑布流模式下，宽度固定为 thumbnailSize，高度根据图片比例变化
  // 网格模式下，宽和高都固定为 thumbnailSize
  const cardWidth = isAdaptive
    ? Math.max(80, Math.min(320, Math.round(thumbnailSize * (asset.width / asset.height))))
    : thumbnailSize

  const imageHeight = isWaterfall
    ? Math.max(80, Math.min(320, Math.round(thumbnailSize * (asset.height / asset.width))))
    : thumbnailSize

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable={true}
      onDragStart={(event) => {
        const state = useAppStore.getState()
        state.setInternalDragging(true)
        let dragIds = state.selectedAssetIds
        // 如果当前素材没有在已选中列表里，我们把它设为当前选中，并以它为拖拽目标
        if (!dragIds.includes(asset.id)) {
          state.setSelectedAssetIds([asset.id])
          dragIds = [asset.id]
        }
        
        // 获取当前被选中的所有文件的物理绝对路径
        const filePaths = state.assets
          .filter((a) => dragIds.includes(a.id))
          .map((a) => a.filePath)
          
        // 阻止 HTML5 默认拖动，由 Electron 代理系统的原生拖动物理文件
        event.preventDefault()
        window.api.startDrag(filePaths)
      }}
      onDragEnd={() => {
        useAppStore.getState().setInternalDragging(false)
      }}
      className={`group relative flex flex-col rounded-md p-1.5 transition-colors asset-card-container ${
        isSelected ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-app-hover'
      }`}
      data-asset-id={asset.id}
      style={{ width: `${cardWidth}px` }}
    >
      <div
        className="relative flex w-full items-center justify-center overflow-hidden rounded bg-[#F4F5F7]"
        style={{ height: `${imageHeight}px` }}
      >
        <img
          src={`media://${asset.thumbnailPath}`}
          alt={asset.fileName}
          className={(isWaterfall || isAdaptive) ? "w-full h-full object-cover" : "max-h-full max-w-full object-contain"}
          loading="lazy"
          draggable={false}
        />

        <span className="absolute left-1.5 top-1.5 rounded bg-gray-700/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          {asset.fileType}
        </span>

        <button
          type="button"
          onClick={onFavoriteClick}
          className={`absolute right-1.5 top-1.5 rounded-full p-1 shadow-sm transition-opacity ${
            asset.isFavorite
              ? 'bg-gold text-white opacity-100'
              : 'bg-white/95 text-gray-300 opacity-0 hover:text-gold group-hover:opacity-100'
          }`}
          title={asset.isFavorite ? '取消收藏' : '收藏'}
        >
          <Star size={11} fill={asset.isFavorite ? 'currentColor' : 'none'} />
        </button>

        {renderAIStatus()}
      </div>

      <div className="flex min-h-[48px] flex-col items-center px-1 pt-2 text-center">
        {isEditing ? (
          <input
            ref={inputRef}
            defaultValue={asset.fileName}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
            onBlur={(e) => onRename && onRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRename && onRename(e.currentTarget.value)
              } else if (e.key === 'Escape') {
                onCancelRename && onCancelRename()
              }
            }}
            className="w-full text-center text-[12px] font-semibold text-gray-800 bg-white border border-gray-400 px-1 py-0.5 rounded outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        ) : (
          <h4
            title={asset.fileName}
            className={`line-clamp-2 w-full text-[12px] leading-[16px] ${
              isSelected ? 'font-semibold text-app-text' : 'font-normal text-gray-700'
            }`}
          >
            {asset.fileName}
          </h4>
        )}
        {(showResolution || showFileSize) && (
          <div className="mt-1 text-[11px] text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis w-full">
            {showResolution && `${asset.width}x${asset.height}`}
            {showResolution && showFileSize && '  '}
            {showFileSize && formattedSize(asset.fileSize)}
          </div>
        )}
      </div>
    </div>
  )
}
