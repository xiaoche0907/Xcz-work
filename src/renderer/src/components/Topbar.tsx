/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Columns,
  Filter,
  Grid2X2,
  Image,
  PanelRight,
  Puzzle,
  Search,
  List,
  Compass
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export const Topbar: React.FC = () => {
  const {
    activeTab,
    isRightSidebarOpen,
    setRightSidebarOpen,
    settings,
    updateSettings,
    setActiveTab,

    // Zustand 状态
    layoutMode,
    setLayoutMode,
    foldersOnTop,
    setFoldersOnTop,
    showSubfolderContents,
    setShowSubfolderContents,
    showFileSize,
    setShowFileSize,
    showResolution,
    setShowResolution,
    isFilterBarOpen,
    setFilterBarOpen,
    isLeftSidebarOpen,
    setLeftSidebarOpen,
    isStatusbarOpen,
    setStatusbarOpen,
    setSearchOverlayOpen,
    setPreferencesModalOpen,
    sortKey,
    setSortKey,
    sortOrder,
    setSortOrder
  } = useAppStore()

  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false)
  const [hoverSubmenu, setHoverSubmenu] = useState<string | null>(null)
  const [showSliderTooltip, setShowSliderTooltip] = useState(false)
  const layoutBtnRef = useRef<HTMLButtonElement>(null)

  // 点击外部关闭布局菜单
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (layoutBtnRef.current && !layoutBtnRef.current.contains(e.target as Node)) {
        setIsLayoutMenuOpen(false)
      }
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  const thumbnailSize = settings?.thumbnailSize || 180

  const getSortName = (key: string) => {
    switch (key) {
      case 'createdAt':
        return '创建时间'
      case 'fileName':
        return '文件名称'
      case 'fileSize':
        return '文件大小'
      case 'width':
        return '宽度'
      case 'height':
        return '高度'
      default:
        return '创建时间'
    }
  }

  return (
    <header
      className="relative flex h-12 shrink-0 items-center justify-between bg-white pl-4 pr-[168px] text-[12px] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* 左侧：导航按钮 */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className="app-icon-button"
          title="返回全部文件"
        >
          <ChevronLeft size={16} />
        </button>
        <button type="button" className="app-icon-button opacity-45" title="前进" disabled>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 右侧：连续动作图标按钮组与滑块 */}
      <div
        className="flex items-center gap-[18px]"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* 大小拉动滑块与 tooltip 提示 (图5) */}
        <div className="flex items-center gap-1.5 mr-1">
          <Image size={12} className="text-gray-400" />
          <div className="relative flex items-center">
            <input
              type="range"
              min="100"
              max="260"
              value={thumbnailSize}
              onMouseEnter={() => setShowSliderTooltip(true)}
              onMouseLeave={() => setShowSliderTooltip(false)}
              onFocus={() => setShowSliderTooltip(true)}
              onBlur={() => setShowSliderTooltip(false)}
              onChange={(event) => updateSettings({ thumbnailSize: Number(event.target.value) })}
              className="app-slider cursor-pointer"
              title="调整缩略图大小"
            />
            {showSliderTooltip && (
              <div
                className="absolute top-7 bg-black text-white text-[11px] font-semibold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-50 flex flex-col items-center select-none"
                style={{
                  left: `${((thumbnailSize - 100) / 160) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {/* 小箭头 */}
                <div className="w-1.5 h-1.5 bg-black rotate-45 -mt-[3px] mb-[1px]" />
                <span>{thumbnailSize}px</span>
              </div>
            )}
          </div>
        </div>

        {/* 分割线 */}
        <div className="h-4 w-px bg-app-border" />
        {/* 1. 高级筛选按钮 (图2) */}
        <button
          type="button"
          onClick={() => setFilterBarOpen(!isFilterBarOpen)}
          className={`app-icon-button ${isFilterBarOpen ? 'active' : ''}`}
          title="高级筛选"
        >
          <Filter size={15} />
        </button>

        {/* 2. 布局菜单按钮 (图1) */}
        <div className="relative">
          <button
            ref={layoutBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsLayoutMenuOpen(!isLayoutMenuOpen)
            }}
            className={`app-icon-button ${isLayoutMenuOpen ? 'active' : ''}`}
            title="布局与排序方式"
          >
            {layoutMode === 'grid' ? <Grid2X2 size={15} /> : <List size={15} />}
          </button>

          {isLayoutMenuOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 z-[10000] w-56 rounded-lg bg-white py-1 text-[12px] text-gray-700 shadow-xl select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 布局方式 (全局) */}
              <div
                className="relative"
                onMouseEnter={() => setHoverSubmenu('layout')}
                onMouseLeave={() => setHoverSubmenu(null)}
              >
                <button className="flex w-full items-center px-4 py-1.5 text-left hover:bg-brand-50 hover:text-brand-700">
                  <span className="w-4 shrink-0"></span>
                  <span className="flex-1">布局方式 (全局)</span>
                  <span className="text-gray-400 font-mono text-[10px] ml-auto">›</span>
                </button>
                {hoverSubmenu === 'layout' && (
                  <div className="absolute left-full top-0 ml-1 w-32 rounded-md bg-white py-1 shadow-lg">
                    <button
                      onClick={() => {
                        setLayoutMode('grid')
                        setIsLayoutMenuOpen(false)
                      }}
                      className="flex w-full items-center px-3 py-1.5 hover:bg-app-hover"
                    >
                      <span className="w-4 shrink-0 font-bold">
                        {layoutMode === 'grid' ? '✓' : ''}
                      </span>
                      <span>网格视图</span>
                    </button>
                    <button
                      onClick={() => {
                        setLayoutMode('list')
                        setIsLayoutMenuOpen(false)
                      }}
                      className="flex w-full items-center px-3 py-1.5 hover:bg-app-hover"
                    >
                      <span className="w-4 shrink-0 font-bold">
                        {layoutMode === 'list' ? '✓' : ''}
                      </span>
                      <span>列表视图</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 排序方式 (全局) */}
              <div
                className="relative"
                onMouseEnter={() => setHoverSubmenu('sortKey')}
                onMouseLeave={() => setHoverSubmenu(null)}
              >
                <button className="flex w-full items-center px-4 py-1.5 text-left hover:bg-brand-50 hover:text-brand-700">
                  <span className="w-4 shrink-0"></span>
                  <span className="flex-1">排序方式 ({getSortName(sortKey)})</span>
                  <span className="text-gray-400 font-mono text-[10px] ml-auto">›</span>
                </button>
                {hoverSubmenu === 'sortKey' && (
                  <div className="absolute left-full top-0 ml-1 w-32 rounded-md bg-white py-1 shadow-lg">
                    {['createdAt', 'fileName', 'fileSize', 'width', 'height'].map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortKey(key as any)
                          setIsLayoutMenuOpen(false)
                        }}
                        className="flex w-full items-center px-3 py-1.5 hover:bg-app-hover"
                      >
                        <span className="w-4 shrink-0 font-bold">
                          {sortKey === key ? '✓' : ''}
                        </span>
                        <span>{getSortName(key)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 排序方向 (全局) */}
              <div
                className="relative"
                onMouseEnter={() => setHoverSubmenu('sortOrder')}
                onMouseLeave={() => setHoverSubmenu(null)}
              >
                <button className="flex w-full items-center px-4 py-1.5 text-left hover:bg-brand-50 hover:text-brand-700">
                  <span className="w-4 shrink-0"></span>
                  <span className="flex-1">排序方向 ({sortOrder === 'asc' ? '升序' : '降序'})</span>
                  <span className="text-gray-400 font-mono text-[10px] ml-auto">›</span>
                </button>
                {hoverSubmenu === 'sortOrder' && (
                  <div className="absolute left-full top-0 ml-1 w-32 rounded-md bg-white py-1 shadow-lg">
                    <button
                      onClick={() => {
                        setSortOrder('asc')
                        setIsLayoutMenuOpen(false)
                      }}
                      className="flex w-full items-center px-3 py-1.5 hover:bg-app-hover"
                    >
                      <span className="w-4 shrink-0 font-bold">
                        {sortOrder === 'asc' ? '✓' : ''}
                      </span>
                      <span>升序</span>
                    </button>
                    <button
                      onClick={() => {
                        setSortOrder('desc')
                        setIsLayoutMenuOpen(false)
                      }}
                      className="flex w-full items-center px-3 py-1.5 hover:bg-app-hover"
                    >
                      <span className="w-4 shrink-0 font-bold">
                        {sortOrder === 'desc' ? '✓' : ''}
                      </span>
                      <span>降序</span>
                    </button>
                  </div>
                )}
              </div>


              {/* 文件夹置顶 */}
              <button
                type="button"
                onClick={() => setFoldersOnTop(!foldersOnTop)}
                className="flex w-full items-center px-4 py-1.5 text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="w-4 shrink-0 font-bold text-gray-700">
                  {foldersOnTop ? '✓' : ''}
                </span>
                <span>文件夹置顶</span>
              </button>

              {/* 显示子文件夹内容 */}
              <button
                type="button"
                onClick={() => setShowSubfolderContents(!showSubfolderContents)}
                className="flex w-full items-center px-4 py-1.5 text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="w-4 shrink-0 font-bold text-gray-700">
                  {showSubfolderContents ? '✓' : ''}
                </span>
                <span>显示子文件夹内容</span>
              </button>


              {/* 显示文件信息 > */}
              <div
                className="relative"
                onMouseEnter={() => setHoverSubmenu('fileInfo')}
                onMouseLeave={() => setHoverSubmenu(null)}
              >
                <button className="flex w-full items-center px-4 py-1.5 text-left hover:bg-brand-50 hover:text-brand-700">
                  <span className="w-4 shrink-0"></span>
                  <span className="flex-1">显示文件信息</span>
                  <span className="text-gray-400 font-mono text-[10px] ml-auto">›</span>
                </button>
                {hoverSubmenu === 'fileInfo' && (
                  <div className="absolute left-full top-0 ml-1 w-36 rounded-md bg-white py-1 shadow-lg">
                    <button
                      onClick={() => setShowResolution(!showResolution)}
                      className="flex w-full items-center px-3 py-1.5 hover:bg-app-hover"
                    >
                      <span className="w-4 shrink-0 font-bold text-gray-700">
                        {showResolution && '✓'}
                      </span>
                      <span>尺寸/分辨率</span>
                    </button>
                    <button
                      onClick={() => setShowFileSize(!showFileSize)}
                      className="flex w-full items-center px-3 py-1.5 hover:bg-app-hover"
                    >
                      <span className="w-4 shrink-0 font-bold text-gray-700">
                        {showFileSize && '✓'}
                      </span>
                      <span>文件大小</span>
                    </button>
                  </div>
                )}
              </div>


              {/* 显示左侧栏 */}
              <button
                type="button"
                onClick={() => setLeftSidebarOpen(!isLeftSidebarOpen)}
                className="flex w-full items-center px-4 py-1.5 text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="w-4 shrink-0 font-bold text-gray-700">
                  {isLeftSidebarOpen ? '✓' : ''}
                </span>
                <span>显示左侧栏</span>
              </button>

              {/* 显示右侧栏 */}
              <button
                type="button"
                onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
                className="flex w-full items-center px-4 py-1.5 text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="w-4 shrink-0 font-bold text-gray-700">
                  {isRightSidebarOpen ? '✓' : ''}
                </span>
                <span>显示右侧栏</span>
              </button>

              {/* 显示状态栏 */}
              <button
                type="button"
                onClick={() => setStatusbarOpen(!isStatusbarOpen)}
                className="flex w-full items-center px-4 py-1.5 text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="w-4 shrink-0 font-bold text-gray-700">
                  {isStatusbarOpen ? '✓' : ''}
                </span>
                <span>显示状态栏</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. 搜索按钮 (图3) */}
        <button
          type="button"
          onClick={() => setSearchOverlayOpen(true)}
          className="app-icon-button"
          title="搜索命令面板"
        >
          <Search size={15} />
        </button>

        {/* 4. 浏览器导航按钮 */}
        <button
          type="button"
          onClick={() => setActiveTab('scene')}
          className={`app-icon-button ${activeTab === 'scene' ? 'active' : ''}`}
          title="浏览器"
        >
          <Compass size={15} />
        </button>

        {/* 5. 偏好设置 / 插件菜单 (图4) */}
        <button
          type="button"
          onClick={() => setPreferencesModalOpen(true)}
          className="app-icon-button"
          title="插件偏好设置"
        >
          <Puzzle size={15} />
        </button>

        {/* 6. 右侧栏切换 */}
        <button
          type="button"
          onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
          className={`app-icon-button ${isRightSidebarOpen ? 'active' : ''}`}
          title={isRightSidebarOpen ? '隐藏右侧栏' : '显示右侧栏'}
        >
          {isRightSidebarOpen ? <Columns size={15} /> : <PanelRight size={15} />}
        </button>
      </div>
    </header>
  )
}
