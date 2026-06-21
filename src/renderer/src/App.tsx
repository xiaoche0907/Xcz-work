/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { AssetGrid } from './components/AssetGrid'
import { RightInspector } from './components/RightInspector'
import { SettingsPage } from './pages/SettingsPage'
import { BoardsPage } from './pages/BoardsPage'
import { BoardDetailPage } from './pages/BoardDetailPage'
import { SceneDescriptionPage } from './pages/SceneDescriptionPage'
import { FilterBar } from './components/FilterBar'
import { SearchOverlay } from './components/SearchOverlay'
import { PreferencesModal } from './components/PreferencesModal'
import { ImageViewerPage } from './components/ImageViewerPage'
import { DuplicateResolver } from './components/DuplicateResolver'


function App(): React.JSX.Element {
  const {
    initData,
    activeTab,
    isRightSidebarOpen,
    activeFolderId,
    importFiles,
    importFileData,
    isLeftSidebarOpen,
    isStatusbarOpen,
    assets,
    selectedAssetIds,
    isInternalDragging,
    setInternalDragging,

    // 新增状态与 Setter
    isFilterBarOpen
  } = useAppStore()

  // 边栏宽度状态
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar_width')
    return saved ? parseInt(saved, 10) : 220
  })
  const [inspectorWidth, setInspectorWidth] = useState(() => {
    const saved = localStorage.getItem('inspector_width')
    return saved ? parseInt(saved, 10) : 280
  })

  // 拖拽状态
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const [isResizingInspector, setIsResizingInspector] = useState(false)

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingSidebar(true)
  }

  const handleInspectorMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingInspector(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = Math.max(160, Math.min(400, e.clientX))
        setSidebarWidth(newWidth)
        localStorage.setItem('sidebar_width', String(newWidth))
      } else if (isResizingInspector) {
        const newWidth = Math.max(200, Math.min(450, window.innerWidth - e.clientX))
        setInspectorWidth(newWidth)
        localStorage.setItem('inspector_width', String(newWidth))
        
        // 若右侧属性栏为关闭状态，拖动时自动拉开
        const store = useAppStore.getState()
        if (!store.isRightSidebarOpen) {
          store.setRightSidebarOpen(true)
        }
      }
    }

    const handleMouseUp = () => {
      setIsResizingSidebar(false)
      setIsResizingInspector(false)
    }

    if (isResizingSidebar || isResizingInspector) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.classList.add('select-none')
    } else {
      document.body.style.cursor = ''
      document.body.classList.remove('select-none')
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingSidebar, isResizingInspector])

  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    initData()
  }, [initData])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const store = useAppStore.getState()
      const currentTab = store.activeTab
      const selectedIds = store.selectedAssetIds

      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      const isShift = event.shiftKey
      const isAlt = event.altKey

      // Escape -> 关闭大图预览或模态弹窗
      if (event.key === 'Escape') {
        if (currentTab === 'viewer') {
          event.preventDefault()
          store.setViewerAsset(null)
        } else {
          store.setPreferencesModalOpen(false)
          store.setSearchOverlayOpen(false)
        }
        return
      }

      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Alt + F -> 显示/隐藏文件筛选器
      if (isAlt && !isCtrlOrCmd && !isShift && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        store.setFilterBarOpen(!store.isFilterBarOpen)
      }

      // Tab -> 切换布局
      else if (!isCtrlOrCmd && !isShift && !isAlt && event.key === 'Tab') {
        event.preventDefault()
        store.setLayoutMode(store.layoutMode === 'grid' ? 'list' : 'grid')
      }

      // Ctrl + F 或 Ctrl + P 全局热键唤出搜索命令面板
      else if (isCtrlOrCmd && !isAlt && !isShift && (event.key.toLowerCase() === 'f' || event.key.toLowerCase() === 'p')) {
        event.preventDefault()
        store.setSearchOverlayOpen(true)
      }

      // Ctrl + E -> 自动定位并聚焦侧边栏文件夹筛选输入框
      else if (isCtrlOrCmd && !isAlt && !isShift && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        const el = document.getElementById('sidebar-folder-filter')
        if (el) el.focus()
      }

      // Ctrl + G -> 前往文件夹
      else if (isCtrlOrCmd && !isAlt && !isShift && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        const folderListStr = store.folders.map((f, i) => `${i + 1}. ${f.name}`).join('\n')
        const chosen = window.prompt(
          `请输入要跳转的目标文件夹编号或名称：\n\n0. 全部文件 (根目录)\n${folderListStr}`
        )
        if (chosen !== null) {
          const trimmed = chosen.trim()
          if (trimmed === '0' || trimmed === '全部文件') {
            store.setActiveTab('all')
            store.setActiveFolderId(null)
          } else {
            const index = parseInt(trimmed, 10) - 1
            const targetFolder = store.folders[index] || store.folders.find(f => f.name === trimmed)
            if (targetFolder) {
              store.setActiveFolderId(targetFolder.id)
              store.setActiveTab('folder')
            } else {
              alert('未找到指定的文件夹')
            }
          }
        }
      }

      // Ctrl + T -> 前往标签
      else if (isCtrlOrCmd && !isAlt && !isShift && event.key.toLowerCase() === 't') {
        event.preventDefault()
        const tagListStr = store.tags.map((t, i) => `${i + 1}. ${t.name}`).join('\n')
        const chosen = window.prompt(
          `请输入要跳转的目标标签编号或名称：\n\n${tagListStr}`
        )
        if (chosen !== null) {
          const trimmed = chosen.trim()
          const index = parseInt(trimmed, 10) - 1
          const targetTag = store.tags[index] || store.tags.find(t => t.name === trimmed)
          if (targetTag) {
            store.setActiveTab('tags')
            store.setFilterTagId(targetTag.id)
            alert(`已筛选标签：「${targetTag.name}」`)
          } else {
            alert('未找到指定的标签')
          }
        }
      }

      // Space -> 打开/关闭文件
      else if (!isCtrlOrCmd && !isShift && !isAlt && event.key === ' ') {
        event.preventDefault()
        if (currentTab === 'viewer') {
          store.setViewerAsset(null)
        } else if (selectedIds.length === 1) {
          const asset = store.assets.find(a => a.id === selectedIds[0])
          if (asset) {
            const playlist = store.assets.filter(a => !a.isDeleted)
            store.setViewerAsset(asset, playlist)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 全局粘贴图片监听
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      const filePaths: string[] = []
      const rawFiles: File[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            // @ts-ignore
            if (file.path) {
              // @ts-ignore
              filePaths.push(file.path)
            } else {
              rawFiles.push(file)
            }
          }
        }
      }

      const targetFolderId = activeFolderId || ''

      // 1. 复制本地物理文件路径导入
      if (filePaths.length > 0) {
        await importFiles(filePaths, targetFolderId)
      }
      // 2. 剪贴板截图或纯图片数据二进制导入
      else if (rawFiles.length > 0) {
        for (const file of rawFiles) {
          if (file.type.startsWith('image/')) {
            const buffer = await file.arrayBuffer()
            const name = file.name || `screenshot-${Date.now()}.png`
            await importFileData(buffer, name, targetFolderId)
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [activeFolderId, importFiles, importFileData])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 如果是内部素材拖拽，直接返回，不触发外部上传的遮罩
    if (isInternalDragging) {
      return
    }
    const isFile = Array.from(e.dataTransfer.types).includes('Files')
    if (isFile) {
      setIsDragging(true)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isInternalDragging) {
      e.dataTransfer.dropEffect = 'none'
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    // 如果是内部拖拽，直接重置并返回
    if (isInternalDragging) {
      setInternalDragging(false)
      return
    }

    const files = e.dataTransfer.files
    if (!files || files.length === 0) {
      // 检查网页图片拖拽的 URL
      const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('URL')
      const targetFolderId = activeFolderId || ''
      if (
        url &&
        (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'))
      ) {
        try {
          const response = await fetch(url)
          const blob = await response.blob()
          const buffer = await blob.arrayBuffer()

          let fileName = `web-image-${Date.now()}.png`
          try {
            const urlObj = new URL(url)
            fileName = urlObj.pathname.split('/').pop() || fileName
          } catch (e) {
            // ignore
          }

          if (!fileName.includes('.')) {
            const ext = blob.type.split('/')[1] || 'png'
            fileName = `${fileName}.${ext}`
          }

          await importFileData(buffer, fileName, targetFolderId)
        } catch (err) {
          console.error('拖拽网页图片下载导入失败:', err)
        }
      }
      return
    }

    const filePaths: string[] = []
    const rawFiles: File[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // @ts-ignore
      if (file.path) {
        // @ts-ignore
        filePaths.push(file.path)
      } else {
        rawFiles.push(file)
      }
    }

    const targetFolderId = activeFolderId || ''

    if (filePaths.length > 0) {
      await importFiles(filePaths, targetFolderId)
    }

    if (rawFiles.length > 0) {
      for (const file of rawFiles) {
        if (file.type.startsWith('image/')) {
          const buffer = await file.arrayBuffer()
          await importFileData(buffer, file.name || `dragged-${Date.now()}.png`, targetFolderId)
        }
      }
    }
  }

  const renderMainContent = () => {
    switch (activeTab) {
      case 'settings':
        return <SettingsPage />
      case 'boards':
        return <BoardsPage />
      case 'board-detail':
        return <BoardDetailPage onDoubleClickAsset={() => {}} />
      case 'scene':
        return <SceneDescriptionPage />
      case 'viewer':
        return <ImageViewerPage />
      case 'duplicates':
        return <DuplicateResolver />
      default:
        return <AssetGrid onDoubleClickAsset={() => {}} />
    }
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      className="h-screen w-screen overflow-hidden bg-white text-app-text antialiased"
    >
      <div className="relative flex h-full w-full overflow-hidden">
        {isLeftSidebarOpen && <Sidebar width={sidebarWidth} />}

        <main className="relative z-[30] flex h-full min-w-0 flex-1 flex-col bg-white">
          {activeTab !== 'viewer' && <Topbar />}
          {activeTab !== 'viewer' && isFilterBarOpen && <FilterBar />}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {renderMainContent()}
          </div>
          {isStatusbarOpen && (
            <footer className="flex h-6 shrink-0 items-center justify-between bg-[#F4F5F7] px-4 text-[10px] text-gray-500">
              <div className="flex items-center gap-3">
                <span>全部文件: {assets.filter((a) => !a.isDeleted).length} 项</span>
                <span>待整理: {assets.filter((a) => !a.isDeleted && a.aiStatus === 'pending').length} 项</span>
              </div>
              <div>
                {selectedAssetIds.length > 0 && (
                  <span className="font-medium text-brand-600">已选中 {selectedAssetIds.length} 项</span>
                )}
              </div>
            </footer>
          )}
        </main>

        {isRightSidebarOpen && <RightInspector width={inspectorWidth} />}

        {/* 绝对定位的透明拖拽手柄 */}
        {isLeftSidebarOpen && (
          <div
            onMouseDown={handleSidebarMouseDown}
            style={{
              left: `${sidebarWidth - 3}px`,
              WebkitAppRegion: 'no-drag'
            } as React.CSSProperties}
            className="absolute top-0 bottom-0 w-[6px] cursor-col-resize bg-transparent hover:bg-brand-500/20 active:bg-brand-500/40 transition-colors z-20"
          />
        )}

        <div
          onMouseDown={handleInspectorMouseDown}
          style={{
            right: isRightSidebarOpen ? `${inspectorWidth - 3}px` : '0px',
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties}
          className="absolute top-0 bottom-0 w-[6px] cursor-col-resize bg-transparent hover:bg-brand-500/20 active:bg-brand-500/40 transition-colors z-20"
          title={isRightSidebarOpen ? undefined : "向左拖动以拉开右侧栏"}
        />

        <SearchOverlay />
        <PreferencesModal />
      </div>

      {isDragging && (
        <div
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/25 backdrop-blur-md transition-all duration-300"
        >
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 max-w-sm text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-700 mb-4 animate-bounce">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-upload-cloud text-gray-600"
              >
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                <path d="M12 12v9" />
                <path d="m16 16-4-4-4 4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">释放以导入图片</h3>
            <p className="text-sm text-gray-500 mt-1">支持图片文件、包含图片的文件夹，或从网页直接拖入</p>
            {activeFolderId && (
              <span className="mt-3 inline-block px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded-full border border-gray-100">
                将自动导入至当前文件夹
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
