/* eslint-disable @typescript-eslint/explicit-function-return-type, react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react'
import { Folder as FolderIcon, RefreshCw, Sparkles, X, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { Asset, Folder, Tag } from '../../../shared/types'
import { useAppStore } from '../store/useAppStore'
import clsx from 'clsx'



export const RightInspector: React.FC<{ width?: number }> = ({ width }) => {
  const {
    selectedAssetIds,
    assets,
    folders,
    tags,
    boards,
    activeTab,
    activeFolderId,
    activeBoardId,
    createTag,
    updateAssetTags,
    saveAsset,
    analyzeImage,
    settings,
    setRightSidebarOpen,
    setActiveFolderId,
    setActiveTab
  } = useAppStore()

  const [newTagInput, setNewTagInput] = useState('')
  const [batchTagInput, setBatchTagInput] = useState('')

  // 基础信息编辑状态
  const [fileNameInput, setFileNameInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')
  const [sourceUrlInput, setSourceUrlInput] = useState('')

  // 色卡分析状态
  interface ColorItem {
    hex: string
    percentage: number
  }
  const [palette, setPalette] = useState<ColorItem[]>([])
  const [copiedColor, setCopiedColor] = useState<string | null>(null)

  const [isFolderSectionOpen, setIsFolderSectionOpen] = useState(() => {
    const saved = localStorage.getItem('is_folder_section_open')
    return saved === null ? true : saved === 'true'
  })

  const toggleFolderSection = () => {
    const nextVal = !isFolderSectionOpen
    setIsFolderSectionOpen(nextVal)
    localStorage.setItem('is_folder_section_open', String(nextVal))
  }

  const selectedAsset: Asset | null =
    selectedAssetIds.length === 1
      ? assets.find((asset) => asset.id === selectedAssetIds[0]) || null
      : null

  // 同步用户输入内容与生成色卡调色盘
  useEffect(() => {
    if (!selectedAsset) {
      setFileNameInput('')
      setDescriptionInput('')
      setSourceUrlInput('')
      setPalette([])
      return
    }

    setFileNameInput(selectedAsset.fileName)
    setDescriptionInput(selectedAsset.description || '')
    setSourceUrlInput(selectedAsset.sourceUrl || '')

    // 利用 Canvas 在前端分析提取缩略图的主要色盘（8个色块及占比）
    const analyzeColor = () => {
      try {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        const normalizedPath = selectedAsset.thumbnailPath.replace(/\\/g, '/')
        img.src = `media://${encodeURI(normalizedPath)}`
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            canvas.width = 40
            canvas.height = 40
            ctx.drawImage(img, 0, 0, 40, 40)
            const imgData = ctx.getImageData(0, 0, 40, 40).data

            // 1. 统计颜色频数
            const colorCounts: { [key: string]: number } = {}
            let totalValidPixels = 0

            for (let i = 0; i < imgData.length; i += 4) {
              const r = imgData[i]
              const g = imgData[i + 1]
              const b = imgData[i + 2]
              const a = imgData[i + 3]

              if (a > 200) {
                // 对 RGB 进行网格量化，合并相近色
                const qr = Math.round(r / 20) * 20
                const qg = Math.round(g / 20) * 20
                const qb = Math.round(b / 20) * 20

                const clamp = (v: number) => Math.max(0, Math.min(255, v))
                const key = `${clamp(qr)},${clamp(qg)},${clamp(qb)}`

                colorCounts[key] = (colorCounts[key] || 0) + 1
                totalValidPixels++
              }
            }

            // 2. 转换成数组并降序排列
            const rawColors = Object.keys(colorCounts).map((key) => {
              const [r, g, b] = key.split(',').map(Number)
              return { r, g, b, count: colorCounts[key] }
            })
            rawColors.sort((a, b) => b.count - a.count)

            // 3. 欧式距离聚类合并（阈值为 45）
            const mergedColors: { r: number; g: number; b: number; count: number }[] = []
            const colorDistance = (
              c1: { r: number; g: number; b: number },
              c2: { r: number; g: number; b: number }
            ) => {
              return Math.sqrt(
                Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
              )
            }

            for (const current of rawColors) {
              let foundGroup = false
              for (const merged of mergedColors) {
                if (colorDistance(current, merged) < 45) {
                  merged.count += current.count
                  foundGroup = true
                  break
                }
              }
              if (!foundGroup) {
                mergedColors.push({ ...current })
              }
            }
            mergedColors.sort((a, b) => b.count - a.count)

            // 4. 获取前 8 个主要色彩，不做强制补齐
            const top8 = mergedColors.slice(0, 8)
            if (top8.length === 0) {
              top8.push({ r: 226, g: 232, b: 240, count: 1 })
            }

            // 5. 计算 HSL 以便进行平滑的渐变色排序
            const hexToHsl = (hex: string) => {
              const r = parseInt(hex.slice(1, 3), 16) / 255
              const g = parseInt(hex.slice(3, 5), 16) / 255
              const b = parseInt(hex.slice(5, 7), 16) / 255
              const max = Math.max(r, g, b)
              const min = Math.min(r, g, b)
              let h = 0
              let s = 0
              const l = (max + min) / 2
              if (max !== min) {
                const d = max - min
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
                switch (max) {
                  case r:
                    h = (g - b) / d + (g < b ? 6 : 0)
                    break
                  case g:
                    h = (b - r) / d + 2
                    break
                  case b:
                    h = (r - g) / d + 4
                    break
                }
                h /= 6
              }
              return { h, s, l }
            }

            const colorList = top8.map((c) => {
              const toHex = (n: number) => n.toString(16).padStart(2, '0')
              const hex = `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`
              const percentage =
                totalValidPixels > 0 ? parseFloat(((c.count / totalValidPixels) * 100).toFixed(1)) : 0
              const hsl = hexToHsl(hex)
              return { hex, percentage, ...hsl }
            })

            // 6. 按照色彩的色相 h 和明度 l 排序
            colorList.sort((a, b) => a.h - b.h || a.l - b.l)

            setPalette(colorList.map((c) => ({ hex: c.hex, percentage: c.percentage })))
          } catch (err) {
            console.error('色卡分析内部Canvas绘图失败:', err)
            fallbackPalette()
          }
        }
        img.onerror = (err) => {
          console.error('图片加载失败:', err)
          fallbackPalette()
        }
      } catch (err) {
        console.error('色卡分析外部失败:', err)
        fallbackPalette()
      }
    }

    const fallbackPalette = () => {
      setPalette([
        { hex: '#e2e8f0', percentage: 12.5 },
        { hex: '#cbd5e1', percentage: 12.5 },
        { hex: '#94a3b8', percentage: 12.5 },
        { hex: '#64748b', percentage: 12.5 },
        { hex: '#475569', percentage: 12.5 },
        { hex: '#334155', percentage: 12.5 },
        { hex: '#1e293b', percentage: 12.5 },
        { hex: '#0f172a', percentage: 12.5 }
      ])
    }

    analyzeColor()
  }, [selectedAsset])

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const unit = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const index = Math.floor(Math.log(bytes) / Math.log(unit))
    return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(1))} ${sizes[index]}`
  }



  const addTagByName = async (tagName: string, targetAssets: Asset[]) => {
    const cleanName = tagName.trim()
    if (!cleanName) return

    let tag: Tag | undefined = tags.find(
      (item) => item.name.toLowerCase() === cleanName.toLowerCase()
    )
    if (!tag) {
      await createTag(cleanName)
      tag = useAppStore
        .getState()
        .tags.find((item) => item.name.toLowerCase() === cleanName.toLowerCase())
    }

    if (!tag) return

    for (const asset of targetAssets) {
      const latestAsset = useAppStore.getState().assets.find((item) => item.id === asset.id)
      if (latestAsset && !latestAsset.tags.includes(tag.id)) {
        await updateAssetTags(latestAsset.id, [...latestAsset.tags, tag.id])
      }
    }
  }

  const handleStartAnalysis = async () => {
    if (!selectedAsset) return
    if (!settings?.apiKey) {
      alert('请先在设置中配置 API Key。')
      return
    }
    await analyzeImage(selectedAsset.id)
  }



  if (selectedAssetIds.length === 0) {
    const activeAssets = assets.filter((asset) => !asset.isDeleted)
    const activeFolder =
      activeTab === 'folder' && activeFolderId
        ? folders.find((folder) => folder.id === activeFolderId)
        : null

    if (activeFolder) {
      const folderStats = getFolderStats(activeFolder.id, folders, activeAssets)

      return (
        <aside style={{ width: `${width}px` }} className="flex h-full w-full shrink-0 flex-col bg-[#F8F9FA] text-[12px] text-gray-500 select-none">
          <div className="h-12 shrink-0 bg-white" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <InspectorHeader title="文件夹信息" onClose={() => setRightSidebarOpen(false)} />
            <div className="flex h-20 items-center justify-center rounded-lg bg-[#ECEAF8] text-brand-500 shrink-0">
              <FolderIcon size={36} strokeWidth={1.6} />
            </div>
            <div className="space-y-1.5">
              <SectionTitle>文件夹名</SectionTitle>
              <div className="text-[13px] font-semibold text-gray-800">{activeFolder.name}</div>
            </div>
            <div className="space-y-1">
              <SectionTitle>基本信息</SectionTitle>
              <InfoRow label="子文件夹" value={folderStats.directChildFolders} />
              <InfoRow label="子文件" value={folderStats.directFiles} />
              <InfoRow label="总文件" value={folderStats.totalFiles} />
              <InfoRow label="占用空间" value={formatSize(folderStats.totalBytes)} />
              <InfoRow label="创建时间" value={new Date(activeFolder.createdAt).toLocaleString()} />
            </div>
          </div>
        </aside>
      )
    }

    if (activeTab === 'board-detail' && activeBoardId) {
      const board = boards.find((item) => item.id === activeBoardId)

      if (board) {
        const boardAssets = board.assets
          .map((item) => activeAssets.find((asset) => asset.id === item.assetId))
          .filter(Boolean) as Asset[]
        const totalBytes = boardAssets.reduce((sum, asset) => sum + asset.fileSize, 0)

        return (
          <aside style={{ width: `${width}px` }} className="flex h-full w-full shrink-0 flex-col bg-[#F8F9FA] text-[12px] text-gray-500 select-none">
            <div className="h-12 shrink-0 bg-white" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <InspectorHeader title="看板信息" onClose={() => setRightSidebarOpen(false)} />
              <div className="space-y-1.5">
                <SectionTitle>看板名</SectionTitle>
                <div className="text-[13px] font-semibold text-gray-800">{board.name}</div>
              </div>
              <div className="space-y-1.5">
                <SectionTitle>描述</SectionTitle>
                <div className="text-[12px] leading-5 text-gray-500">
                  {board.description || '添加描述'}
                </div>
              </div>
              <div className="space-y-1">
                <SectionTitle>基本信息</SectionTitle>
                <InfoRow label="文件数" value={boardAssets.length} />
                <InfoRow label="占用空间" value={formatSize(totalBytes)} />
                <InfoRow label="创建时间" value={new Date(board.createdAt).toLocaleString()} />
              </div>
            </div>
          </aside>
        )
      }
    }

    if (activeTab === 'boards') {
      const boardAssetCount = boards.reduce((sum, board) => sum + board.assets.length, 0)

      return (
        <aside style={{ width: `${width}px` }} className="flex h-full w-full shrink-0 flex-col bg-[#F8F9FA] text-[12px] text-gray-500 select-none">
          <div className="h-12 shrink-0 bg-white" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <InspectorHeader title="全部看板" onClose={() => setRightSidebarOpen(false)} />
            <div className="space-y-1">
              <SectionTitle>基本信息</SectionTitle>
              <InfoRow label="看板数" value={boards.length} />
              <InfoRow label="素材引用" value={boardAssetCount} />
              <InfoRow label="总文件" value={activeAssets.length} />
              <InfoRow label="文件夹" value={folders.length} />
            </div>
          </div>
        </aside>
      )
    }

    const totalBytes = activeAssets.reduce((sum, asset) => sum + asset.fileSize, 0)

    return (
      <aside style={{ width: `${width}px` }} className="flex h-full w-full shrink-0 flex-col bg-[#F8F9FA] text-[12px] text-gray-500 select-none">
        <div className="h-12 shrink-0 bg-white" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <InspectorHeader title="全部文件" onClose={() => setRightSidebarOpen(false)} />
          <div className="space-y-1">
            <SectionTitle>基本信息</SectionTitle>
            <InfoRow label="子文件夹" value={folders.filter((folder) => !folder.parentId).length} />
            <InfoRow
              label="子文件"
              value={assets.filter((asset) => !asset.isDeleted && !asset.folderId).length}
            />
            <InfoRow label="总文件" value={activeAssets.length} />
            <InfoRow label="占用空间" value={formatSize(totalBytes)} />
          </div>
        </div>
      </aside>
    )
  }

  if (selectedAssetIds.length > 1) {
    const selectedAssets = assets.filter((asset) => selectedAssetIds.includes(asset.id))
    const totalSize = selectedAssets.reduce((sum, asset) => sum + asset.fileSize, 0)
    const pendingAiCount = selectedAssets.filter(
      (asset) => asset.aiStatus === 'pending' || asset.aiStatus === 'failed'
    ).length

    return (
      <aside style={{ width: `${width}px` }} className="flex h-full w-full shrink-0 flex-col bg-[#F8F9FA] text-[12px] select-none">
        <div className="h-12 shrink-0 bg-white" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <InspectorHeader title="批量操作" onClose={() => setRightSidebarOpen(false)} />
          <div className="space-y-1">
            <InfoRow label="已选素材" value={`${selectedAssetIds.length} 项`} />
            <InfoRow label="总文件大小" value={formatSize(totalSize)} />
            <InfoRow label="待 AI 识别" value={`${pendingAiCount} 张`} />
          </div>

          <button
            type="button"
            disabled={pendingAiCount === 0}
            onClick={() =>
              useAppStore.getState().analyzeBatchImages(selectedAssets.map((asset) => asset.id))
            }
            className="flex w-full h-8 items-center justify-center gap-1.5 rounded-md bg-brand-500 text-[12px] font-medium text-white hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 shrink-0"
          >
            <Sparkles size={13} />
            批量 AI 识别
          </button>

          <div className="space-y-2">
            <SectionTitle>批量标签</SectionTitle>
            <div className="flex gap-1.5">
              <input
                value={batchTagInput}
                onChange={(event) => setBatchTagInput(event.target.value)}
                onKeyDown={async (event) => {
                  if (event.key === 'Enter') {
                    await addTagByName(batchTagInput, selectedAssets)
                    setBatchTagInput('')
                  }
                }}
                placeholder="输入标签"
                className="h-8 min-w-0 flex-1 rounded-md px-2 text-[12px]"
              />
              <button
                type="button"
                onClick={async () => {
                  await addTagByName(batchTagInput, selectedAssets)
                  setBatchTagInput('')
                }}
                className="h-8 rounded-md bg-brand-50 px-2 text-[12px] font-medium text-brand-700 hover:bg-brand-100"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      </aside>
    )
  }

  if (!selectedAsset) return null

  const assetTags = selectedAsset.tags
    .map((tagId) => tags.find((tag) => tag.id === tagId))
    .filter(Boolean) as Tag[]

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color)
    setCopiedColor(color)
    setTimeout(() => setCopiedColor(null), 1500)
  }

  const handleSaveFileName = async () => {
    if (
      !selectedAsset ||
      !fileNameInput.trim() ||
      fileNameInput.trim() === selectedAsset.fileName
    )
      return
    await saveAsset({
      ...selectedAsset,
      fileName: fileNameInput.trim(),
      updatedAt: new Date().toISOString()
    })
  }

  const handleSaveDescription = async () => {
    if (!selectedAsset) return
    await saveAsset({
      ...selectedAsset,
      description: descriptionInput.trim(),
      updatedAt: new Date().toISOString()
    })
  }

  const handleSaveSourceUrl = async () => {
    if (!selectedAsset) return
    await saveAsset({
      ...selectedAsset,
      sourceUrl: sourceUrlInput.trim(),
      updatedAt: new Date().toISOString()
    })
  }

  const handleRatingChange = async (rating: number) => {
    if (!selectedAsset) return
    const currentRating = selectedAsset.rating || 0
    const newRating = currentRating === rating ? 0 : rating
    await saveAsset({
      ...selectedAsset,
      rating: newRating,
      updatedAt: new Date().toISOString()
    })
  }

  return (
    <aside style={{ width: `${width}px` }} className="flex h-full w-full shrink-0 flex-col bg-[#F8F9FA] text-[12px] text-gray-700 select-none">
      <div className="h-12 shrink-0 bg-white" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* 纵向滚动内容 */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <InspectorHeader title="文件信息" onClose={() => setRightSidebarOpen(false)} />
        {/* 预览图区域 */}
        <div className="relative group/preview w-full rounded-lg overflow-hidden bg-white border border-app-border flex items-center justify-center p-2 min-h-[160px] max-h-[220px]">
          {/* 透明棋盘格底纹（仿 Eagle） */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2220%22%20height=%2220%22%3E%3Crect%20width=%2210%22%20height=%2210%22%20fill=%22black%22/%3E%3Crect%20x=%2210%22%20y=%2210%22%20width=%2210%22%20height=%2210%22%20fill=%22black%22/%3E%3C/svg%3E')] bg-[size:20px_20px]" />

          <img
            src={`media://${selectedAsset.thumbnailPath}`}
            alt={selectedAsset.fileName}
            className="z-10 max-h-[200px] max-w-full object-contain rounded"
          />

          {/* 类型标签角标 */}
          <span className="absolute left-2 top-2 z-20 rounded bg-gray-800/70 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
            {selectedAsset.fileType}
          </span>

          {/* 右上角定位按钮 */}
          <button
            type="button"
            onClick={() => window.api.openPath(selectedAsset.filePath)}
            className="absolute right-2 top-2 z-20 p-1.5 rounded bg-white/90 text-gray-500 hover:text-brand-600 shadow-sm border border-gray-100 opacity-0 group-hover/preview:opacity-100 transition-all duration-200"
            title="在资源管理器中定位文件"
          >
            <FolderIcon size={12} />
          </button>
        </div>

        {/* 色卡分析栏 */}
        {palette.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] text-gray-400 px-0.5">
              <span>主要色彩</span>
              <span>{copiedColor ? `已复制: ${copiedColor}` : '点击色块可复制 Hex'}</span>
            </div>
            <div className="flex h-5 w-full rounded shadow-sm bg-gray-100 relative">
              {palette.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleCopyColor(item.hex)}
                  style={{
                    backgroundColor: item.hex,
                    flex: `${item.percentage} 1 auto`,
                    minWidth: '6px'
                  }}
                  className={clsx(
                    "h-full cursor-pointer hover:scale-y-120 hover:z-20 active:scale-95 transition-all duration-150 relative group",
                    index === 0 && "rounded-l",
                    index === palette.length - 1 && "rounded-r"
                  )}
                  title={`${item.hex} (${item.percentage}%)`}
                >
                  {/* 色彩 Hover tooltip (带精致向下箭头，与截图高度一致) */}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30">
                    <span className="px-2 py-1 bg-gray-900/95 text-[10px] font-medium text-white rounded-md shadow-lg whitespace-nowrap tracking-wide leading-none font-mono">
                      {item.hex} ({item.percentage}%)
                    </span>
                    <span className="w-1.5 h-1.5 bg-gray-900/95 rotate-45 -mt-[3px]" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 文件名编辑区域 */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-400">文件名</label>
          <textarea
            value={fileNameInput}
            onChange={(e) => setFileNameInput(e.target.value)}
            onBlur={handleSaveFileName}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSaveFileName())}
            rows={2}
            className="w-full text-[12px] font-semibold text-gray-800 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-brand-400 focus:bg-white px-2 py-1.5 rounded-sm transition-all resize-none outline-none focus:ring-0 leading-relaxed"
            placeholder="输入文件名"
          />
        </div>

        {/* 所在文件夹区域 */}
        <div className="space-y-1.5">
          <div
            onClick={toggleFolderSection}
            className="flex items-center justify-between text-[11px] font-semibold text-gray-400 cursor-pointer select-none group/title py-0.5 hover:text-gray-600 transition-colors"
          >
            <span>所在文件夹</span>
            {isFolderSectionOpen ? (
              <ChevronDown size={12} className="text-gray-400 group-hover/title:text-gray-600" />
            ) : (
              <ChevronRight size={12} className="text-gray-400 group-hover/title:text-gray-600" />
            )}
          </div>
          {isFolderSectionOpen && (
            <div className="relative inline-flex items-center bg-[#EDEDED] text-gray-700 rounded-md text-[11px] font-medium max-w-full overflow-hidden">
              {/* 左侧响应区域：点击跳转文件夹 */}
              <div
                onClick={() => {
                  if (selectedAsset.folderId) {
                    setActiveFolderId(selectedAsset.folderId)
                    setActiveTab('folder')
                  } else {
                    setActiveTab('all')
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-[#E2E2E2] cursor-pointer transition-colors max-w-[calc(100%-20px)] group/left relative"
              >
                <FolderIcon size={12} className="text-gray-500 shrink-0" />
                <span className="truncate">
                  {folders.find((f) => f.id === selectedAsset.folderId)?.name || '全部文件'}
                </span>
                
                {/* 鼠标悬浮气泡：打开文件夹 */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/left:flex flex-col items-center z-30">
                  <span className="px-2 py-1 bg-gray-900/95 text-[10px] font-medium text-white rounded-md shadow-lg whitespace-nowrap leading-none">
                    打开文件夹
                  </span>
                  <span className="w-1.5 h-1.5 bg-gray-900/95 rotate-45 -mt-[3px]" />
                </span>
              </div>

              {/* 右侧响应区域：点击下拉切换归属 */}
              <div className="w-6 py-1 flex items-center justify-center border-l border-gray-300/60 hover:bg-[#E2E2E2] relative cursor-pointer text-gray-500">
                <span className="text-[9px]">▼</span>
                <select
                  value={selectedAsset.folderId || ''}
                  onChange={(event) =>
                    saveAsset({
                      ...selectedAsset,
                      folderId: event.target.value,
                      updatedAt: new Date().toISOString()
                    })
                  }
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                  <option value="">/ 全部文件</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 标签管理区域 */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-gray-400">标签</label>

          {/* 已有关联标签 */}
          <div className="flex flex-wrap gap-1.5 min-h-[20px]">
            {assetTags.length === 0 ? (
              <span className="text-[11px] text-gray-400 italic">暂无标签</span>
            ) : (
              assetTags.map((tag) => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 rounded bg-[#EAEAEA] px-2 py-0.5 text-[11px] text-gray-600 font-medium"
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() =>
                      updateAssetTags(
                        selectedAsset.id,
                        selectedAsset.tags.filter((tagId) => tagId !== tag.id)
                      )
                    }
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="删除标签"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* 添加标签输入栏 */}
          <div className="flex gap-1">
            <input
              value={newTagInput}
              onChange={(event) => setNewTagInput(event.target.value)}
              onKeyDown={async (event) => {
                if (event.key === 'Enter') {
                  await addTagByName(newTagInput, [selectedAsset])
                  setNewTagInput('')
                }
              }}
              placeholder="添加标签..."
              className="h-7 min-w-0 flex-1 rounded border-0 border-b border-transparent hover:border-gray-200 focus:border-brand-400 focus:bg-white px-2 text-[11px] outline-none focus:ring-0 bg-transparent text-gray-700 transition-all"
            />
            <button
              type="button"
              onClick={async () => {
                await addTagByName(newTagInput, [selectedAsset])
                setNewTagInput('')
              }}
              className="h-7 px-2.5 rounded bg-brand-50 border border-brand-100 text-[11px] font-medium text-brand-700 hover:bg-brand-100 hover:text-brand-800 transition-all"
            >
              添加
            </button>
          </div>
        </div>

        {/* 描述区域 */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-400">描述</label>
          <textarea
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            onBlur={handleSaveDescription}
            placeholder="添加描述..."
            className="w-full min-h-[50px] text-[12px] text-gray-700 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-brand-400 focus:bg-white px-2.5 py-1.5 rounded-sm transition-all resize-none outline-none focus:ring-0 leading-normal"
          />
        </div>

        {/* 来源网址 */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-400">来源网址</label>
          <div className="flex items-center gap-1 w-full group/url">
            <input
              value={sourceUrlInput}
              onChange={(e) => setSourceUrlInput(e.target.value)}
              onBlur={handleSaveSourceUrl}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSourceUrl()}
              placeholder="添加链接..."
              className="flex-1 text-[12px] text-brand-600 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-brand-400 focus:bg-white px-2 py-1 transition-all outline-none focus:ring-0 truncate"
            />
            {sourceUrlInput.trim() && (
              <button
                type="button"
                onClick={() => window.api.openExternal && window.api.openExternal(sourceUrlInput.trim())}
                className="text-gray-400 hover:text-brand-600 p-1.5 rounded transition-colors shrink-0"
                title="在默认浏览器中打开网址"
              >
                <ExternalLink size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 分割线 */}
        <div className="h-px bg-gray-200" />

        {/* 基本信息表格 */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
            基本信息
          </span>

          <div className="space-y-1.5 text-[11px]">
            {/* 评分 */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-400">评分</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const rating = selectedAsset.rating || 0
                  const isFilled = star <= rating
                  return (
                    <span
                      key={star}
                      onClick={() => handleRatingChange(star)}
                      className={`cursor-pointer transition-colors text-[14px] leading-none ${
                        isFilled ? 'text-[#eab308]' : 'text-gray-200 hover:text-[#eab308]/60'
                      }`}
                    >
                      ★
                    </span>
                  )
                })}
              </div>
            </div>

            {/* 尺寸 */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-400">尺寸</span>
              <span className="font-mono text-gray-700">
                {selectedAsset.width} x {selectedAsset.height}
              </span>
            </div>

            {/* 文件类型 */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-400">文件类型</span>
              <span className="font-semibold text-gray-700 uppercase">
                {selectedAsset.fileType}
              </span>
            </div>

            {/* 文件大小 */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-400">文件大小</span>
              <span className="text-gray-700">{formatSize(selectedAsset.fileSize)}</span>
            </div>

            {/* 导入时间 */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-400">导入时间</span>
              <span className="text-gray-600">
                {new Date(selectedAsset.createdAt).toLocaleString()}
              </span>
            </div>

            {/* 更新时间 */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-400">更新时间</span>
              <span className="text-gray-600">
                {new Date(selectedAsset.updatedAt).toLocaleString()}
              </span>
            </div>

            {/* 创建时间 */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-400">创建时间</span>
              <span className="text-gray-600">
                {new Date(selectedAsset.createdAt).toLocaleString()}
              </span>
            </div>

            {/* 修改时间 */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-400">修改时间</span>
              <span className="text-gray-600">
                {new Date(selectedAsset.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 如果尚未进行 AI 识别且未处理中，我们渲染一个小巧的 AI 识别辅助提示面板 */}
        {selectedAsset.aiStatus !== 'done' && (
          <div className="mt-4 rounded-lg bg-brand-50/70 border border-brand-100 p-3 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-brand-700">
              <Sparkles size={12} />
              <span>尚未完成 AI 识别</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-normal">
              一键分析将自动提取画面细节、设计构思及优化 Prompt。
            </p>
            <button
              type="button"
              disabled={selectedAsset.aiStatus === 'processing'}
              onClick={handleStartAnalysis}
              className="w-full h-7 rounded bg-brand-500 text-[11px] font-medium text-white hover:bg-brand-600 disabled:bg-gray-200 transition-colors flex items-center justify-center gap-1"
            >
              {selectedAsset.aiStatus === 'processing' ? (
                <>
                  <RefreshCw size={11} className="animate-spin" />
                  <span>识别中...</span>
                </>
              ) : (
                <>
                  <Sparkles size={11} />
                  <span>开始 AI 识别</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

const InspectorHeader: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
  <div className="flex items-center justify-between mb-5 select-none shrink-0">
    <h2 className="text-[18px] font-semibold tracking-tight text-gray-900">{title}</h2>
    <button
      type="button"
      onClick={onClose}
      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-200 shrink-0"
      title="关闭右侧栏"
    >
      <X size={14} />
    </button>
  </div>
)

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
    {children}
  </div>
)

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-gray-400">{label}</span>
    <strong className="font-normal text-gray-700">{value}</strong>
  </div>
)



const getDescendantFolderIds = (folderId: string, folders: Folder[]): string[] => {
  const children = folders.filter((folder) => folder.parentId === folderId)
  return children.flatMap((folder) => [folder.id, ...getDescendantFolderIds(folder.id, folders)])
}

const getFolderStats = (folderId: string, folders: Folder[], activeAssets: Asset[]) => {
  const descendantIds = getDescendantFolderIds(folderId, folders)
  const folderIds = [folderId, ...descendantIds]
  const directChildFolders = folders.filter((folder) => folder.parentId === folderId).length
  const directFiles = activeAssets.filter((asset) => asset.folderId === folderId).length
  const allFiles = activeAssets.filter((asset) => folderIds.includes(asset.folderId))
  const totalBytes = allFiles.reduce((sum, asset) => sum + asset.fileSize, 0)

  return {
    directChildFolders,
    directFiles,
    totalFiles: allFiles.length,
    totalBytes
  }
}
