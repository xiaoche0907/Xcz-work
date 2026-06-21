/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  Folder as FolderIcon,
  FolderHeart,
  FolderPlus,
  FolderSync,
  FolderUp,
  Import,
  Pencil,
  Pin,
  Trash2
} from 'lucide-react'
import { Asset, Folder } from '../../../shared/types'
import { useAppStore } from '../store/useAppStore'
import { AssetCard } from './AssetCard'
import clsx from 'clsx'

let copiedAssetIds: string[] = []

interface AssetGridProps {
  onDoubleClickAsset?: (asset: Asset) => void
}

export const AssetGrid: React.FC<AssetGridProps> = () => {
  const {
    assets,
    folders,
    boards,
    activeTab,
    activeFolderId,
    activeBoardId,
    selectedAssetIds,
    setSelectedAssetIds,
    searchQuery,
    sortKey,
    sortOrder,
    settings,
    isRightSidebarOpen,
    importFiles,
    toggleFavorite,
    createFolder,
    renameFolder,
    deleteFolder,
    moveToTrash,
    restoreFromTrash,
    deleteAssetPhysical,
    addAssetsToBoard,
    removeAssetFromBoard,
    saveAsset,
    setActiveTab,
    setActiveFolderId,
    setRightSidebarOpen,
    isLeftSidebarOpen,
    isStatusbarOpen,
    isAlwaysOnTop,
    isFullScreen,
    setLeftSidebarOpen,
    setStatusbarOpen,
    setAlwaysOnTop,
    setFullScreen,
    setCreatingFolderParentId,
    setNewFolderName,
    updateAssetTags,
    isGrayscale,
    setGrayscale,
    tags,

    // 新增的状态与方法
    layoutMode,
    foldersOnTop,
    showSubfolderContents,
    filterColor,
    filterKeyword,
    filterFolderId,
    filterTagId,
    filterFileType,
    filterShape,
    filterRating,

    isInternalDragging,
    setInternalDragging,
    moveAssetsToFolder,
    setViewerAsset
  } = useAppStore()

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; assetId: string } | null>(
    null
  )
  const [folderContextMenu, setFolderContextMenu] = useState<{
    x: number
    y: number
    folderId: string
  } | null>(null)
  const [blankContextMenu, setBlankContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [hoverSubmenu, setHoverSubmenu] = useState<string | null>(null)
  const [submenuStyle, setSubmenuStyle] = useState<React.CSSProperties>({})
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasDraggedRef = useRef(false)
  const lastDeletedAssetIdsRef = useRef<string[]>([])

  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)

  const handleRenameAsset = async (id: string, newName: string) => {
    setEditingAssetId(null)
    const cleanName = newName.trim()
    if (!cleanName) return
    const asset = assets.find((item) => item.id === id)
    if (asset && cleanName !== asset.fileName) {
      await saveAsset({
        ...asset,
        fileName: cleanName,
        updatedAt: new Date().toISOString()
      })
    }
  }

  // 鼠标拖拽框选状态
  const [selectionBox, setSelectionBox] = useState({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    visible: false
  })

  // 动态获取当前行内的列数，用于上下方向键导航
  const getColumnCount = () => {
    const cards = document.querySelectorAll('.asset-card-container')
    if (cards.length <= 1) return 1
    const firstTop = (cards[0] as HTMLElement).offsetTop
    let cols = 0
    for (let i = 0; i < cards.length; i++) {
      if ((cards[i] as HTMLElement).offsetTop === firstTop) {
        cols++
      } else {
        break
      }
    }
    return cols || 4
  }

  // 键盘监听器已被移到下方

  // 右键菜单边界防溢出裁剪调整函数
  const adjustMenuPosition = (x: number, y: number, menuWidth = 224, menuHeight = 420) => {
    let top = y
    let left = x
    if (y + menuHeight > window.innerHeight) {
      top = Math.max(10, window.innerHeight - menuHeight - 10)
    }
    if (x + menuWidth > window.innerWidth) {
      left = Math.max(10, window.innerWidth - menuWidth - 10)
    }
    return { top, left }
  }

  const getSubmenuWidth = (name: string) => {
    switch (name) {
      case 'open-with':
      case 'copy-more':
        return 144
      case 'folder':
      case 'board':
        return 176
      case 'thumbnail':
        return 160
      case 'sync':
        return 128
      default:
        return 160
    }
  }

  const getSubmenuHeight = (name: string) => {
    switch (name) {
      case 'open-with':
      case 'copy-more':
        return 72
      case 'folder':
        return Math.min(((folders?.length || 0) + 1) * 32 + 8, 224)
      case 'board':
        const len = boards?.length || 0
        return Math.min((len === 0 ? 1 : len) * 32 + 8, 224)
      case 'thumbnail':
        return 40
      case 'sync':
        return 40
      default:
        return 80
    }
  }

  const handleMouseEnterSubmenu = (
    event: React.MouseEvent<HTMLDivElement>,
    name: string
  ) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    
    const width = getSubmenuWidth(name)
    const height = getSubmenuHeight(name)
    
    let left = rect.right - 4 // 稍微重叠以避免鼠标移动时的空隙
    
    // 水平边界检测
    if (left + width > window.innerWidth) {
      left = rect.left - width + 4
    }
    
    let top = rect.top
    // 智能垂直对齐：判断触发项在窗口的上半部还是下半部
    if (rect.top > window.innerHeight / 2) {
      // 在下半屏，向上展开：子菜单底部对齐触发项底部，保持连续性，不出现鼠标跨越空隙
      top = rect.bottom - height
      if (top < 10) {
        top = 10
      }
    } else {
      // 在上半屏，向下展开：子菜单顶部对齐触发项顶部
      top = rect.top
      if (top + height > window.innerHeight) {
        top = Math.max(10, window.innerHeight - height - 10)
      }
    }

    setSubmenuStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 10000
    })
    setHoverSubmenu(name)
  }

  const handleMenuMouseOver = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const triggerEl = target.closest('.submenu-trigger')
    if (!triggerEl) {
      setHoverSubmenu(null)
    }
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (
      target.closest('.asset-card-container') ||
      target.closest('.folder-card') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select')
    ) {
      return
    }
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()

    // 过滤滚动条区域的点击，防止干扰滚动条正常工作
    if (
      event.clientX > rect.left + containerRef.current.clientWidth ||
      event.clientY > rect.top + containerRef.current.clientHeight
    ) {
      return
    }

    const activeEl = document.activeElement
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true')
    ) {
      ;(activeEl as HTMLElement).blur()
    }

    // 阻止浏览器默认文本选择与元素拖拽
    event.preventDefault()

    hasDraggedRef.current = false

    setSelectionBox({
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      visible: true
    })

    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
      setSelectedAssetIds([])
    }
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!selectionBox.visible || !containerRef.current) return
    const currentX = event.clientX
    const currentY = event.clientY
    setSelectionBox((prev) => ({ ...prev, currentX, currentY }))

    // 判定是否是真正的拖拽行为，过滤微小抖动
    const dragDistance = Math.sqrt(
      Math.pow(currentX - selectionBox.startX, 2) +
      Math.pow(currentY - selectionBox.startY, 2)
    )
    if (dragDistance > 4) {
      hasDraggedRef.current = true
    }

    const boxLeft = Math.min(selectionBox.startX, currentX)
    const boxTop = Math.min(selectionBox.startY, currentY)
    const boxWidth = Math.abs(selectionBox.startX - currentX)
    const boxHeight = Math.abs(selectionBox.startY - currentY)

    const boxRect = {
      left: boxLeft,
      top: boxTop,
      right: boxLeft + boxWidth,
      bottom: boxTop + boxHeight
    }

    const newSelectedIds: string[] = []
    const cards = containerRef.current.querySelectorAll('.asset-card-container')
    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect()
      const assetId = card.getAttribute('data-asset-id')
      if (!assetId) return
      const isIntersect = !(
        cardRect.left > boxRect.right ||
        cardRect.right < boxRect.left ||
        cardRect.top > boxRect.bottom ||
        cardRect.bottom < boxRect.top
      )
      if (isIntersect) {
        newSelectedIds.push(assetId)
      }
    })

    // 只有当选中状态发生实际变化时才触发 store 更新，避免冗余重绘与坐标不同步
    const isSame =
      selectedAssetIds.length === newSelectedIds.length &&
      selectedAssetIds.every((id) => newSelectedIds.includes(id))
    if (!isSame) {
      setSelectedAssetIds(newSelectedIds)
    }
  }

  const handleMouseUp = () => {
    if (selectionBox.visible) {
      setSelectionBox((prev) => ({ ...prev, visible: false }))
    }
  }

  const filteredAssets = useMemo(() => {
    let result = [...assets]

    if (activeTab === 'trash') {
      result = result.filter((asset) => asset.isDeleted)
    } else {
      result = result.filter((asset) => !asset.isDeleted)

      if (activeTab === 'all') {
        result = result.filter((asset) => !asset.folderId)
      } else if (activeTab === 'pending') {
        result = result.filter((asset) => asset.aiStatus === 'pending')
      } else if (activeTab === 'folder' && activeFolderId) {
        if (showSubfolderContents) {
          const childFolderIds = getDescendantFolderIds(activeFolderId, folders)
          const allFolderIds = [activeFolderId, ...childFolderIds]
          result = result.filter((asset) => allFolderIds.includes(asset.folderId))
        } else {
          result = result.filter((asset) => asset.folderId === activeFolderId)
        }
      } else if (activeTab === 'board-detail' && activeBoardId) {
        const board = boards.find((item) => item.id === activeBoardId)
        const boardAssetIds = board?.assets.map((asset) => asset.assetId) || []
        result = result.filter((asset) => boardAssetIds.includes(asset.id))
      } else if (activeTab === 'duplicates') {
        const counts: Record<string, number> = {}
        result.forEach((asset) => {
          const key = `${asset.fileSize}-${asset.width}x${asset.height}`
          counts[key] = (counts[key] || 0) + 1
        })
        result = result.filter(
          (asset) => counts[`${asset.fileSize}-${asset.width}x${asset.height}`] > 1
        )
      }
    }

    // 基础搜索过滤 (来自顶部栏的 input 检索)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const allTags = useAppStore.getState().tags

      result = result.filter((asset) => {
        const matchName = asset.fileName.toLowerCase().includes(query)
        const matchSummary = asset.aiAnalysis?.summary?.toLowerCase().includes(query)
        const matchThinking = asset.aiAnalysis?.designThinking?.toLowerCase().includes(query)
        const matchPrompt =
          asset.aiAnalysis?.chinesePrompt?.toLowerCase().includes(query) ||
          asset.aiAnalysis?.englishPrompt?.toLowerCase().includes(query)
        const matchTags = asset.tags.some((tagId) =>
          allTags
            .find((tag) => tag.id === tagId)
            ?.name.toLowerCase()
            .includes(query)
        )

        return matchName || matchSummary || matchThinking || matchPrompt || matchTags
      })
    }

    // 高级筛选：颜色过滤
    if (filterColor) {
      const colorKeywords: Record<string, string[]> = {
        red: ['红'],
        orange: ['橙'],
        yellow: ['黄'],
        green: ['绿'],
        teal: ['青'],
        blue: ['蓝'],
        purple: ['紫'],
        pink: ['粉'],
        brown: ['棕', '褐', '咖'],
        white: ['白'],
        black: ['黑'],
        grey: ['灰']
      }
      const keywords = colorKeywords[filterColor] || []
      result = result.filter((asset) => {
        const analysisText = asset.aiAnalysis?.colorAnalysis || ''
        return keywords.some((kw) => analysisText.includes(kw))
      })
    }

    // 高级筛选：高级关键字过滤
    if (filterKeyword.trim()) {
      const query = filterKeyword.toLowerCase().trim()
      const allTags = useAppStore.getState().tags

      result = result.filter((asset) => {
        const matchName = asset.fileName.toLowerCase().includes(query)
        const matchSummary = asset.aiAnalysis?.summary?.toLowerCase().includes(query)
        const matchThinking = asset.aiAnalysis?.designThinking?.toLowerCase().includes(query)
        const matchPrompt =
          asset.aiAnalysis?.chinesePrompt?.toLowerCase().includes(query) ||
          asset.aiAnalysis?.englishPrompt?.toLowerCase().includes(query)
        const matchTags = asset.tags.some((tagId) =>
          allTags
            .find((tag) => tag.id === tagId)
            ?.name.toLowerCase()
            .includes(query)
        )

        return matchName || matchSummary || matchThinking || matchPrompt || matchTags
      })
    }

    // 高级筛选：文件夹目录过滤
    if (filterFolderId) {
      result = result.filter((asset) => asset.folderId === filterFolderId)
    }

    // 高级筛选：标签过滤
    if (filterTagId) {
      result = result.filter((asset) => asset.tags.includes(filterTagId))
    }

    // 高级筛选：文件类型过滤
    if (filterFileType) {
      result = result.filter((asset) => asset.fileType?.toLowerCase() === filterFileType.toLowerCase())
    }

    // 高级筛选：形状比例过滤
    if (filterShape) {
      result = result.filter((asset) => {
        const ratio = asset.width / asset.height
        if (filterShape === 'horizontal') return ratio > 1.1
        if (filterShape === 'vertical') return ratio < 0.9
        if (filterShape === 'square') return ratio >= 0.9 && ratio <= 1.1
        return true
      })
    }

    // 高级筛选：星级评分过滤
    if (filterRating !== null) {
      if (filterRating === 0) {
        result = result.filter((asset) => !asset.rating || asset.rating === 0)
      } else {
        result = result.filter((asset) => asset.rating !== undefined && asset.rating >= filterRating)
      }
    }

    result.sort((assetA, assetB) => {
      let valueA: string | number = assetA[sortKey]
      let valueB: string | number = assetB[sortKey]

      if (sortKey === 'fileName') {
        valueA = assetA.fileName.toLowerCase()
        valueB = assetB.fileName.toLowerCase()
      } else if (sortKey === 'createdAt') {
        valueA = new Date(assetA.createdAt).getTime()
        valueB = new Date(assetB.createdAt).getTime()
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [
    assets,
    boards,
    activeTab,
    activeFolderId,
    activeBoardId,
    searchQuery,
    sortKey,
    sortOrder,
    folders,
    showSubfolderContents,
    filterColor,
    filterKeyword,
    filterFolderId,
    filterTagId,
    filterFileType,
    filterShape,
    filterRating
  ])

  // 监听右键菜单及文件的全局键盘快捷键
  useEffect(() => {
    const handleGlobalKeyDown = async (event: KeyboardEvent) => {
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

      // 0. Ctrl + Z -> 撤销上一次移到废纸篓的操作
      if (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (lastDeletedAssetIdsRef.current && lastDeletedAssetIdsRef.current.length > 0) {
          for (const id of lastDeletedAssetIdsRef.current) {
            await restoreFromTrash(id)
          }
          alert(`已成功撤销删除，已还原 ${lastDeletedAssetIdsRef.current.length} 个文件`)
          setSelectedAssetIds([...lastDeletedAssetIdsRef.current])
          lastDeletedAssetIdsRef.current = [] // 消费掉
        } else {
          alert('暂无可以撤销的删除操作')
        }
        return
      }

      // 如果当前没有选中任何素材，只处理无需选中的热键，其余直接返回
      if (!selectedAssetIds || selectedAssetIds.length === 0) {
        return
      }

      const activeId = selectedAssetIds[0]
      const activeAsset = assets.find((a) => a.id === activeId)
      if (!activeAsset) return

      // 1. Ctrl + Enter -> 在文件资源管理器中显示
      if (isCtrlOrCmd && !isShift && !isAlt && event.key === 'Enter') {
        event.preventDefault()
        await window.api.openPath(activeAsset.filePath)
      }

      // 2. Ctrl + O -> 在默认应用中打开
      else if (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        await window.api.openExternal(activeAsset.filePath)
      }

      // 3. F2 -> 重命名 (开启卡片内联重命名)
      else if (!isCtrlOrCmd && !isShift && !isAlt && event.key === 'F2') {
        event.preventDefault()
        setEditingAssetId(activeId)
      }

      // 4. Alt + Ctrl + C -> 复制图片到剪贴板
      else if (isCtrlOrCmd && !isShift && isAlt && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        const success = await window.api.copyImage(activeAsset.filePath)
        if (success) {
          alert('图片已成功复制到剪切板')
        } else {
          alert('图片复制失败')
        }
      }

      // 5. Ctrl + C -> 复制物理文件路径 + 保存 ID 供 Ctrl + V 粘贴
      else if (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        copiedAssetIds = [...selectedAssetIds]
        await navigator.clipboard.writeText(activeAsset.filePath)
        alert(`已复制 ${selectedAssetIds.length} 个文件，可切换文件夹后按 Ctrl+V 粘贴`)
      }

      // 6. Delete -> 移到废纸篓 (支持批量选中)
      else if (!isCtrlOrCmd && !isShift && !isAlt && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        const message = activeTab === 'trash'
          ? '彻底删除后将无法恢复，确定物理删除选中的素材吗?'
          : '确定将选中的素材移入废纸篓吗?'

        if (window.confirm(message)) {
          if (activeTab !== 'trash') {
            lastDeletedAssetIdsRef.current = [...selectedAssetIds]
          }
          for (const id of selectedAssetIds) {
            if (activeTab === 'trash') {
              await deleteAssetPhysical(id)
            } else {
              await moveToTrash(id)
            }
          }
          setSelectedAssetIds([])
        }
      }

      // 7. Ctrl + Shift + C -> 复制标签
      else if (isCtrlOrCmd && isShift && !isAlt && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        const tagsText = JSON.stringify(activeAsset.tags || [])
        await navigator.clipboard.writeText(tagsText)
        alert('已复制素材标签')
      }

      // 8. Ctrl + Shift + V -> 粘贴标签 (支持批量粘贴)
      else if (isCtrlOrCmd && isShift && !isAlt && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        try {
          const text = await navigator.clipboard.readText()
          const tagIds = JSON.parse(text)
          if (Array.isArray(tagIds)) {
            for (const assetId of selectedAssetIds) {
              await updateAssetTags(assetId, tagIds)
            }
            alert('已粘贴素材标签')
          }
        } catch (e) {
          alert('粘贴标签失败')
        }
      }

      // 9. Ctrl + V -> 粘贴文件 (将复制的文件路径复制并导入到当前选中的文件夹下)
      else if (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        if (copiedAssetIds.length > 0) {
          const currentFolderId = activeFolderId || ''
          const filePathsToImport = copiedAssetIds
            .map(id => assets.find(a => a.id === id)?.filePath)
            .filter(Boolean) as string[]
          
          if (filePathsToImport.length > 0) {
            await importFiles(filePathsToImport, currentFolderId)
            alert(`已成功粘贴导入 ${filePathsToImport.length} 个文件`)
          }
        }
      }

      // 10. Ctrl + D -> 取消选择
      else if (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        setSelectedAssetIds([])
      }

      // 11. Shift + Delete -> 永久物理删除
      else if (!isCtrlOrCmd && isShift && !isAlt && event.key === 'Delete') {
        event.preventDefault()
        if (window.confirm('确定要【永久物理删除】选中的素材吗？该操作无法恢复！')) {
          for (const id of selectedAssetIds) {
            await deleteAssetPhysical(id)
          }
          setSelectedAssetIds([])
          alert('已永久删除')
        }
      }

      // 12. F -> 移到文件夹
      else if (!isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        const folderListStr = folders.map((f, i) => `${i + 1}. ${f.name}`).join('\n')
        const chosen = window.prompt(
          `请输入目标文件夹编号或名称来移动选中的 ${selectedAssetIds.length} 个文件：\n\n0. 全部文件 (根目录)\n${folderListStr}`
        )
        if (chosen !== null) {
          const trimmed = chosen.trim()
          if (trimmed === '0' || trimmed === '全部文件') {
            await moveAssetsToFolder(selectedAssetIds, '')
            alert('已成功移动到根目录')
          } else {
            const index = parseInt(trimmed, 10) - 1
            const targetFolder = folders[index] || folders.find(f => f.name === trimmed)
            if (targetFolder) {
              await moveAssetsToFolder(selectedAssetIds, targetFolder.id)
              alert(`已成功移动到文件夹：「${targetFolder.name}」`)
            } else {
              alert('未找到指定的文件夹')
            }
          }
        }
      }

      // 13. B -> 添加到看板
      else if (!isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        if (boards.length === 0) {
          alert('当前暂无看板，请先在侧栏创建看板。')
          return
        }
        const boardListStr = boards.map((b, i) => `${i + 1}. ${b.name}`).join('\n')
        const chosen = window.prompt(
          `请输入目标看板编号或名称来添加选中的 ${selectedAssetIds.length} 个文件：\n\n${boardListStr}`
        )
        if (chosen !== null) {
          const trimmed = chosen.trim()
          const index = parseInt(trimmed, 10) - 1
          const targetBoard = boards[index] || boards.find(b => b.name === trimmed)
          if (targetBoard) {
            await addAssetsToBoard(targetBoard.id, selectedAssetIds)
            alert(`已成功添加到看板：「${targetBoard.name}」`)
          } else {
            alert('未找到指定的看板')
          }
        }
      }

      // 14. Shift + B -> 从当前看板中移除
      else if (!isCtrlOrCmd && isShift && !isAlt && event.key.toUpperCase() === 'B') {
        event.preventDefault()
        if (activeTab === 'board-detail' && activeBoardId) {
          if (window.confirm(`确定从当前看板中移出选中的 ${selectedAssetIds.length} 个文件吗？`)) {
            for (const id of selectedAssetIds) {
              await removeAssetFromBoard(activeBoardId, id)
            }
            setSelectedAssetIds([])
            alert('已从当前看板中移出')
          }
        } else {
          alert('当前不在看板详情页，无法进行移出操作')
        }
      }

      // 15. T -> 快速给选中文件加标签
      else if (!isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 't') {
        event.preventDefault()
        const tagName = window.prompt('请输入要给选中素材添加的标签名称：')
        const cleanName = tagName?.trim()
        if (cleanName) {
          const store = useAppStore.getState()
          let tag = store.tags.find(t => t.name.toLowerCase() === cleanName.toLowerCase())
          if (!tag) {
            await store.createTag(cleanName)
            tag = useAppStore.getState().tags.find(t => t.name.toLowerCase() === cleanName.toLowerCase())
          }
          if (tag) {
            for (const assetId of selectedAssetIds) {
              const asset = assets.find(a => a.id === assetId)
              if (asset && !asset.tags.includes(tag.id)) {
                await store.updateAssetTags(assetId, [...asset.tags, tag.id])
              }
            }
            alert(`已为选中的 ${selectedAssetIds.length} 个素材添加标签: ${cleanName}`)
          }
        }
      }

      // 16. Shift + 0~5 -> 评分等级控制
      else if (!isCtrlOrCmd && isShift && !isAlt && ['0', '1', '2', '3', '4', '5'].includes(event.key)) {
        event.preventDefault()
        const score = parseInt(event.key, 10)
        for (const assetId of selectedAssetIds) {
          const asset = assets.find(a => a.id === assetId)
          if (asset) {
            await saveAsset({
              ...asset,
              rating: score,
              updatedAt: new Date().toISOString()
            })
          }
        }
        alert(score === 0 ? '已取消星级评分' : `已将选中文件评分设为 ${score} 星`)
      }

      // 17. 列表方向键与 Vim / 快速定位导航
      else {
        const activeIndex = filteredAssets.findIndex((a) => a.id === activeId)
        if (activeIndex !== -1) {
          // 左 / 上一个文件
          if (
            (!isCtrlOrCmd && !isShift && !isAlt && event.key === 'ArrowLeft') ||
            (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'p') ||
            (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'h')
          ) {
            event.preventDefault()
            const prevIndex = Math.max(0, activeIndex - 1)
            setSelectedAssetIds([filteredAssets[prevIndex].id])
          }
          // 右 / 下一个文件
          else if (
            (!isCtrlOrCmd && !isShift && !isAlt && event.key === 'ArrowRight') ||
            (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'n') ||
            (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'l')
          ) {
            event.preventDefault()
            const nextIndex = Math.min(filteredAssets.length - 1, activeIndex + 1)
            setSelectedAssetIds([filteredAssets[nextIndex].id])
          }
          // 上
          else if (
            (!isCtrlOrCmd && !isShift && !isAlt && event.key === 'ArrowUp') ||
            (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'k')
          ) {
            event.preventDefault()
            const cols = layoutMode === 'list' ? 1 : getColumnCount()
            const upIndex = Math.max(0, activeIndex - cols)
            setSelectedAssetIds([filteredAssets[upIndex].id])
          }
          // 下
          else if (
            (!isCtrlOrCmd && !isShift && !isAlt && event.key === 'ArrowDown') ||
            (isCtrlOrCmd && !isShift && !isAlt && event.key.toLowerCase() === 'j')
          ) {
            event.preventDefault()
            const cols = layoutMode === 'list' ? 1 : getColumnCount()
            const downIndex = Math.min(filteredAssets.length - 1, activeIndex + cols)
            setSelectedAssetIds([filteredAssets[downIndex].id])
          }
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [
    selectedAssetIds,
    assets,
    activeTab,
    deleteAssetPhysical,
    moveToTrash,
    restoreFromTrash,
    updateAssetTags,
    setRightSidebarOpen,
    setSelectedAssetIds,
    filteredAssets,
    layoutMode,
    folders,
    boards,
    addAssetsToBoard,
    removeAssetFromBoard,
    moveAssetsToFolder,
    activeFolderId,
    importFiles,
    saveAsset
  ])

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        const activeEl = document.activeElement
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.getAttribute('contenteditable') === 'true')
        ) {
          return
        }
        event.preventDefault()
        const allIds = filteredAssets.map((asset) => asset.id)
        setSelectedAssetIds(allIds)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [filteredAssets, setSelectedAssetIds])

  const visibleFolders = useMemo(() => {
    // 如果没有开启文件夹置顶，我们在主内容网格中隐藏文件夹，只在侧边栏查看
    if (!foldersOnTop) return []

    // 当用户进行任何搜索或高级筛选时，列表里就不展示文件夹，只展示筛选到的文件
    if (
      searchQuery.trim() ||
      filterKeyword.trim() ||
      filterColor ||
      filterFolderId ||
      filterTagId ||
      filterFileType ||
      filterShape ||
      filterRating !== null
    ) {
      return []
    }

    if (activeTab === 'all') return folders.filter((folder) => !folder.parentId)
    if (activeTab === 'folder' && activeFolderId) {
      return folders.filter((folder) => folder.parentId === activeFolderId)
    }
    return []
  }, [
    activeTab,
    activeFolderId,
    folders,
    searchQuery,
    foldersOnTop,
    filterKeyword,
    filterColor,
    filterFolderId,
    filterTagId,
    filterFileType,
    filterShape,
    filterRating
  ])

  useEffect(() => {
    const handleOutsideClick = () => {
      setContextMenu(null)
      setFolderContextMenu(null)
      setBlankContextMenu(null)
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  const thumbSize = settings?.thumbnailSize || 180

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault()
    const filePaths = Array.from(event.dataTransfer.files)
      .map((file) => (file as File & { path?: string }).path)
      .filter((path): path is string => Boolean(path))

    if (filePaths.length > 0) {
      await importFiles(filePaths, activeFolderId || '')
    }
  }

  const handleAssetClick = (event: React.MouseEvent, clickedId: string) => {
    event.stopPropagation()
    setContextMenu(null)
    setEditingAssetId(null)

    if (event.ctrlKey || event.metaKey) {
      setSelectedAssetIds(
        selectedAssetIds.includes(clickedId)
          ? selectedAssetIds.filter((id) => id !== clickedId)
          : [...selectedAssetIds, clickedId]
      )
      return
    }

    if (event.shiftKey && selectedAssetIds.length > 0) {
      const lastSelectedId = selectedAssetIds[selectedAssetIds.length - 1]
      const lastIndex = filteredAssets.findIndex((asset) => asset.id === lastSelectedId)
      const currentIndex = filteredAssets.findIndex((asset) => asset.id === clickedId)

      if (lastIndex >= 0 && currentIndex >= 0) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        const rangeIds = filteredAssets.slice(start, end + 1).map((asset) => asset.id)
        setSelectedAssetIds(Array.from(new Set([...selectedAssetIds, ...rangeIds])))
      }
      return
    }

    setSelectedAssetIds([clickedId])
  }

  const handleContextMenu = (event: React.MouseEvent, assetId: string) => {
    event.preventDefault()
    event.stopPropagation()

    if (!selectedAssetIds.includes(assetId)) {
      setSelectedAssetIds([assetId])
    }

    setContextMenu({ x: event.clientX, y: event.clientY, assetId })
    setFolderContextMenu(null)
    setBlankContextMenu(null)
  }

  const handleOpenFolder = (folderId: string) => {
    setActiveFolderId(folderId)
    setActiveTab('folder')
    setSelectedAssetIds([])
    setRightSidebarOpen(true)
    setFolderContextMenu(null)
    setBlankContextMenu(null)
  }

  const handleFolderContextMenu = (event: React.MouseEvent, folderId: string) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedAssetIds([])
    setContextMenu(null)
    setRightSidebarOpen(true)
    setActiveFolderId(folderId)
    setActiveTab('folder')
    setFolderContextMenu({ x: event.clientX, y: event.clientY, folderId })
    setBlankContextMenu(null)
  }

  const handleBlankContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    setSelectedAssetIds([])
    setContextMenu(null)
    setFolderContextMenu(null)
    setBlankContextMenu({ x: event.clientX, y: event.clientY })
  }

  const handleRenameFolder = async (folderId: string) => {
    const folder = folders.find((item) => item.id === folderId)
    if (!folder) return

    const nextName = window.prompt('请输入新的文件夹名称:', folder.name)
    if (nextName?.trim() && nextName.trim() !== folder.name) {
      await renameFolder(folderId, nextName.trim())
    }
    setFolderContextMenu(null)
  }

  const handleCreateSubFolder = async (folderId: string) => {
    const name = window.prompt('请输入子文件夹名称:')
    if (name?.trim()) {
      await createFolder(name.trim(), folderId)
    }
    setFolderContextMenu(null)
  }

  const handleImportToFolder = async (folderId: string) => {
    const paths = await window.api.pickDialog({
      title: '导入到文件夹',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
    })
    if (paths?.length) {
      await importFiles(paths, folderId)
    }
    setFolderContextMenu(null)
  }

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find((item) => item.id === folderId)
    if (!folder) return

    if (window.confirm(`确定删除文件夹「${folder.name}」吗? 文件夹内的素材不会被物理删除。`)) {
      await deleteFolder(folderId)
    }
    setFolderContextMenu(null)
  }

  const handleCreateFolderHere = () => {
    const parentId = activeTab === 'folder' && activeFolderId ? activeFolderId : undefined
    setLeftSidebarOpen(true)
    setCreatingFolderParentId(parentId || 'root')
    setNewFolderName('未命名文件夹')
    setBlankContextMenu(null)
  }

  const handleImportHere = async () => {
    const paths = await window.api.pickDialog({
      title: '导入文件',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
    })
    if (paths?.length) {
      await importFiles(paths, activeTab === 'folder' ? activeFolderId || '' : '')
    }
    setBlankContextMenu(null)
  }

  const handleOpenCurrentLocation = async () => {
    const targetFolderId = activeTab === 'folder' ? activeFolderId : ''
    const firstAsset = assets.find(
      (asset) =>
        !asset.isDeleted && (targetFolderId ? asset.folderId === targetFolderId : !asset.folderId)
    )

    if (firstAsset) {
      await window.api.openPath(firstAsset.filePath)
    } else if (settings?.libraryPath) {
      await window.api.openPath(settings.libraryPath)
    } else {
      alert('当前目录暂无可定位的本地文件。')
    }
    setBlankContextMenu(null)
  }

  const getActionIds = () => {
    if (selectedAssetIds.length > 0) return selectedAssetIds
    return contextMenu?.assetId ? [contextMenu.assetId] : []
  }

  const handleMoveToFolder = async (folderId: string) => {
    for (const id of getActionIds()) {
      const asset = assets.find((item) => item.id === id)
      if (asset) {
        await saveAsset({ ...asset, folderId, updatedAt: new Date().toISOString() })
      }
    }
    setContextMenu(null)
  }

  const handleAddToBoard = async (boardId: string) => {
    await addAssetsToBoard(boardId, getActionIds())
    setContextMenu(null)
  }

  const handleRemoveFromCurrentBoard = async () => {
    if (activeTab === 'board-detail' && activeBoardId) {
      for (const id of getActionIds()) {
        await removeAssetFromBoard(activeBoardId, id)
      }
    }
    setContextMenu(null)
  }

  const handleDeleteSelected = async () => {
    const ids = getActionIds()
    const message =
      activeTab === 'trash'
        ? '彻底删除后将无法恢复，确定物理删除选中的素材吗?'
        : '确定将选中的素材移入废纸篓吗?'

    if (window.confirm(message)) {
      if (activeTab !== 'trash') {
        lastDeletedAssetIdsRef.current = [...ids]
      }
      for (const id of ids) {
        if (activeTab === 'trash') {
          await deleteAssetPhysical(id)
        } else {
          await moveToTrash(id)
        }
      }
    }
    setContextMenu(null)
  }

  const handleRestoreSelected = async () => {
    for (const id of getActionIds()) {
      await restoreFromTrash(id)
    }
    setContextMenu(null)
  }

  const handleRevealFile = async () => {
    const asset = assets.find((item) => item.id === contextMenu?.assetId)
    if (asset) {
      await window.api.openPath(asset.filePath)
    }
    setContextMenu(null)
  }

  const viewTitle = useMemo(() => {
    if (activeTab === 'all') return '全部文件'
    if (activeTab === 'pending') return '待整理文件'
    if (activeTab === 'duplicates') return '重复文件'
    if (activeTab === 'trash') return '废纸篓'
    if (activeTab === 'tags') return '全部标签'
    if (activeTab === 'folder' && activeFolderId) {
      return folders.find((folder) => folder.id === activeFolderId)?.name || '未命名文件夹'
    }
    return '全部文件'
  }, [activeTab, activeFolderId, folders])

  const viewHint = searchQuery.trim() ? `搜索: ${searchQuery.trim()}` : '无筛选规则'
  const totalVisibleItems = visibleFolders.length + filteredAssets.length

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => {
        if (hasDraggedRef.current) {
          hasDraggedRef.current = false
          return
        }
        setSelectedAssetIds([])
        setEditingAssetId(null)
        setContextMenu(null)
        setFolderContextMenu(null)
        setBlankContextMenu(null)
      }}
      onContextMenu={handleBlankContextMenu}
      className={clsx("relative min-h-0 flex-1 overflow-y-auto bg-white px-20 py-7 transition-all duration-200", isGrayscale && "grayscale")}
    >
      {activeTab !== 'board-detail' && activeTab !== 'settings' && (
        <div className="mb-9">
          <h1 className="text-[28px] font-semibold tracking-tight text-black">{viewTitle}</h1>
          <p className="mt-2 text-[13px] text-gray-500">
            {filteredAssets.length} 文件
            {visibleFolders.length > 0 ? ` · ${visibleFolders.length} 文件夹` : ''}
          </p>
          <p className="mt-4 text-[12px] text-gray-400">{viewHint}</p>
        </div>
      )}

      {totalVisibleItems === 0 ? (
        <div className="flex h-[420px] flex-col items-center justify-center text-center text-gray-400">
          <FolderUp size={34} className="mb-4 text-gray-300" />
          <h3 className="text-[14px] font-medium text-gray-700">暂无内容</h3>
          <p className="mt-2 text-[12px]">可创建文件夹，或点击顶部加号导入素材。</p>
        </div>
      ) : layoutMode === 'grid' ? (
        <div
          className="grid justify-start gap-x-12 gap-y-8"
          style={{ gridTemplateColumns: `repeat(auto-fill, ${thumbSize}px)` }}
        >
          {visibleFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              assets={assets}
              folders={folders}
              width={thumbSize}
              onOpen={() => handleOpenFolder(folder.id)}
              onContextMenu={(event) => handleFolderContextMenu(event, folder.id)}
              isDragOver={dragOverFolderId === folder.id}
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
                      await moveAssetsToFolder(assetIds, folder.id)
                    }
                  } catch (err) {
                    console.error('主网格拖拽移动素材至子文件夹失败:', err)
                  }
                  setInternalDragging(false)
                }
              }}
            />
          ))}

          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              isSelected={selectedAssetIds.includes(asset.id)}
              onClick={(event) => handleAssetClick(event, asset.id)}
              onDoubleClick={() => setViewerAsset(asset, filteredAssets)}
              onFavoriteClick={(event) => {
                event.stopPropagation()
                toggleFavorite(asset.id)
              }}
              onContextMenu={(event) => handleContextMenu(event, asset.id)}
              thumbnailSize={thumbSize}
              isEditing={editingAssetId === asset.id}
              onRename={(newName) => handleRenameAsset(asset.id, newName)}
              onCancelRename={() => setEditingAssetId(null)}
            />
          ))}
        </div>
      ) : (
        // 列表视图 (List Layout)
        <div className="w-full border border-app-border rounded-lg overflow-hidden bg-white text-[12px] text-gray-700 select-none">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-app-border text-[11px] font-bold text-gray-400 select-none">
                <th className="py-2.5 px-4 w-12 text-center">缩略图</th>
                <th className="py-2.5 px-3">文件名</th>
                <th className="py-2.5 px-3 w-28">尺寸/分辨率</th>
                <th className="py-2.5 px-3 w-20">格式</th>
                <th className="py-2.5 px-3 w-24">大小</th>
                <th className="py-2.5 px-4 w-40">导入时间</th>
              </tr>
            </thead>
            <tbody>
              {/* 文件夹行 */}
              {visibleFolders.map((folder) => (
                <tr
                  key={folder.id}
                  onDoubleClick={() => handleOpenFolder(folder.id)}
                  onContextMenu={(event) => handleFolderContextMenu(event, folder.id)}
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
                          await moveAssetsToFolder(assetIds, folder.id)
                        }
                      } catch (err) {
                        console.error('列表视图拖拽移动素材至文件夹失败:', err)
                      }
                      setInternalDragging(false)
                    }
                  }}
                  className={clsx(
                    "border-b border-gray-100 hover:bg-app-hover cursor-pointer transition-colors",
                    dragOverFolderId === folder.id && "bg-brand-100 ring-2 ring-brand-400 text-brand-700 font-semibold"
                  )}
                >
                  <td className="py-2 px-4 text-center">
                    <FolderIcon size={16} className="text-amber-500 inline-block" />
                  </td>
                  <td className="py-2 px-3 font-semibold text-gray-800" colSpan={5}>
                    {folder.name}
                  </td>
                </tr>
              ))}
              {/* 素材文件行 */}
              {filteredAssets.map((asset) => {
                const isSelected = selectedAssetIds.includes(asset.id)
                const formattedSize = (bytes: number): string => {
                  if (bytes === 0) return '0 B'
                  const unit = 1024
                  const sizes = ['B', 'KB', 'MB', 'GB']
                  const index = Math.floor(Math.log(bytes) / Math.log(unit))
                  return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(1))} ${sizes[index]}`
                }
                return (
                  <tr
                    key={asset.id}
                    onClick={(event) => handleAssetClick(event, asset.id)}
                    onDoubleClick={() => setViewerAsset(asset, filteredAssets)}
                    onContextMenu={(event) => handleContextMenu(event, asset.id)}
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
                      
                      // 提取所有被选中图片在磁盘上的本地绝对路径列表
                      const filePaths = state.assets
                        .filter((a) => dragIds.includes(a.id))
                        .map((a) => a.filePath)
                        
                      // 阻止系统默认的 HTML5 文字/网址链接拖拽，交由主进程代理原生物理文件拖拽
                      event.preventDefault()
                      window.api.startDrag(filePaths)
                    }}
                    onDragEnd={() => {
                      useAppStore.getState().setInternalDragging(false)
                    }}
                    className={`border-b border-gray-100 transition-colors cursor-pointer ${
                      isSelected ? 'bg-brand-50 hover:bg-brand-100/70 font-medium' : 'hover:bg-app-hover'
                    }`}
                  >
                    <td className="py-1.5 px-4 text-center">
                      <img
                        src={`media://${asset.thumbnailPath}`}
                        alt={asset.fileName}
                        className="w-7 h-7 object-cover rounded bg-gray-50 border border-app-border inline-block"
                        loading="lazy"
                        draggable={false}
                      />
                    </td>
                    <td className="py-1.5 px-3 max-w-xs font-semibold text-gray-800" onClick={(e) => e.stopPropagation()}>
                      {editingAssetId === asset.id ? (
                        <input
                          ref={(el) => {
                            if (el) el.focus()
                          }}
                          defaultValue={asset.fileName}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onMouseUp={(e) => e.stopPropagation()}
                          onContextMenu={(e) => e.stopPropagation()}
                          onFocus={(e) => {
                            const name = asset.fileName
                            const dotIndex = name.lastIndexOf('.')
                            if (dotIndex > 0) {
                              e.target.setSelectionRange(0, dotIndex)
                            } else {
                              e.target.select()
                            }
                          }}
                          onBlur={(e) => handleRenameAsset(asset.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameAsset(asset.id, e.currentTarget.value)
                            } else if (e.key === 'Escape') {
                              setEditingAssetId(null)
                            }
                          }}
                          className="w-full text-[12px] font-semibold text-gray-800 bg-white border border-gray-400 px-1 py-0.5 rounded outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                      ) : (
                        <div className="truncate" title={asset.fileName}>
                          {asset.fileName}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-gray-500">
                      {asset.width} x {asset.height}
                    </td>
                    <td className="py-1.5 px-3 font-bold uppercase text-gray-400">
                      {asset.fileType}
                    </td>
                    <td className="py-1.5 px-3 text-gray-600">
                      {formattedSize(asset.fileSize)}
                    </td>
                    <td className="py-1.5 px-4 text-gray-400">
                      {new Date(asset.createdAt).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {folderContextMenu && createPortal(
        (() => {
          const pos = adjustMenuPosition(folderContextMenu.x, folderContextMenu.y, 224, 240)
          return (
            <FolderContextMenu
              x={pos.left}
              y={pos.top}
              folder={folders.find((folder) => folder.id === folderContextMenu.folderId)}
              onOpen={() => handleOpenFolder(folderContextMenu.folderId)}
              onRename={() => handleRenameFolder(folderContextMenu.folderId)}
              onCreateSubFolder={() => handleCreateSubFolder(folderContextMenu.folderId)}
              onImport={() => handleImportToFolder(folderContextMenu.folderId)}
              onDelete={() => handleDeleteFolder(folderContextMenu.folderId)}
            />
          )
        })(),
        document.body
      )}

      {blankContextMenu && createPortal(
        (() => {
          const pos = adjustMenuPosition(blankContextMenu.x, blankContextMenu.y, 256, 350)
          return (
            <BlankContextMenu
              x={pos.left}
              y={pos.top}
              isLeftSidebarOpen={isLeftSidebarOpen}
              isRightSidebarOpen={isRightSidebarOpen}
              isStatusbarOpen={isStatusbarOpen}
              isAlwaysOnTop={isAlwaysOnTop}
              isFullScreen={isFullScreen}
              onOpenLocation={handleOpenCurrentLocation}
              onCreateFolder={handleCreateFolderHere}
              onImport={handleImportHere}
              onSelectAll={() => {
                const allIds = filteredAssets.map((asset) => asset.id)
                setSelectedAssetIds(allIds)
                setBlankContextMenu(null)
              }}
              onToggleLeftSidebar={() => {
                setLeftSidebarOpen(!isLeftSidebarOpen)
                setBlankContextMenu(null)
              }}
              onToggleRightSidebar={() => {
                setRightSidebarOpen(!isRightSidebarOpen)
                setBlankContextMenu(null)
              }}
              onToggleStatusbar={() => {
                setStatusbarOpen(!isStatusbarOpen)
                setBlankContextMenu(null)
              }}
              onPin={async () => {
                try {
                  const isTop = await window.api.toggleAlwaysOnTop()
                  setAlwaysOnTop(isTop)
                } catch (err) {
                  console.error('置顶窗口失败:', err)
                }
                setBlankContextMenu(null)
              }}
              onFullscreen={async () => {
                try {
                  const isFull = await window.api.toggleFullScreen()
                  setFullScreen(isFull)
                } catch (err) {
                  console.error('全屏窗口失败:', err)
                }
                setBlankContextMenu(null)
              }}
            />
          )
        })(),
        document.body
      )}

      {contextMenu && createPortal(
        (() => {
          const pos = adjustMenuPosition(contextMenu.x, contextMenu.y, 224, 720)
          return (
            <div
              style={{
                top: pos.top,
                left: pos.left
              }}
              className="fixed z-[9999] w-56 rounded-lg border border-app-border bg-white py-[3px] text-[12px] text-gray-700 shadow-xl select-none"
              onClick={(event) => event.stopPropagation()}
              onMouseLeave={() => setHoverSubmenu(null)}
              onMouseOver={handleMenuMouseOver}
            >
              {/* 在文件资源管理器中显示 */}
              <button
                type="button"
                onClick={handleRevealFile}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>在文件资源管理器中显示</span>
                <span className="text-gray-400 text-[10px] font-mono">Ctrl+Enter</span>
              </button>
              
              {/* 在新窗口中打开 */}
              <button
                type="button"
                onClick={() => {
                  const asset = assets.find((item) => item.id === contextMenu.assetId)
                  if (asset) setViewerAsset(asset, filteredAssets)
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>在新窗口中打开</span>
              </button>
              
              {/* 在默认应用中打开 */}
              <button
                type="button"
                onClick={async () => {
                  const asset = assets.find((item) => item.id === contextMenu.assetId)
                  if (asset) await window.api.openExternal(asset.filePath)
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>在默认应用中打开</span>
                <span className="text-gray-400 text-[10px] font-mono">Ctrl+O</span>
              </button>

              {/* 选择打开方式 */}
              <div
                className="submenu-trigger"
                onMouseEnter={(event) => handleMouseEnterSubmenu(event, 'open-with')}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50"
                >
                  <span>选择打开方式</span>
                  <span className="text-gray-400 text-[10px] pr-1">›</span>
                </button>
                {hoverSubmenu === 'open-with' && createPortal(
                  <div
                    style={submenuStyle}
                    className="fixed z-[10000] w-36 rounded-md border border-app-border bg-white py-1 shadow-lg animate-in fade-in duration-100"
                  >
                    <button
                      type="button"
                      onClick={async () => {
                        const asset = assets.find((item) => item.id === contextMenu.assetId)
                        if (asset) await window.api.openExternal(asset.filePath)
                        setContextMenu(null)
                      }}
                      className="w-full px-3 py-[3.5px] text-left hover:bg-app-hover text-[12px] text-gray-700"
                    >
                      系统图片查看器
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const asset = assets.find((item) => item.id === contextMenu.assetId)
                        if (asset) window.open(`media://${asset.filePath}`)
                        setContextMenu(null)
                      }}
                      className="w-full px-3 py-[3.5px] text-left hover:bg-app-hover text-[12px] text-gray-700"
                    >
                      浏览器
                    </button>
                  </div>,
                  document.body
                )}
              </div>

              {/* 打开所在文件夹 */}
              <button
                type="button"
                onClick={async () => {
                  const asset = assets.find((item) => item.id === contextMenu.assetId)
                  if (asset) {
                    await window.api.openPath(asset.filePath)
                  }
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>打开所在文件夹</span>
              </button>

              <div className="my-[3px] h-px bg-app-border" />

              {/* 重命名 */}
              <button
                type="button"
                onClick={() => {
                  setEditingAssetId(contextMenu.assetId)
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>重命名</span>
                <span className="text-gray-400 text-[10px] font-mono">F2</span>
              </button>

              {/* 复制文件 */}
              <button
                type="button"
                onClick={async () => {
                  const asset = assets.find((item) => item.id === contextMenu.assetId)
                  if (asset) {
                    await navigator.clipboard.writeText(asset.filePath)
                    alert('物理文件路径已复制到剪切板')
                  }
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>复制文件</span>
                <span className="text-gray-400 text-[10px] font-mono">Ctrl+C</span>
              </button>

              {/* 复制图片 */}
              <button
                type="button"
                onClick={async () => {
                  const asset = assets.find((item) => item.id === contextMenu.assetId)
                  if (asset) {
                    const success = await window.api.copyImage(asset.filePath)
                    if (success) {
                      alert('图片已成功复制到剪切板')
                    } else {
                      alert('图片复制失败')
                    }
                  }
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>复制图片</span>
                <span className="text-gray-400 text-[10px] font-mono">Alt+Ctrl+C</span>
              </button>

              {/* 复制文件路径 */}
              <button
                type="button"
                onClick={async () => {
                  const asset = assets.find((item) => item.id === contextMenu.assetId)
                  if (asset) {
                    await navigator.clipboard.writeText(asset.filePath)
                  }
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>复制文件路径</span>
              </button>

              {/* 复制 URL */}
              <button
                type="button"
                onClick={async () => {
                  const asset = assets.find((item) => item.id === contextMenu.assetId)
                  if (asset && asset.sourceUrl) {
                    await navigator.clipboard.writeText(asset.sourceUrl)
                  } else {
                    alert('暂无来源网址')
                  }
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>复制 URL</span>
              </button>

              {/* 复制... */}
              <div
                className="submenu-trigger"
                onMouseEnter={(event) => handleMouseEnterSubmenu(event, 'copy-more')}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50"
                >
                  <span>复制...</span>
                  <span className="text-gray-400 text-[10px] pr-1">›</span>
                </button>
                {hoverSubmenu === 'copy-more' && createPortal(
                  <div
                    style={submenuStyle}
                    className="fixed z-[10000] w-36 rounded-md border border-app-border bg-white py-1 shadow-lg animate-in fade-in duration-100"
                  >
                    <button
                      type="button"
                      onClick={async () => {
                        const asset = assets.find((item) => item.id === contextMenu.assetId)
                        if (asset) await navigator.clipboard.writeText(asset.fileName)
                        setContextMenu(null)
                      }}
                      className="w-full px-3 py-[3.5px] text-left hover:bg-app-hover text-[12px] text-gray-700"
                    >
                      复制文件名
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const asset = assets.find((item) => item.id === contextMenu.assetId)
                        if (asset) {
                          const tagsText = asset.tags
                            .map((tId) => tags.find((t) => t.id === tId)?.name)
                            .filter(Boolean)
                            .join(', ')
                          await navigator.clipboard.writeText(tagsText)
                        }
                        setContextMenu(null)
                      }}
                      className="w-full px-3 py-[3.5px] text-left hover:bg-app-hover text-[12px] text-gray-700"
                    >
                      复制所有标签
                    </button>
                  </div>,
                  document.body
                )}
              </div>

              <div className="my-[3px] h-px bg-app-border" />

              {/* 移动到文件夹... */}
              {activeTab !== 'trash' && (
                <div
                  className="submenu-trigger"
                  onMouseEnter={(event) => handleMouseEnterSubmenu(event, 'folder')}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50"
                  >
                    <span className="flex items-center gap-2">
                      <FolderSync size={13} className="text-brand-500" />
                      移动到文件夹...
                    </span>
                    <span className="text-gray-400 text-[10px] pr-1">F ›</span>
                  </button>
                  {hoverSubmenu === 'folder' && createPortal(
                    <div
                      style={submenuStyle}
                      className="fixed z-[10000] max-h-56 w-44 overflow-y-auto rounded-md border border-app-border bg-white py-1 shadow-lg menu-scrollbar animate-in fade-in duration-100"
                    >
                      <button
                        type="button"
                        onClick={() => handleMoveToFolder('')}
                        className="w-full px-3 py-[3.5px] text-left hover:bg-app-hover text-[12px] text-gray-700"
                      >
                        / 全部文件
                      </button>
                      {folders.map((folder) => (
                        <button
                          type="button"
                          key={folder.id}
                          onClick={() => handleMoveToFolder(folder.id)}
                          className="w-full truncate px-3 py-[3.5px] text-left hover:bg-app-hover text-[12px] text-gray-700"
                          title={folder.name}
                        >
                          {folder.name}
                        </button>
                      ))}
                    </div>,
                    document.body
                  )}
                </div>
              )}

              {/* 添加至看板... */}
              {activeTab !== 'trash' && (
                <div
                  className="submenu-trigger"
                  onMouseEnter={(event) => handleMouseEnterSubmenu(event, 'board')}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50"
                  >
                    <span className="flex items-center gap-2">
                      <FolderHeart size={13} className="text-brand-500" />
                      添加到看板...
                    </span>
                    <span className="text-gray-400 text-[10px] pr-1">B ›</span>
                  </button>
                  {hoverSubmenu === 'board' && createPortal(
                    <div
                      style={submenuStyle}
                      className="fixed z-[10000] max-h-56 w-44 overflow-y-auto rounded-md border border-app-border bg-white py-1 shadow-lg animate-in fade-in duration-100"
                    >
                      {boards.length === 0 ? (
                        <span className="block px-3 py-[3.5px] text-[11px] text-gray-400">暂无看板</span>
                      ) : (
                        boards.map((board) => (
                          <button
                            type="button"
                            key={board.id}
                            onClick={() => handleAddToBoard(board.id)}
                            className="w-full truncate px-3 py-[3.5px] text-left hover:bg-app-hover text-[12px] text-gray-700"
                            title={board.name}
                          >
                            {board.name}
                          </button>
                        ))
                      )}
                    </div>,
                    document.body
                  )}
                </div>
              )}

              {/* 另存为... */}
              <button
                type="button"
                onClick={async () => {
                  const asset = assets.find((item) => item.id === contextMenu.assetId)
                  if (asset) {
                    const success = await window.api.saveCopy(asset.filePath, asset.fileName)
                    if (success) {
                      alert('另存为导出成功！')
                    }
                  }
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>另存为...</span>
              </button>

              <div className="my-[3px] h-px bg-app-border" />

              {/* 添加标签 */}
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null)
                  setRightSidebarOpen(true)
                  setTimeout(() => {
                    const el = document.querySelector('input[placeholder="添加标签..."]') as HTMLInputElement
                    if (el) el.focus()
                  }, 150)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>添加标签</span>
                <span className="text-gray-400 text-[10px] font-mono">T</span>
              </button>

              {/* 复制与粘贴标签 */}
              <button
                type="button"
                onClick={async () => {
                  const asset = assets.find((item) => item.id === contextMenu.assetId)
                  if (asset) {
                    const tagsText = JSON.stringify(asset.tags)
                    await navigator.clipboard.writeText(tagsText)
                    alert('已复制素材标签')
                  }
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>复制标签</span>
                <span className="text-gray-400 text-[10px] font-mono">Ctrl+Shift+C</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText()
                    const tagIds = JSON.parse(text)
                    if (Array.isArray(tagIds)) {
                      await updateAssetTags(contextMenu.assetId, tagIds)
                      alert('已粘贴素材标签')
                    } else {
                      alert('剪切板中没有有效的标签数据')
                    }
                  } catch (e) {
                    alert('粘贴标签失败')
                  }
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>粘贴标签</span>
                <span className="text-gray-400 text-[10px] font-mono">Ctrl+Shift+V</span>
              </button>

              <div className="my-[3px] h-px bg-app-border" />

              {/* 缩略图 */}
              <div
                className="submenu-trigger"
                onMouseEnter={(event) => handleMouseEnterSubmenu(event, 'thumbnail')}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50"
                >
                  <span>缩略图</span>
                  <span className="text-gray-400 text-[10px] pr-1">›</span>
                </button>
                {hoverSubmenu === 'thumbnail' && createPortal(
                  <div
                    style={submenuStyle}
                    className="fixed z-[10000] w-40 rounded-md border border-app-border bg-white py-1 shadow-lg animate-in fade-in duration-100"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        alert('正在重新生成缩略图...')
                        setContextMenu(null)
                      }}
                      className="w-full px-3 py-[3.5px] text-left hover:bg-app-hover text-[12px] text-gray-700"
                    >
                      重新生成缩略图
                    </button>
                  </div>,
                  document.body
                )}
              </div>

              {/* 设为文件夹封面 */}
              <button
                type="button"
                onClick={() => {
                  alert('已设为文件夹封面')
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>设为文件夹封面</span>
              </button>

              <div className="my-[3px] h-px bg-app-border" />

              {/* 灰度预览 (全局) */}
              <button
                type="button"
                onClick={() => {
                  setGrayscale(!isGrayscale)
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="flex items-center gap-1.5">
                  <span className={clsx("w-1.5 h-1.5 rounded-full", isGrayscale ? "bg-brand-500" : "bg-transparent")} />
                  <span>灰度预览 (全局)</span>
                </span>
              </button>

              <div className="my-[3px] h-px bg-app-border" />

              {/* 同步 */}
              <div
                className="submenu-trigger"
                onMouseEnter={(event) => handleMouseEnterSubmenu(event, 'sync')}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-[3.5px] text-left hover:bg-brand-50"
                >
                  <span>同步</span>
                  <span className="text-gray-400 text-[10px] pr-1">›</span>
                </button>
                {hoverSubmenu === 'sync' && createPortal(
                  <div
                    style={submenuStyle}
                    className="fixed z-[10000] w-32 rounded-md border border-app-border bg-white py-1 shadow-lg animate-in fade-in duration-100"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        alert('数据同步已启动')
                        setContextMenu(null)
                      }}
                      className="w-full px-3 py-[3.5px] text-left hover:bg-app-hover text-[12px] text-gray-700"
                    >
                      立即同步
                    </button>
                  </div>,
                  document.body
                )}
              </div>

              <div className="my-1 h-px bg-app-border" />

              {/* 隐藏 */}
              <button
                type="button"
                onClick={() => {
                  alert('图片已从当前视图隐藏')
                  setContextMenu(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-brand-50 hover:text-brand-700"
              >
                <span>隐藏</span>
              </button>

              <div className="my-1 h-px bg-app-border" />

              {/* 看板移出操作 */}
              {activeTab === 'board-detail' && (
                <>
                  <button
                    type="button"
                    onClick={handleRemoveFromCurrentBoard}
                    className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                  >
                    从当前看板移出
                  </button>
                  <div className="my-1 h-px bg-app-border" />
                </>
              )}

              {/* 废纸篓操作 */}
              {activeTab === 'trash' ? (
                <>
                  <button
                    type="button"
                    onClick={handleRestoreSelected}
                    className="w-full px-3 py-1.5 text-left text-emerald-600 hover:bg-emerald-50"
                  >
                    还原素材
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                  >
                    <span>彻底删除</span>
                    <span className="text-gray-400 text-[10px] font-mono">Del</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                >
                  <span>移动到废纸篓</span>
                  <span className="text-gray-400 text-[10px] font-mono">Del</span>
                </button>
              )}
            </div>
          )
        })(),
        document.body
      )}

      {/* 拖拽框选的渲染层 */}
      {selectionBox.visible && (() => {
        if (!containerRef.current) return null
        const rect = containerRef.current.getBoundingClientRect()
        const scrollLeft = containerRef.current.scrollLeft
        const scrollTop = containerRef.current.scrollTop

        const left = Math.min(selectionBox.startX, selectionBox.currentX) - rect.left + scrollLeft
        const top = Math.min(selectionBox.startY, selectionBox.currentY) - rect.top + scrollTop
        const width = Math.abs(selectionBox.startX - selectionBox.currentX)
        const height = Math.abs(selectionBox.startY - selectionBox.currentY)

        return (
          <div
            style={{ left, top, width, height }}
            className="absolute border border-brand-400 bg-brand-500/10 pointer-events-none z-[99] rounded-sm"
          />
        )
      })()}
    </div>
  )
}

function getDescendantFolderIds(folderId: string, folders: Folder[]): string[] {
  const children = folders.filter((folder) => folder.parentId === folderId)
  return children.flatMap((folder) => [folder.id, ...getDescendantFolderIds(folder.id, folders)])
}

const FolderCard: React.FC<{
  folder: Folder
  folders: Folder[]
  assets: Asset[]
  width: number
  onOpen: () => void
  onContextMenu: (event: React.MouseEvent) => void
  isDragOver: boolean
  onDragOver: (event: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (event: React.DragEvent) => void
}> = ({
  folder,
  folders,
  assets,
  width,
  onOpen,
  onContextMenu,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const childFolderIds = getDescendantFolderIds(folder.id, folders)
  const folderIds = [folder.id, ...childFolderIds]
  const folderAssets = assets.filter(
    (asset) => !asset.isDeleted && folderIds.includes(asset.folderId)
  )
  const previewAssets = folderAssets.slice(0, 3)

  return (
    <button
      type="button"
      onClick={onOpen}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={clsx(
        "group rounded-md p-1.5 text-center transition-all duration-150 hover:bg-app-hover",
        isDragOver && "bg-brand-100 ring-2 ring-brand-400 scale-[1.02] text-brand-700 font-semibold"
      )}
      style={{ width }}
    >
      <div className="relative mx-auto h-[88px] w-full overflow-hidden rounded-md bg-[#E6E4F4]">
        <div className="absolute left-0 top-0 h-5 w-16 rounded-br-md bg-[#D9D7EE]" />
        <div className="absolute inset-x-1.5 bottom-1.5 top-4 overflow-hidden rounded bg-[#F4F5F7] shadow-sm">
          {previewAssets.length > 0 ? (
            <div className="grid h-full grid-cols-3 gap-0.5 p-1">
              {previewAssets.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded bg-white">
                  <img
                    src={`media://${asset.thumbnailPath}`}
                    alt={asset.fileName}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-[#B7B4D5]">
              <FolderIcon size={34} strokeWidth={1.5} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 truncate text-[12px] text-gray-700" title={folder.name}>
        {folder.name}
      </div>
      <div className="mt-0.5 text-[11px] text-gray-400">{folderAssets.length} 文件</div>
    </button>
  )
}

const FolderContextMenu: React.FC<{
  x: number
  y: number
  folder?: Folder
  onOpen: () => void
  onRename: () => void
  onCreateSubFolder: () => void
  onImport: () => void
  onDelete: () => void
}> = ({ x, y, folder, onOpen, onRename, onCreateSubFolder, onImport, onDelete }) => {
  if (!folder) return null

  return (
    <div
      style={{ top: y, left: x }}
      className="fixed z-[9999] w-56 max-h-[calc(100vh-20px)] overflow-y-auto rounded-lg border border-app-border bg-white py-1 text-[12px] text-gray-700 shadow-xl menu-scrollbar"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="px-3 py-2 text-[11px] font-medium text-gray-400">{folder.name}</div>
      <button
        type="button"
        onClick={onOpen}
        className="w-full px-3 py-2 text-left hover:bg-brand-50"
      >
        打开
      </button>
      <button
        type="button"
        onClick={onRename}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-brand-50"
      >
        <Pencil size={13} />
        重命名
      </button>
      <button
        type="button"
        onClick={onCreateSubFolder}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-brand-50"
      >
        <FolderPlus size={13} />
        创建子文件夹
      </button>
      <button
        type="button"
        onClick={onImport}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-brand-50"
      >
        <Import size={13} />
        导入文件
      </button>
      <div className="my-1 h-px bg-app-border" />
      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
      >
        <Trash2 size={13} />
        删除文件夹
      </button>
    </div>
  )
}

const BlankContextMenu: React.FC<{
  x: number
  y: number
  isLeftSidebarOpen: boolean
  isRightSidebarOpen: boolean
  isStatusbarOpen: boolean
  isAlwaysOnTop: boolean
  isFullScreen: boolean
  onOpenLocation: () => void
  onCreateFolder: () => void
  onImport: () => void
  onSelectAll: () => void
  onToggleLeftSidebar: () => void
  onToggleRightSidebar: () => void
  onToggleStatusbar: () => void
  onPin: () => void
  onFullscreen: () => void
}> = ({
  x,
  y,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  isStatusbarOpen,
  isAlwaysOnTop,
  isFullScreen,
  onOpenLocation,
  onCreateFolder,
  onImport,
  onSelectAll,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onToggleStatusbar,
  onPin,
  onFullscreen
}) => {
  return (
    <div
      style={{ top: y, left: x }}
      className="fixed z-[9999] w-64 max-h-[calc(100vh-20px)] overflow-y-auto rounded-lg border border-app-border bg-white py-2 text-[12px] text-gray-700 shadow-xl menu-scrollbar"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onSelectAll}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-brand-50"
      >
        <span>全选</span>
        <span className="text-[11px] text-gray-400">Ctrl+A</span>
      </button>
      <div className="my-1 h-px bg-app-border" />
      <button
        type="button"
        onClick={onOpenLocation}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-brand-50"
      >
        <span>在文件资源管理器中打开</span>
        <span className="text-[11px] text-gray-400">Ctrl+Enter</span>
      </button>
      <div className="my-1 h-px bg-app-border" />
      <button
        type="button"
        onClick={onCreateFolder}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-brand-50"
      >
        <FolderPlus size={13} className="text-brand-500" />
        创建文件夹
      </button>
      <button
        type="button"
        onClick={onImport}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-brand-50"
      >
        <Import size={13} className="text-brand-500" />
        导入文件
      </button>
      <div className="my-1 h-px bg-app-border" />
      <button
        type="button"
        onClick={onToggleLeftSidebar}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50"
      >
        <span className="flex w-4 justify-center">
          {isLeftSidebarOpen ? <Check size={14} /> : null}
        </span>
        显示左侧栏
      </button>
      <button
        type="button"
        onClick={onToggleRightSidebar}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50"
      >
        <span className="flex w-4 justify-center">
          {isRightSidebarOpen ? <Check size={14} /> : null}
        </span>
        显示右侧栏
      </button>
      <button
        type="button"
        onClick={onToggleStatusbar}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50"
      >
        <span className="flex w-4 justify-center">
          {isStatusbarOpen ? <Check size={14} /> : null}
        </span>
        显示状态栏
      </button>
      <div className="my-1 h-px bg-app-border" />
      <button
        type="button"
        onClick={onPin}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-brand-50"
      >
        <span className="flex items-center gap-2">
          <Pin size={13} />
          置顶
        </span>
        <span className="flex w-4 justify-center">
          {isAlwaysOnTop ? <Check size={14} /> : null}
        </span>
      </button>
      <button
        type="button"
        onClick={onFullscreen}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-brand-50"
      >
        <span>全屏</span>
        <span className="flex w-4 justify-center">
          {isFullScreen ? <Check size={14} /> : null}
        </span>
      </button>
    </div>
  )
}
