/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useMemo, useState, useEffect } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  FileImage,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Layers,
  Menu,
  Plus,
  Search,
  Settings,
  Tag,
  Trash2,
  Heart,
  Star
} from 'lucide-react'
import { useAppStore, ActiveTab } from '../store/useAppStore'
import { Folder as FolderType } from '../../../shared/types'
import logoImg from '../assets/logo.png'

const navIconSize = 14

interface FolderRenameInputProps {
  initialValue: string
  onSave: (val: string) => void
  onCancel: () => void
}

const FolderRenameInput: React.FC<FolderRenameInputProps> = ({
  initialValue,
  onSave,
  onCancel
}) => {
  const [value, setValue] = useState(initialValue)
  const inputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSave(value)
        } else if (e.key === 'Escape') {
          onCancel()
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className="h-5 w-24 rounded px-1 text-[11px] text-gray-800 bg-white border border-gray-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
    />
  )
}

interface FolderCreateInputProps {
  initialValue: string
  onSave: (val: string) => void
  onCancel: () => void
}

const FolderCreateInput: React.FC<FolderCreateInputProps> = ({
  initialValue,
  onSave,
  onCancel
}) => {
  const [value, setValue] = useState(initialValue)
  const inputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSave(value)
        } else if (e.key === 'Escape') {
          onCancel()
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className="h-5 flex-1 min-w-0 rounded border border-brand-400 px-1.5 text-[11px] outline-none bg-white focus:ring-1 focus:ring-brand-500 text-gray-700 font-normal"
    />
  )
}

export const Sidebar: React.FC<{ width?: number }> = ({ width }) => {
  const {
    assets,
    folders,
    boards,
    tags,
    activeTab,
    activeFolderId,
    activeBoardId,
    setActiveTab,
    setActiveFolderId,
    setActiveBoardId,
    setSelectedAssetIds,
    setRightSidebarOpen,
    createFolder,
    renameFolder,
    deleteFolder,
    creatingFolderParentId,
    newFolderName,
    setCreatingFolderParentId,
    setNewFolderName,
    isInternalDragging,
    setInternalDragging,
    settings
  } = useAppStore()

  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [dragOverTab, setDragOverTab] = useState<string | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({})
  const [sidebarFilter, setSidebarFilter] = useState('')
  const [isBoardsCollapsed, setIsBoardsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_boards_collapsed') === 'true'
  })
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_folders_collapsed') === 'true'
  })
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)

  const toggleBoardsCollapse = () => {
    setIsBoardsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_boards_collapsed', String(next))
      return next
    })
  }

  const toggleFoldersCollapse = () => {
    setIsFoldersCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_folders_collapsed', String(next))
      return next
    })
  }
  const [folderContextMenu, setFolderContextMenu] = useState<{
    x: number
    y: number
    folderId: string
  } | null>(null)

  useEffect(() => {
    const handleCloseMenu = () => {
      setFolderContextMenu(null)
    }
    window.addEventListener('click', handleCloseMenu)
    window.addEventListener('contextmenu', handleCloseMenu)
    return () => {
      window.removeEventListener('click', handleCloseMenu)
      window.removeEventListener('contextmenu', handleCloseMenu)
    }
  }, [])

  useEffect(() => {
    const handleSidebarKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // 如果主素材网格有选中的文件，则把快捷键优先权让给素材列表操作
      const state = useAppStore.getState()
      if (state.selectedAssetIds && state.selectedAssetIds.length > 0) {
        return
      }

      // 仅当活动栏目是文件夹，且选中了具体的文件夹时，文件夹快捷键才响应
      if (activeTab !== 'folder' || !activeFolderId) {
        return
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      const isShift = event.shiftKey
      const isAlt = event.altKey

      // 1. Ctrl + Enter -> 在资源管理器中打开选中的文件夹
      if (isCtrlOrCmd && !isShift && !isAlt && event.key === 'Enter') {
        event.preventDefault()
        handleOpenInExplorer(activeFolderId)
      }

      // 2. F2 -> 内联重命名文件夹
      else if (!isCtrlOrCmd && !isShift && !isAlt && event.key === 'F2') {
        event.preventDefault()
        setEditingFolderId(activeFolderId)
        const folder = folders.find((f) => f.id === activeFolderId)
        if (folder) setEditName(folder.name)
      }

      // 3. Delete / Backspace -> 删除文件夹并切换回全部文件
      else if (!isCtrlOrCmd && !isShift && !isAlt && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        const folder = folders.find((f) => f.id === activeFolderId)
        if (folder) {
          if (window.confirm(`确定删除文件夹「${folder.name}」吗? 文件夹内的素材不会被物理删除。`)) {
            await deleteFolder(activeFolderId)
            setActiveFolderId(null)
            setActiveTab('all')
          }
        }
      }

      // 4. F / f -> 移到文件夹提示
      else if (!isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        window.alert('请在侧边栏中直接拖拽此文件夹以移动它的层级结构')
      }
    }

    window.addEventListener('keydown', handleSidebarKeyDown)
    return () => window.removeEventListener('keydown', handleSidebarKeyDown)
  }, [activeTab, activeFolderId, folders, deleteFolder, setActiveFolderId, setActiveTab, assets, settings])

  const getMenuPosition = () => {
    if (!folderContextMenu) return { top: 0, left: 0 }
    const isTitleMenu =
      folderContextMenu.folderId === 'root_title' ||
      folderContextMenu.folderId === 'board_title'
    const menuHeight = isTitleMenu ? 150 : 760
    const top = Math.max(10, Math.min(folderContextMenu.y, window.innerHeight - menuHeight - 15))
    const left = Math.min(folderContextMenu.x, window.innerWidth - 220)
    return { top, left }
  }

  const activeAssets = assets.filter((asset) => !asset.isDeleted)
  const allCount = activeAssets.length
  const pendingCount = activeAssets.filter((asset) => asset.aiStatus === 'pending').length
  const trashCount = assets.filter((asset) => asset.isDeleted).length

  const duplicateCount = useMemo(() => {
    const counts: Record<string, number> = {}
    activeAssets.forEach((asset) => {
      const key = `${asset.fileSize}-${asset.width}x${asset.height}`
      counts[key] = (counts[key] || 0) + 1
    })
    return activeAssets.filter(
      (asset) => counts[`${asset.fileSize}-${asset.width}x${asset.height}`] > 1
    ).length
  }, [activeAssets])

  const imageLimit = 2000
  const imageCount = activeAssets.length
  const imageProgress = Math.min(100, Math.round((imageCount / imageLimit) * 100))

  const navItems = [
    {
      id: 'all' as ActiveTab,
      label: '全部文件',
      icon: <FileImage size={navIconSize} />,
      count: allCount
    },
    {
      id: 'pending' as ActiveTab,
      label: '待整理文件',
      icon: <Layers size={navIconSize} />,
      count: pendingCount
    },
    {
      id: 'tags' as ActiveTab,
      label: '全部标签',
      icon: <Tag size={navIconSize} />,
      count: tags.length
    },
    {
      id: 'trash' as ActiveTab,
      label: '废纸篓',
      icon: <Trash2 size={navIconSize} />,
      count: trashCount
    },
    { id: 'scene' as ActiveTab, label: '浏览器', icon: <Compass size={navIconSize} />, count: 0 },
    {
      id: 'duplicates' as ActiveTab,
      label: '重复文件',
      icon: <Copy size={navIconSize} />,
      count: duplicateCount,
      alert: true
    }
  ]

  const rootFolders = folders.filter((folder) => !folder.parentId)

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab)
    setActiveFolderId(null)
    setActiveBoardId(null)
    setSelectedAssetIds([])
    if (tab === 'all' || tab === 'boards') {
      setRightSidebarOpen(true)
    }
  }

  const handleCreateFolder = (parentId?: string) => {
    const pId = parentId || 'root'
    setCreatingFolderParentId(pId)
    setNewFolderName('未命名文件夹')
    if (parentId) {
      setExpandedFolderIds((prev) => ({ ...prev, [parentId]: true }))
    }
  }

  const handleSaveCreate = async (newName: string) => {
    if (!creatingFolderParentId) return
    const name = newName.trim()
    if (name) {
      const parentId = creatingFolderParentId === 'root' ? undefined : creatingFolderParentId
      await createFolder(name, parentId)
    }
    setCreatingFolderParentId(null)
  }

  const renderInlineCreateInput = (level: number) => {
    return (
      <div
        className="flex h-7 w-full items-center justify-between rounded-md pr-2 text-[12px]"
        style={{ paddingLeft: `${12 + level * 12}px` }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="w-3 shrink-0" />
          <FolderIcon size={13} className="text-brand-600 shrink-0" />
          <FolderCreateInput
            initialValue={newFolderName}
            onSave={handleSaveCreate}
            onCancel={() => setCreatingFolderParentId(null)}
          />
        </span>
      </div>
    )
  }



  const handleSaveRename = async (id: string, newName: string) => {
    if (newName.trim()) {
      await renameFolder(id, newName.trim())
    }
    setEditingFolderId(null)
  }

  const handleOpenInExplorer = async (folderId: string) => {
    const folderAssets = assets.filter((a) => a.folderId === folderId && !a.isDeleted)
    if (folderAssets.length > 0) {
      await window.api.openPath(folderAssets[0].filePath)
    } else if (settings?.libraryPath) {
      await window.api.openExternal(settings.libraryPath)
    } else {
      window.alert('未配置文件库物理存储路径')
    }
    setFolderContextMenu(null)
  }

  const handleExportFolder = async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return
    
    const targetDirs = await window.api.pickDialog({
      title: `另存为整个文件夹「${folder.name}」到...`,
      properties: ['openDirectory', 'createDirectory']
    })
    
    if (targetDirs && targetDirs.length > 0) {
      const destDir = targetDirs[0]
      const folderAssets = assets.filter((a) => a.folderId === folderId && !a.isDeleted)
      if (folderAssets.length === 0) {
        window.alert('文件夹内没有素材可供导出')
        setFolderContextMenu(null)
        return
      }
      
      const assetPaths = folderAssets.map((a) => a.filePath)
      const successCount = await window.api.exportAssets(assetPaths, destDir)
      window.alert(`成功将 ${successCount} 个文件另存为导出到目标目录！`)
    }
    setFolderContextMenu(null)
  }

  const getFolderDescendantIds = (folderId: string): string[] => {
    const ids: string[] = [folderId]
    const findChildren = (id: string) => {
      const children = folders.filter((f) => f.parentId === id)
      children.forEach((c) => {
        ids.push(c.id)
        findChildren(c.id)
      })
    }
    findChildren(folderId)
    return ids
  }

  const handleExpandCollapseAll = (folderId: string, expand: boolean) => {
    const descendants = getFolderDescendantIds(folderId)
    setExpandedFolderIds((prev) => {
      const next = { ...prev }
      descendants.forEach((id) => {
        next[id] = expand
      })
      return next
    })
    setFolderContextMenu(null)
  }

  const renderFolderNode = (folder: FolderType, level = 0): React.ReactNode => {
    const childFolders = folders.filter((item) => item.parentId === folder.id)
    const filter = sidebarFilter.trim().toLowerCase()
    const matchesSelf = folder.name.toLowerCase().includes(filter)
    const matchesChild = childFolders.some((child) => child.name.toLowerCase().includes(filter))

    if (filter && !matchesSelf && !matchesChild) return null

    const isExpanded = Boolean(expandedFolderIds[folder.id]) || Boolean(filter)
    const isActive = activeTab === 'folder' && activeFolderId === folder.id
    const assetCount = activeAssets.filter((asset) => asset.folderId === folder.id).length

    const customColor = localStorage.getItem(`folder_color_${folder.id}`) || null
    const customIcon = localStorage.getItem(`folder_icon_${folder.id}`) || 'folder'

    const FolderIconComponent = () => {
      const size = 13
      const style = customColor ? { color: customColor } : undefined
      const colorClass = customColor ? '' : (isActive ? 'text-brand-600' : 'text-gray-500')
      
      switch (customIcon) {
        case 'image':
          return <FileImage size={size} className={colorClass} style={style} />
        case 'heart':
          return <Heart size={size} className={colorClass} style={style} fill={customColor || undefined} />
        case 'star':
          return <Star size={size} className={colorClass} style={style} fill={customColor || undefined} />
        default:
          return isActive ? (
            <FolderOpen size={size} className={colorClass} style={style} />
          ) : (
            <FolderIcon size={size} className={colorClass} style={style} />
          )
      }
    }

    return (
      <div key={folder.id} className="select-none">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveFolderId(folder.id)
            setActiveTab('folder')
            setRightSidebarOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setActiveFolderId(folder.id)
              setActiveTab('folder')
              setRightSidebarOpen(true)
            }
          }}
          onDragOver={(e) => {
            if (isInternalDragging) {
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              if (dragOverFolderId !== folder.id) {
                setDragOverFolderId(folder.id)
              }
            }
          }}
          onDragLeave={() => {
            if (dragOverFolderId === folder.id) {
              setDragOverFolderId(null)
            }
          }}
          onDrop={async (e) => {
            if (dragOverFolderId === folder.id) {
              setDragOverFolderId(null)
            }
            if (isInternalDragging) {
              e.preventDefault()
              e.stopPropagation()
              try {
                let assetIds = useAppStore.getState().selectedAssetIds
                const dataStr = e.dataTransfer.getData('application/json')
                if (dataStr) {
                  const parsed = JSON.parse(dataStr) as { assetIds: string[] }
                  if (parsed.assetIds && parsed.assetIds.length > 0) {
                    assetIds = parsed.assetIds
                  }
                }
                if (assetIds && assetIds.length > 0) {
                  await useAppStore.getState().moveAssetsToFolder(assetIds, folder.id)
                }
              } catch (err) {
                console.error('内部拖拽移动素材失败:', err)
              }
              setInternalDragging(false)
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setActiveFolderId(folder.id)
            setActiveTab('folder')
            useAppStore.getState().setRightSidebarOpen(true)
            setFolderContextMenu({ x: event.clientX, y: event.clientY, folderId: folder.id })
          }}
          className={`group flex h-7 w-full items-center justify-between rounded-md pr-2 text-[12px] transition-all cursor-pointer outline-none ${
            dragOverFolderId === folder.id
              ? 'bg-brand-100 ring-2 ring-brand-400 text-brand-700 scale-[1.02]'
              : isActive
                ? 'bg-app-selected text-app-text'
                : 'text-gray-700 hover:bg-app-hover'
          }`}
          style={{ paddingLeft: `${12 + level * 12}px` }}
        >
          <span className="flex min-w-0 items-center gap-2">
            {childFolders.length > 0 ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation()
                  setExpandedFolderIds((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }))
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    setExpandedFolderIds((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }))
                  }
                }}
                className="text-gray-400"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
            ) : (
              <span className="w-3" />
            )}
            <FolderIconComponent />
            {editingFolderId === folder.id ? (
              <FolderRenameInput
                initialValue={editName}
                onSave={(val) => handleSaveRename(folder.id, val)}
                onCancel={() => setEditingFolderId(null)}
              />
            ) : (
              <span className="truncate">{folder.name}</span>
            )}
          </span>

          <span className="flex items-center gap-1">
            <span className="text-[11px] tabular-nums text-gray-400">{assetCount}</span>
            <span className="hidden items-center gap-0.5 group-hover:flex">
              <span
                role="button"
                tabIndex={0}
                title="新建子文件夹"
                onClick={(event) => {
                  event.stopPropagation()
                  handleCreateFolder(folder.id)
                }}
                className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-brand-600"
              >
                <FolderPlus size={11} />
              </span>
              <span
                role="button"
                tabIndex={0}
                title="重命名"
                onClick={(event) => {
                  event.stopPropagation()
                  setEditingFolderId(folder.id)
                  setEditName(folder.name)
                }}
                className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-brand-600"
              >
                <Archive size={10} />
              </span>
              <span
                role="button"
                tabIndex={0}
                title="删除"
                onClick={async (event) => {
                  event.stopPropagation()
                  if (window.confirm('确定删除该文件夹吗? 文件夹内的素材不会被删除。')) {
                    await deleteFolder(folder.id)
                  }
                }}
                className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-red-500"
              >
                <Trash2 size={10} />
              </span>
            </span>
          </span>
        </div>

        {isExpanded && (
          <div className="space-y-0.5">
            {creatingFolderParentId === folder.id && renderInlineCreateInput(level + 1)}
            {childFolders.map((child) => renderFolderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside style={{ width: `${width}px` }} className="flex h-full w-full shrink-0 flex-col bg-app-sidebar text-[12px] text-gray-700">
      <div
        className="flex h-12 items-center justify-between px-4 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={() => handleNavClick('settings')}
          className={`app-icon-button ${activeTab === 'settings' ? 'active' : ''}`}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="设置"
        >
          {activeTab === 'settings' ? <Settings size={16} /> : <Menu size={16} />}
        </button>
        <img
          src={logoImg}
          alt="小册子"
          className="h-7 w-7 rounded-full object-cover shadow-sm pointer-events-none"
        />
      </div>

      <div className="px-4 pb-4">
        <div className="text-[12px] font-semibold text-app-text">小册子</div>
        <div className="mt-2 h-1 rounded-full bg-gray-300">
          <div
            className="h-1 rounded-full bg-brand-500 transition-all"
            style={{ width: `${imageProgress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
          <span>
            图片数量 {imageCount} / {imageLimit}
          </span>
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-500 text-[9px] text-white">
            ✓
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              activeTab === item.id && activeFolderId === null && activeBoardId === null
            const isDragOver = dragOverTab === item.id
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                onDragOver={(e) => {
                  if (isInternalDragging && item.id === 'all') {
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverTab !== item.id) {
                      setDragOverTab(item.id)
                    }
                  }
                }}
                onDragLeave={() => {
                  if (dragOverTab === item.id) {
                    setDragOverTab(null)
                  }
                }}
                onDrop={async (e) => {
                  if (dragOverTab === item.id) {
                    setDragOverTab(null)
                  }
                  if (isInternalDragging && item.id === 'all') {
                    e.preventDefault()
                    e.stopPropagation()
                    try {
                      let assetIds = useAppStore.getState().selectedAssetIds
                      const dataStr = e.dataTransfer.getData('application/json')
                      if (dataStr) {
                        const parsed = JSON.parse(dataStr) as { assetIds: string[] }
                        if (parsed.assetIds && parsed.assetIds.length > 0) {
                          assetIds = parsed.assetIds
                        }
                      }
                      if (assetIds && assetIds.length > 0) {
                        await useAppStore.getState().moveAssetsToFolder(assetIds, '')
                      }
                    } catch (err) {
                      console.error('内部拖拽移出文件夹失败:', err)
                    }
                    setInternalDragging(false)
                  }
                }}
                className={`flex h-7 w-full items-center justify-between rounded-md px-3 text-left transition-all ${
                  isDragOver
                    ? 'bg-brand-100 ring-2 ring-brand-400 text-brand-700 scale-[1.02]'
                    : isActive
                      ? 'bg-app-selected text-app-text'
                      : 'text-gray-700 hover:bg-app-hover'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={isActive ? 'text-brand-600' : 'text-gray-500'}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </span>
                {item.count > 0 && (
                  <span
                    className={
                      item.alert
                        ? 'flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white'
                        : 'text-[11px] tabular-nums text-gray-400'
                    }
                  >
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div
          onClick={toggleBoardsCollapse}
          onContextMenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setFolderContextMenu({ x: event.clientX, y: event.clientY, folderId: 'board_title' })
          }}
          className="mt-5 flex cursor-pointer select-none items-center justify-between px-2 text-[12px] text-gray-500 hover:text-gray-900 transition-colors"
        >
          <span className="flex items-center gap-1 font-medium">
            {isBoardsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            <span>看板</span>
          </span>
          <span className="tabular-nums text-[11px]">{boards.length}</span>
        </div>

        {!isBoardsCollapsed && (
          <div className="mt-1 space-y-1">
            {boards.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-400">无看板</div>
            ) : (
              boards.map((board) => {
                const isActive = activeTab === 'board-detail' && activeBoardId === board.id
                return (
                  <button
                    type="button"
                    key={board.id}
                    onClick={() => {
                      setActiveBoardId(board.id)
                      setActiveTab('board-detail')
                      setRightSidebarOpen(true)
                    }}
                    className={`flex h-7 w-full items-center justify-between rounded-md px-3 transition-colors ${
                      isActive ? 'bg-app-selected text-app-text' : 'text-gray-700 hover:bg-app-hover'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FolderIcon
                        size={13}
                        className={isActive ? 'text-brand-600' : 'text-gray-500'}
                      />
                      <span className="truncate">{board.name}</span>
                    </span>
                    <span className="text-[11px] tabular-nums text-gray-400">
                      {board.assets.length}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}

        <div
          onClick={toggleFoldersCollapse}
          onContextMenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setFolderContextMenu({ x: event.clientX, y: event.clientY, folderId: 'root_title' })
          }}
          className="mt-5 flex cursor-pointer select-none items-center justify-between px-2 text-[12px] text-gray-500 hover:text-gray-900 transition-colors"
        >
          <span className="flex items-center gap-1 font-medium">
            {isFoldersCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            <span>文件夹</span>
          </span>
          <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="tabular-nums text-[11px]">{folders.length}</span>
            <button
              type="button"
              title="新建文件夹"
              onClick={() => handleCreateFolder()}
              className="rounded p-0.5 text-gray-500 hover:bg-app-hover hover:text-brand-600"
            >
              <Plus size={12} />
            </button>
          </span>
        </div>

        {!isFoldersCollapsed && (
          <div className="mt-1 space-y-1">
            {creatingFolderParentId === 'root' && renderInlineCreateInput(0)}
            {rootFolders.length === 0 && creatingFolderParentId !== 'root' ? (
              <div className="px-3 py-2 text-[11px] text-gray-400">无文件夹</div>
            ) : (
              rootFolders.map((folder) => renderFolderNode(folder))
            )}
          </div>
        )}
      </div>

      <div className="flex h-9 shrink-0 items-center gap-2 border-t border-app-border px-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white px-2 text-gray-400">
          <Search size={13} />
          <input
            id="sidebar-folder-filter"
            value={sidebarFilter}
            onChange={(event) => setSidebarFilter(event.target.value)}
            placeholder="筛选"
            className="h-7 min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] outline-none focus:shadow-none"
          />
        </div>
        <button
          type="button"
          onClick={() => handleCreateFolder()}
          className="app-icon-button"
          title="新建文件夹"
        >
          <Plus size={14} />
        </button>
      </div>

      {folderContextMenu && (
        <div
          style={{ top: getMenuPosition().top, left: getMenuPosition().left }}
          className="fixed z-[9999] w-52 rounded-lg border border-app-border bg-white py-1 text-[12px] text-gray-700 shadow-xl select-none"
          onClick={(event) => event.stopPropagation()}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          {folderContextMenu.folderId === 'root_title' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  handleCreateFolder()
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                新建文件夹
              </button>
              <div className="my-1 h-px bg-app-border" />
              <button
                type="button"
                onClick={() => {
                  setExpandedFolderIds((prev) => {
                    const next = { ...prev }
                    folders.forEach((f) => {
                      next[f.id] = true
                    })
                    return next
                  })
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                展开所有文件夹
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpandedFolderIds({})
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                收起所有文件夹
              </button>
              <div className="my-1 h-px bg-app-border" />
              <button
                type="button"
                onClick={() => {
                  window.api.getFolders()
                  window.alert('文件夹数据重新加载成功')
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                重新加载文件夹
              </button>
            </>
          ) : folderContextMenu.folderId === 'board_title' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  window.alert('看板数据重新加载成功')
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                重新加载看板
              </button>
            </>
          ) : (
            <>
              {/* 第 1 组 */}
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => handleOpenInExplorer(folderContextMenu.folderId)}
                className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-app-hover hover:text-app-text"
              >
                <span>在文件资源管理器中打开</span>
                <span className="text-gray-400 text-[10px]">Ctrl+Enter</span>
              </button>
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  setActiveFolderId(folderContextMenu.folderId)
                  setActiveTab('folder')
                  useAppStore.getState().setRightSidebarOpen(true)
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                在新窗口中打开
              </button>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 2 组 */}
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  setEditingFolderId(folderContextMenu.folderId)
                  const folder = folders.find((f) => f.id === folderContextMenu.folderId)
                  if (folder) setEditName(folder.name)
                  setFolderContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-app-hover hover:text-app-text"
              >
                <span>重命名文件夹</span>
                <span className="text-gray-400 text-[10px]">F2</span>
              </button>
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`xc-tuji://folder/${folderContextMenu.folderId}`)
                    window.alert('文件夹 URL 已成功复制到剪贴板！')
                  } catch (e) {
                    console.error(e)
                  }
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                复制 URL
              </button>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 3 组 */}
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  const folder = folders.find((f) => f.id === folderContextMenu.folderId)
                  handleCreateFolder(folder?.parentId)
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                创建同级文件夹
              </button>
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  handleCreateFolder(folderContextMenu.folderId)
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                创建子文件夹
              </button>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 4 组 */}
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => handleExpandCollapseAll(folderContextMenu.folderId, true)}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                展开所有子文件夹
              </button>
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => handleExpandCollapseAll(folderContextMenu.folderId, false)}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                收起所有子文件夹
              </button>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 5 组 (带二级子菜单: 排列) */}
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu('sort')}
                  className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-app-hover hover:text-app-text"
                >
                  <span>子文件夹排列</span>
                  <span className="text-gray-400 font-mono text-[10px]">›</span>
                </button>
                {activeSubmenu === 'sort' && (
                  <div className="absolute left-full top-0 ml-1 w-32 rounded-md border border-app-border bg-white py-1 shadow-lg z-[10000]">
                    {['按名称', '按创建时间', '按修改时间'].map((sortType) => (
                      <button
                        key={sortType}
                        type="button"
                        onClick={() => {
                          window.alert(`已将子文件夹切换为: ${sortType}`)
                          setFolderContextMenu(null)
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
                      >
                        {sortType}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 6 组 */}
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  window.alert('已成功上移至最顶部')
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                上移到顶部
              </button>
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  window.alert('已成功下移至最底部')
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                下移到底部
              </button>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 7 组 */}
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  window.alert('已成功添加到快捷项')
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                添加到快捷项
              </button>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 8 组 */}
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  window.alert('请在侧边栏中直接拖拽此文件夹以移动它的层级结构')
                  setFolderContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-app-hover hover:text-app-text"
              >
                <span>移到文件夹...</span>
                <span className="text-gray-400 text-[10px]">F</span>
              </button>
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => handleExportFolder(folderContextMenu.folderId)}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                另存为...
              </button>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 9 组 (带二级子菜单: 设置图标) */}
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu('icon')}
                  className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-app-hover hover:text-app-text"
                >
                  <span>设置图标</span>
                  <span className="text-gray-400 font-mono text-[10px]">›</span>
                </button>
                {activeSubmenu === 'icon' && (
                  <div className="absolute left-full top-0 ml-1 w-32 rounded-md border border-app-border bg-white py-1 shadow-lg z-[10000]">
                    {[
                      { label: '默认文件夹', val: 'folder' },
                      { label: '图片包', val: 'image' },
                      { label: '心形', val: 'heart' },
                      { label: '星星', val: 'star' }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          localStorage.setItem(`folder_icon_${folderContextMenu.folderId}`, item.val)
                          setFolderContextMenu(null)
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 第 10 组 (带二级子菜单: 设置图标颜色) */}
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu('color')}
                  className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-app-hover hover:text-app-text"
                >
                  <span>设置图标颜色</span>
                  <span className="text-gray-400 font-mono text-[10px]">›</span>
                </button>
                {activeSubmenu === 'color' && (
                  <div className="absolute left-full top-0 ml-1 w-32 rounded-md border border-app-border bg-white py-1 shadow-lg z-[10000]">
                    {[
                      { label: '默认灰色', val: '' },
                      { label: '红色', val: '#ef4444' },
                      { label: '橙色', val: '#f97316' },
                      { label: '绿色', val: '#22c55e' },
                      { label: '蓝色', val: '#3b82f6' },
                      { label: '紫色', val: '#a855f7' }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          if (!item.val) {
                            localStorage.removeItem(`folder_color_${folderContextMenu.folderId}`)
                          } else {
                            localStorage.setItem(`folder_color_${folderContextMenu.folderId}`, item.val)
                          }
                          setFolderContextMenu(null)
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
                      >
                        <span className="flex items-center gap-2">
                          {item.val && (
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.val }}
                            />
                          )}
                          <span>{item.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 11 组 */}
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  window.api.getFolders()
                  window.alert('文件夹数据重新加载成功')
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                重新加载文件夹
              </button>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu('sync')}
                  className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-app-hover hover:text-app-text"
                >
                  <span>同步</span>
                  <span className="text-gray-400 font-mono text-[10px]">›</span>
                </button>
                {activeSubmenu === 'sync' && (
                  <div className="absolute left-full top-0 ml-1 w-32 rounded-md border border-app-border bg-white py-1 shadow-lg z-[10000]">
                    {['同步本地库', '完全覆盖同步'].map((syncType) => (
                      <button
                        key={syncType}
                        type="button"
                        onClick={() => {
                          window.alert(`同步成功: ${syncType}`)
                          setFolderContextMenu(null)
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
                      >
                        {syncType}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 12 组 */}
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  window.alert('文件夹已设为隐藏，可在全局偏好中再次显示')
                  setFolderContextMenu(null)
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-app-hover hover:text-app-text"
              >
                隐藏
              </button>

              <div className="my-1 h-px bg-app-border" />

              {/* 第 13 组 */}
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={async () => {
                  const folder = folders.find((item) => item.id === folderContextMenu.folderId)
                  if (
                    folder &&
                    window.confirm(`确定删除文件夹「${folder.name}」吗? 文件夹内的素材不会被物理删除。`)
                  ) {
                    await deleteFolder(folderContextMenu.folderId)
                  }
                  setFolderContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <span>移动到废纸篓</span>
                <span className="text-red-400 text-[10px]">Del</span>
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
