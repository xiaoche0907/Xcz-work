/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useState, useEffect, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Expand,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  PanelRight,
  Folder as FolderIcon,
  Image as FileImage,
  Search
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export const ImageViewerPage: React.FC = () => {
  const {
    activeViewerAsset,
    viewerPlaylist,
    setViewerAsset,
    folders,
    isRightSidebarOpen,
    setRightSidebarOpen,
    setSearchOverlayOpen,
    saveAsset
  } = useAppStore()

  if (!activeViewerAsset) return null

  // 当前图片索引
  const index = viewerPlaylist.findIndex((item) => item.id === activeViewerAsset.id)

  // 变换状态
  const [zoomPercent, setZoomPercent] = useState(100)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [isFit, setIsFit] = useState(true)

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // 重置单张图片的变换状态
  const resetTransform = () => {
    setZoomPercent(100)
    setOffset({ x: 0, y: 0 })
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setIsFit(true)
  }

  // 切换图片
  const handlePrev = () => {
    if (index > 0) {
      resetTransform()
      setViewerAsset(viewerPlaylist[index - 1], viewerPlaylist)
    }
  }

  const handleNext = () => {
    if (index < viewerPlaylist.length - 1) {
      resetTransform()
      setViewerAsset(viewerPlaylist[index + 1], viewerPlaylist)
    }
  }

  // 监听键盘事件与滚轮
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      const isShift = event.shiftKey
      const isAlt = event.altKey

      // 1. Space / Escape -> 退出大图预览
      if (!isCtrlOrCmd && !isShift && !isAlt && (event.key === ' ' || event.key === 'Escape')) {
        event.preventDefault()
        setViewerAsset(null)
        return
      }

      // 2. Ctrl + = / Ctrl + + -> 放大图片
      if (isCtrlOrCmd && !isShift && !isAlt && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        setIsFit(false)
        setZoomPercent((prev) => Math.min(500, Math.round(prev * 1.1)))
        return
      }

      // 3. Ctrl + - -> 缩小图片
      if (isCtrlOrCmd && !isShift && !isAlt && event.key === '-') {
        event.preventDefault()
        setIsFit(false)
        setZoomPercent((prev) => Math.max(10, Math.round(prev / 1.1)))
        return
      }

      // 4. Ctrl + 0 -> 自适应窗口大小
      if (isCtrlOrCmd && !isShift && !isAlt && event.key === '0') {
        event.preventDefault()
        setIsFit(true)
        setOffset({ x: 0, y: 0 })
        return
      }

      // 5. Ctrl + 1 -> 原始尺寸 1:1
      if (isCtrlOrCmd && !isShift && !isAlt && event.key === '1') {
        event.preventDefault()
        setIsFit(false)
        setZoomPercent(100)
        setOffset({ x: 0, y: 0 })
        return
      }

      // 6. Ctrl + 2 -> 宽度自适应
      if (isCtrlOrCmd && !isShift && !isAlt && event.key === '2') {
        event.preventDefault()
        if (containerRef.current && activeViewerAsset.width) {
          const containerWidth = containerRef.current.clientWidth
          const percent = Math.round((containerWidth / activeViewerAsset.width) * 100)
          setIsFit(false)
          setZoomPercent(percent)
          setOffset({ x: 0, y: 0 })
        }
        return
      }

      // 7. Ctrl + Enter -> 在资源管理器中显示
      if (isCtrlOrCmd && !isShift && !isAlt && event.key === 'Enter') {
        event.preventDefault()
        await window.api.openPath(activeViewerAsset.filePath)
        return
      }

      // 8. Ctrl + O -> 在默认应用中打开
      if (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        await window.api.openExternal(activeViewerAsset.filePath)
        return
      }

      // 9. Shift + 0~5 -> 星级评分
      if (!isCtrlOrCmd && isShift && !isAlt && ['0', '1', '2', '3', '4', '5'].includes(event.key)) {
        event.preventDefault()
        const score = parseInt(event.key, 10)
        await saveAsset({
          ...activeViewerAsset,
          rating: score,
          updatedAt: new Date().toISOString()
        })
        alert(score === 0 ? '已取消星级评分' : `已将评分设为 ${score} 星`)
        return
      }

      // 10. 上一张图片
      if (
        (!isCtrlOrCmd && !isShift && !isAlt && event.key === 'ArrowLeft') ||
        (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'p') ||
        (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'h')
      ) {
        event.preventDefault()
        handlePrev()
        return
      }

      // 11. 下一张图片
      if (
        (!isCtrlOrCmd && !isShift && !isAlt && event.key === 'ArrowRight') ||
        (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'n') ||
        (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'l')
      ) {
        event.preventDefault()
        handleNext()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [index, viewerPlaylist, activeViewerAsset, saveAsset])

  // 滚轮缩放控制
  const handleWheel = (e: React.WheelEvent) => {
    // 阻止页面滚动默认行为
    e.preventDefault()
    
    const zoomStep = 1.1
    let nextZoom = zoomPercent
    if (e.deltaY < 0) {
      // 放大
      nextZoom = Math.min(500, zoomPercent * zoomStep)
    } else {
      // 缩小
      nextZoom = Math.max(10, zoomPercent / zoomStep)
    }
    
    setZoomPercent(Math.round(nextZoom))
    setIsFit(false)
  }

  // 鼠标拖拽平移大图逻辑
  const handleMouseDown = (e: React.MouseEvent) => {
    // 仅允许鼠标左键拖拽
    if (e.button !== 0) return
    e.preventDefault()

    // 记录拖拽初始位置
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    
    // 更新偏移位置
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 双击图片切换缩放
  const handleImageDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isFit) {
      setIsFit(false)
      setZoomPercent(100)
      setOffset({ x: 0, y: 0 })
    } else {
      setIsFit(true)
      setOffset({ x: 0, y: 0 })
    }
  }

  // 获取面包屑路径名称
  const folderName = activeViewerAsset.folderId
    ? folders.find((f) => f.id === activeViewerAsset.folderId)?.name || '全部文件'
    : '全部文件'

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const unit = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(unit))
    return `${parseFloat((bytes / Math.pow(unit, i)).toFixed(1))} ${sizes[i]}`
  }

  // 构建大图 CSS 变换属性
  const imageTransform = `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${
    (zoomPercent / 100) * (flipH ? -1 : 1)
  }, ${(zoomPercent / 100) * (flipV ? -1 : 1)})`

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden bg-white select-none">
      {/* 顶部工具栏 (仿 Pixcall 布局，所有控制按钮集中靠左) */}
      <div
        className="relative flex h-12 shrink-0 items-center border-b border-app-border bg-white px-4 text-[12px] select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* 所有控制按钮 */}
        <div
          className="flex items-center gap-3.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* 1. 返回与前进历史导航 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewerAsset(null)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700 transition-colors"
              title="返回列表 (Esc)"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled
              className="p-1.5 rounded text-gray-300 transition-colors cursor-not-allowed"
              title="前进"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="h-4 w-px bg-app-border" />

          {/* 2. 缩放滑块 (左侧是一个小圆点替代文字) */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
            <input
              type="range"
              min="10"
              max="500"
              value={zoomPercent}
              onChange={(e) => {
                setZoomPercent(Number(e.target.value))
                setIsFit(false)
              }}
              className="w-24 accent-gray-700 cursor-pointer h-1 rounded-lg bg-gray-200"
              title="缩放比例"
            />
            <span className="text-[11px] font-mono text-gray-500 w-10 text-right">{zoomPercent}%</span>
          </div>

          <div className="h-4 w-px bg-app-border" />

          {/* 3. 尺寸模式选择 (激活态使用 bg-gray-200) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsFit(false)
                setZoomPercent(100)
                setOffset({ x: 0, y: 0 })
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                !isFit && zoomPercent === 100
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="原始尺寸 (1:1)"
            >
              1:1
            </button>

            <button
              onClick={() => {
                setIsFit(true)
                setOffset({ x: 0, y: 0 })
              }}
              className={`p-1.5 rounded transition-colors ${
                isFit
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="自适应尺寸"
            >
              <Expand size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-app-border" />

          {/* 4. 旋转与翻转组 (激活态使用 bg-gray-200) */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title="顺时针旋转 90°"
            >
              <RotateCw size={14} />
            </button>

            <button
              onClick={() => setFlipH(!flipH)}
              className={`p-1.5 rounded transition-colors ${
                flipH
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="水平翻转"
            >
              <FlipHorizontal size={14} />
            </button>

            <button
              onClick={() => setFlipV(!flipV)}
              className={`p-1.5 rounded transition-colors ${
                flipV
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="垂直翻转"
            >
              <FlipVertical size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-app-border" />

          {/* 5. 上一张 / 下一张图片导航 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={index <= 0}
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="上一张图片 (ArrowLeft)"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              onClick={handleNext}
              disabled={index >= viewerPlaylist.length - 1}
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="下一张图片 (ArrowRight)"
            >
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-app-border" />

          {/* 6. 全局搜索快捷按钮 */}
          <button
            onClick={() => setSearchOverlayOpen(true)}
            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="搜索命令面板"
          >
            <Search size={14} />
          </button>

          <div className="h-4 w-px bg-app-border" />

          {/* 7. 右侧属性栏折叠 (激活态使用 bg-gray-200) */}
          <button
            onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
            className={`p-1.5 rounded transition-colors ${
              isRightSidebarOpen
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={isRightSidebarOpen ? '隐藏右侧属性栏' : '显示右侧属性栏'}
          >
            <PanelRight size={14} />
          </button>
        </div>
      </div>

      {/* 大图展示主区域 (支持滚轮缩放、鼠标平移、双击缩放) */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative overflow-hidden bg-[#F4F5F7] flex items-center justify-center cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setViewerAsset(null)}
      >
        <div
          style={{
            transform: isFit ? 'none' : imageTransform,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out'
          }}
          className={`flex items-center justify-center ${
            isFit ? 'w-full h-full max-w-full max-h-full p-8' : ''
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={`media://${activeViewerAsset.filePath}`}
            alt={activeViewerAsset.fileName}
            onDoubleClick={handleImageDoubleClick}
            className={`${
              isFit
                ? 'max-w-full max-h-full object-contain pointer-events-auto select-none rounded shadow-md'
                : 'pointer-events-auto select-none rounded shadow-lg'
            }`}
            style={{
              transform: isFit
                ? `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`
                : 'none'
            }}
          />
        </div>
      </div>

      {/* 底部导航面包屑 */}
      <div className="flex h-9 shrink-0 items-center justify-between border-t border-app-border bg-[#F8F9FA] px-4 text-[11px] text-gray-500 select-none">
        <div className="flex items-center gap-1.5 font-medium">
          <FolderIcon size={12} className="text-gray-400" />
          <span>{folderName}</span>
          <span className="text-gray-400 mx-0.5">&gt;</span>
          <FileImage size={12} className="text-gray-400" />
          <span className="text-gray-700 font-semibold">{activeViewerAsset.fileName}</span>
        </div>
        <div className="text-gray-400 font-mono">
          <span>尺寸: {activeViewerAsset.width} × {activeViewerAsset.height}</span>
          <span className="mx-2">|</span>
          <span>大小: {formatSize(activeViewerAsset.fileSize)}</span>
          <span className="mx-2">|</span>
          <span>索引: {index + 1} / {viewerPlaylist.length}</span>
        </div>
      </div>
    </div>
  )
}
