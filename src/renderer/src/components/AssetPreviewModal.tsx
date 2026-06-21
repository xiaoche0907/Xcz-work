import React from 'react'
import { X, ExternalLink } from 'lucide-react'
import { Asset } from '../../../shared/types'

interface AssetPreviewModalProps {
  asset: Asset | null
  onClose: () => void
}

export const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({ asset, onClose }) => {
  if (!asset) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[99999] flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      {/* 头部栏 */}
      <div 
        className="w-full flex items-center justify-between text-white text-xs mb-3 max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate font-semibold max-w-md" title={asset.fileName}>{asset.fileName}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.api.openPath(asset.filePath)}
            className="hover:text-brand-400 flex items-center gap-1.5 p-1 rounded transition-colors"
            title="在系统文件管理器中定位"
          >
            <ExternalLink size={14} />
            <span>打开本地目录</span>
          </button>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 原图灯箱展示区域 */}
      <div 
        className="relative flex-1 w-full max-w-5xl max-h-[85vh] flex items-center justify-center bg-transparent rounded-xl overflow-hidden shadow-2xl border border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={`media://${asset.filePath}`}
          alt={asset.fileName}
          className="max-w-full max-h-full object-contain select-text"
        />
      </div>

      {/* 底部属性小字 */}
      <div className="mt-3 text-[10px] text-gray-400 font-mono">
        尺寸: {asset.width} × {asset.height} | 类型: {asset.fileType} | 双击或按 Esc 键可退出预览
      </div>
    </div>
  )
}
