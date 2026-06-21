import { create } from 'zustand'
import { Asset, Folder, Tag, Board, Settings } from '../../../shared/types'

export type ActiveTab =
  | 'all'
  | 'pending'
  | 'tags'
  | 'trash'
  | 'duplicates'
  | 'boards'
  | 'scene'
  | 'settings'
  | 'folder'
  | 'board-detail'
  | 'viewer'

interface AppState {
  // 核心数据
  assets: Asset[]
  folders: Folder[]
  tags: Tag[]
  boards: Board[]
  settings: Settings | null

  // UI 交互状态
  activeTab: ActiveTab
  activeFolderId: string | null
  activeBoardId: string | null
  selectedAssetIds: string[]
  searchQuery: string
  sortKey: 'createdAt' | 'fileName' | 'fileSize' | 'width' | 'height'
  sortOrder: 'asc' | 'desc'
  isRightSidebarOpen: boolean
  isInternalDragging: boolean
  setInternalDragging: (isDragging: boolean) => void

  // 全局交互状态
  creatingFolderParentId: string | null
  newFolderName: string
  isLeftSidebarOpen: boolean
  isStatusbarOpen: boolean
  isAlwaysOnTop: boolean
  isFullScreen: boolean
  isGrayscale: boolean

  // 批量分析状态
  isAnalyzingBatch: boolean
  batchProgress: {
    total: number
    done: number
    failed: number
    currentName: string
  }

  // 初始化方法
  initData: () => Promise<void>

  // 配置操作
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>

  // 素材操作
  importFiles: (filePaths: string[], folderId?: string) => Promise<void>
  importFileData: (arrayBuffer: ArrayBuffer, fileName: string, folderId?: string) => Promise<void>
  saveAsset: (asset: Asset) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  moveToTrash: (id: string) => Promise<void>
  restoreFromTrash: (id: string) => Promise<void>
  deleteAssetPhysical: (id: string) => Promise<void>
  setSelectedAssetIds: (ids: string[]) => void
  updateAssetTags: (assetId: string, tagIds: string[]) => Promise<void>
  moveAssetsToFolder: (assetIds: string[], folderId: string) => Promise<void>

  // 文件夹操作
  createFolder: (name: string, parentId?: string) => Promise<void>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>

  // 标签操作
  createTag: (name: string, color?: string) => Promise<void>
  deleteTag: (id: string) => Promise<void>

  // 看板操作
  createBoard: (name: string, description?: string) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
  addAssetsToBoard: (boardId: string, assetIds: string[], note?: string) => Promise<void>
  removeAssetFromBoard: (boardId: string, assetId: string) => Promise<void>
  updateBoardAssetNote: (boardId: string, assetId: string, note: string) => Promise<void>

  // AI 单图识别
  analyzeImage: (assetId: string, customUsage?: string) => Promise<void>
  // AI 批量识别
  analyzeBatchImages: (assetIds: string[]) => Promise<void>
  cancelBatchAnalysis: () => void

  // 导航辅助
  setActiveTab: (tab: ActiveTab) => void
  setActiveFolderId: (id: string | null) => void
  setActiveBoardId: (id: string | null) => void
  setSearchQuery: (query: string) => void
  setSortKey: (key: AppState['sortKey']) => void
  setSortOrder: (order: AppState['sortOrder']) => void
  setRightSidebarOpen: (isOpen: boolean) => void
  setCreatingFolderParentId: (id: string | null) => void
  setNewFolderName: (name: string) => void
  setLeftSidebarOpen: (isOpen: boolean) => void
  setStatusbarOpen: (isOpen: boolean) => void
  setAlwaysOnTop: (isTop: boolean) => void
  setFullScreen: (isFull: boolean) => void
  setGrayscale: (isGray: boolean) => void

  // 扩展布局与过滤选项状态
  layoutMode: 'grid' | 'list'
  foldersOnTop: boolean
  showSubfolderContents: boolean
  showFileSize: boolean
  showResolution: boolean
  isFilterBarOpen: boolean
  isSearchOverlayOpen: boolean
  isPreferencesModalOpen: boolean

  // 过滤选项字段
  filterColor: string | null
  filterKeyword: string
  filterFolderId: string | null
  filterTagId: string | null
  filterFileType: string | null
  filterShape: 'horizontal' | 'vertical' | 'square' | null
  filterRating: number | null

  // 扩展布局与过滤选项方法
  setLayoutMode: (mode: 'grid' | 'list') => void
  setFoldersOnTop: (val: boolean) => void
  setShowSubfolderContents: (val: boolean) => void
  setShowFileSize: (val: boolean) => void
  setShowResolution: (val: boolean) => void
  setFilterBarOpen: (val: boolean) => void
  setSearchOverlayOpen: (val: boolean) => void
  setPreferencesModalOpen: (val: boolean) => void

  // 过滤设定 Setter
  setFilterColor: (color: string | null) => void
  setFilterKeyword: (kw: string) => void
  setFilterFolderId: (id: string | null) => void
  setFilterTagId: (id: string | null) => void
  setFilterFileType: (type: string | null) => void
  setFilterShape: (shape: 'horizontal' | 'vertical' | 'square' | null) => void
  setFilterRating: (rating: number | null) => void
  resetFilters: () => void

  // 图片查看器相关状态与方法
  activeViewerAsset: Asset | null
  viewerPlaylist: Asset[]
  previousTab: ActiveTab | null
  setViewerAsset: (asset: Asset | null, playlist?: Asset[]) => void
}

let batchCancelled = false

export const useAppStore = create<AppState>((set, get) => ({
  assets: [],
  folders: [],
  tags: [],
  boards: [],
  settings: null,

  activeTab: 'all',
  activeFolderId: null,
  activeBoardId: null,
  selectedAssetIds: [],
  searchQuery: '',
  sortKey: 'createdAt',
  sortOrder: 'desc',
  isRightSidebarOpen: false,
  isInternalDragging: false,

  // 图片查看器相关状态初值
  activeViewerAsset: null,
  viewerPlaylist: [],
  previousTab: null,

  creatingFolderParentId: null,
  newFolderName: '',
  isLeftSidebarOpen: true,
  isStatusbarOpen: true,
  isAlwaysOnTop: false,
  isFullScreen: false,
  isGrayscale: false,

  // 扩展状态初值
  layoutMode: 'grid',
  foldersOnTop: true,
  showSubfolderContents: false,
  showFileSize: true,
  showResolution: true,
  isFilterBarOpen: false,
  isSearchOverlayOpen: false,
  isPreferencesModalOpen: false,

  filterColor: null,
  filterKeyword: '',
  filterFolderId: null,
  filterTagId: null,
  filterFileType: null,
  filterShape: null,
  filterRating: null,

  isAnalyzingBatch: false,
  batchProgress: { total: 0, done: 0, failed: 0, currentName: '' },

  initData: async () => {
    try {
      const settings = await window.api.getSettings()
      const assets = await window.api.getAssets()
      const folders = await window.api.getFolders()
      const tags = await window.api.getTags()
      const boards = await window.api.getBoards()

      let isTop = false
      let isFull = false
      try {
        isTop = await window.api.isAlwaysOnTop()
        isFull = await window.api.isFullScreen()
      } catch (err) {
        // ignore
      }

      set({
        settings,
        assets,
        folders,
        tags,
        boards,
        isAlwaysOnTop: isTop,
        isFullScreen: isFull
      })
    } catch (e) {
      console.error('初始化数据失败:', e)
    }
  },

  updateSettings: async (newSettings) => {
    // 同步更新 Zustand 状态，以保证 UI 的即时流畅响应
    const currentSettings = get().settings || {
      apiBaseUrl: '',
      apiKey: '',
      visionModel: '',
      textModel: '',
      libraryPath: '',
      autoAnalyze: false,
      theme: 'system' as const,
      thumbnailSize: 180
    }
    const updatedSettings: Settings = { ...currentSettings, ...newSettings }
    set({ settings: updatedSettings })

    try {
      await window.api.saveSettings(newSettings)
    } catch (e) {
      console.error('保存配置失败:', e)
    }
  },

  importFiles: async (filePaths, folderId = '') => {
    try {
      const imported = await window.api.importFiles(filePaths, folderId)
      if (imported.length > 0) {
        const assets = await window.api.getAssets()
        set({ assets })

        // 如果开启了自动分析，自动触发批量分析
        if (get().settings?.autoAnalyze) {
          const ids = imported.map((a) => a.id)
          get().analyzeBatchImages(ids)
        }
      }
    } catch (e) {
      console.error('导入文件失败:', e)
    }
  },

  importFileData: async (arrayBuffer, fileName, folderId = '') => {
    try {
      const imported = await window.api.importFileData(arrayBuffer, fileName, folderId)
      if (imported) {
        const assets = await window.api.getAssets()
        set({ assets })

        // 如果开启了自动分析，自动触发批量分析
        if (get().settings?.autoAnalyze) {
          get().analyzeBatchImages([imported.id])
        }
      }
    } catch (e) {
      console.error('导入文件数据失败:', e)
    }
  },

  saveAsset: async (asset) => {
    try {
      await window.api.saveAsset(asset)
      const assets = await window.api.getAssets()
      set({ assets })
    } catch (e) {
      console.error('更新素材信息失败:', e)
    }
  },

  toggleFavorite: async (id) => {
    const assets = get().assets
    const idx = assets.findIndex((a) => a.id === id)
    if (idx >= 0) {
      const updated = {
        ...assets[idx],
        isFavorite: !assets[idx].isFavorite,
        updatedAt: new Date().toISOString()
      }
      await window.api.saveAsset(updated)
      set({ assets: assets.map((a) => (a.id === id ? updated : a)) })
    }
  },

  moveToTrash: async (id) => {
    const assets = get().assets
    const idx = assets.findIndex((a) => a.id === id)
    if (idx >= 0) {
      const updated = { ...assets[idx], isDeleted: true, updatedAt: new Date().toISOString() }
      await window.api.saveAsset(updated)
      set({
        assets: assets.map((a) => (a.id === id ? updated : a)),
        selectedAssetIds: get().selectedAssetIds.filter((sid) => sid !== id)
      })
    }
  },

  restoreFromTrash: async (id) => {
    const assets = get().assets
    const idx = assets.findIndex((a) => a.id === id)
    if (idx >= 0) {
      const updated = { ...assets[idx], isDeleted: false, updatedAt: new Date().toISOString() }
      await window.api.saveAsset(updated)
      set({ assets: assets.map((a) => (a.id === id ? updated : a)) })
    }
  },

  deleteAssetPhysical: async (id) => {
    try {
      await window.api.deleteAsset(id)
      set({
        assets: get().assets.filter((a) => a.id !== id),
        selectedAssetIds: get().selectedAssetIds.filter((sid) => sid !== id)
      })
    } catch (e) {
      console.error('彻底删除文件失败:', e)
    }
  },

  setSelectedAssetIds: (ids) => {
    set({ selectedAssetIds: ids })
  },

  updateAssetTags: async (assetId, tagIds) => {
    const assets = get().assets
    const idx = assets.findIndex((a) => a.id === assetId)
    if (idx >= 0) {
      const updated = { ...assets[idx], tags: tagIds, updatedAt: new Date().toISOString() }
      await window.api.saveAsset(updated)
      set({ assets: assets.map((a) => (a.id === assetId ? updated : a)) })
    }
  },

  moveAssetsToFolder: async (assetIds, folderId) => {
    try {
      const assets = get().assets
      const updatedAssets = [...assets]
      for (const id of assetIds) {
        const idx = updatedAssets.findIndex((a) => a.id === id)
        if (idx >= 0) {
          const updated = {
            ...updatedAssets[idx],
            folderId: folderId,
            updatedAt: new Date().toISOString()
          }
          updatedAssets[idx] = updated
          await window.api.saveAsset(updated)
        }
      }
      set({ assets: updatedAssets })
    } catch (e) {
      console.error('移动素材文件夹失败:', e)
    }
  },

  // 文件夹操作
  createFolder: async (name, parentId) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      parentId,
      sortOrder: get().folders.length,
      createdAt: new Date().toISOString()
    }
    await window.api.saveFolder(newFolder)
    const folders = await window.api.getFolders()
    set({ folders })
  },

  renameFolder: async (id, name) => {
    const folder = get().folders.find((f) => f.id === id)
    if (folder) {
      const updated = { ...folder, name }
      await window.api.saveFolder(updated)
      const folders = await window.api.getFolders()
      set({ folders })
    }
  },

  deleteFolder: async (id) => {
    await window.api.deleteFolder(id)
    const folders = await window.api.getFolders()
    const assets = await window.api.getAssets()
    set({ folders, assets })
    if (get().activeFolderId === id) {
      set({ activeFolderId: null, activeTab: 'all' })
    }
  },

  // 标签操作
  createTag: async (name, color = '#8b5cf6') => {
    const newTag: Tag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      color,
      type: 'manual',
      createdAt: new Date().toISOString()
    }
    await window.api.saveTag(newTag)
    const tags = await window.api.getTags()
    set({ tags })
  },

  deleteTag: async (id) => {
    await window.api.deleteTag(id)
    const tags = await window.api.getTags()
    const assets = await window.api.getAssets()
    set({ tags, assets })
  },

  // 看板操作
  createBoard: async (name, description) => {
    const newBoard: Board = {
      id: `board-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      assets: []
    }
    await window.api.saveBoard(newBoard)
    const boards = await window.api.getBoards()
    set({ boards })
  },

  deleteBoard: async (id) => {
    await window.api.deleteBoard(id)
    const boards = await window.api.getBoards()
    set({ boards })
    if (get().activeBoardId === id) {
      set({ activeBoardId: null, activeTab: 'boards' })
    }
  },

  addAssetsToBoard: async (boardId, assetIds, note = '') => {
    const board = get().boards.find((b) => b.id === boardId)
    if (board) {
      // 避免重复添加同个图片
      const filteredAssetIds = assetIds.filter(
        (aid) => !board.assets.some((ba) => ba.assetId === aid)
      )
      if (filteredAssetIds.length === 0) return

      const newBoardAssets = filteredAssetIds.map((aid, idx) => ({
        assetId: aid,
        note,
        sortOrder: board.assets.length + idx
      }))

      const updated = {
        ...board,
        assets: [...board.assets, ...newBoardAssets]
      }
      await window.api.saveBoard(updated)
      const boards = await window.api.getBoards()
      set({ boards })
    }
  },

  removeAssetFromBoard: async (boardId, assetId) => {
    const board = get().boards.find((b) => b.id === boardId)
    if (board) {
      const updated = {
        ...board,
        assets: board.assets.filter((ba) => ba.assetId !== assetId)
      }
      await window.api.saveBoard(updated)
      const boards = await window.api.getBoards()
      set({ boards })
    }
  },

  updateBoardAssetNote: async (boardId, assetId, note) => {
    const board = get().boards.find((b) => b.id === boardId)
    if (board) {
      const updated = {
        ...board,
        assets: board.assets.map((ba) => (ba.assetId === assetId ? { ...ba, note } : ba))
      }
      await window.api.saveBoard(updated)
      const boards = await window.api.getBoards()
      set({ boards })
    }
  },

  // AI 单图分析
  analyzeImage: async (assetId, customUsage) => {
    try {
      // 1. 本地更新为处理中状态
      set({
        assets: get().assets.map((a) =>
          a.id === assetId ? { ...a, aiStatus: 'processing' as const } : a
        )
      })

      // 2. 调用 IPC 服务
      await window.api.analyzeImage(assetId, customUsage)

      // 3. 重新获取资产和标签以防新增了自动生成的标签
      const assets = await window.api.getAssets()
      const tags = await window.api.getTags()

      set({ assets, tags })
    } catch (e) {
      console.error(`单图分析失败 assetId: ${assetId}, 错误:`, e)
      // 回退状态
      const assets = await window.api.getAssets()
      set({ assets })
      throw e
    }
  },

  // AI 批量分析
  analyzeBatchImages: async (assetIds) => {
    if (get().isAnalyzingBatch) return

    batchCancelled = false
    set({
      isAnalyzingBatch: true,
      batchProgress: { total: assetIds.length, done: 0, failed: 0, currentName: '' }
    })

    for (let i = 0; i < assetIds.length; i++) {
      if (batchCancelled) break

      const assetId = assetIds[i]
      const asset = get().assets.find((a) => a.id === assetId)
      if (!asset) continue

      set((state) => ({
        batchProgress: {
          ...state.batchProgress,
          currentName: asset.fileName
        }
      }))

      try {
        await get().analyzeImage(assetId)
        set((state) => ({
          batchProgress: {
            ...state.batchProgress,
            done: state.batchProgress.done + 1
          }
        }))
      } catch (e) {
        console.error(`批量识别中图片 ${asset.fileName} 失败:`, e)
        set((state) => ({
          batchProgress: {
            ...state.batchProgress,
            failed: state.batchProgress.failed + 1
          }
        }))
      }
    }

    set({ isAnalyzingBatch: false })
  },

  cancelBatchAnalysis: () => {
    batchCancelled = true
    set({ isAnalyzingBatch: false })
  },

  // 状态跳转与辅助方法
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveFolderId: (id) =>
    set((state) => ({
      activeFolderId: id,
      activeTab: id ? 'folder' : state.activeTab
    })),
  setActiveBoardId: (id) =>
    set((state) => ({
      activeBoardId: id,
      activeTab: id ? 'board-detail' : state.activeTab
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortKey: (key) => set({ sortKey: key }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setRightSidebarOpen: (isOpen) => set({ isRightSidebarOpen: isOpen }),
  setInternalDragging: (isDragging) => set({ isInternalDragging: isDragging }),
  setCreatingFolderParentId: (id) => set({ creatingFolderParentId: id }),
  setNewFolderName: (name) => set({ newFolderName: name }),
  setLeftSidebarOpen: (isOpen) => set({ isLeftSidebarOpen: isOpen }),
  setStatusbarOpen: (isOpen) => set({ isStatusbarOpen: isOpen }),
  setAlwaysOnTop: (isTop) => set({ isAlwaysOnTop: isTop }),
  setFullScreen: (isFull) => set({ isFullScreen: isFull }),
  setGrayscale: (isGray) => set({ isGrayscale: isGray }),

  // 扩展布局与过滤方法实现
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setFoldersOnTop: (val) => set({ foldersOnTop: val }),
  setShowSubfolderContents: (val) => set({ showSubfolderContents: val }),
  setShowFileSize: (val) => set({ showFileSize: val }),
  setShowResolution: (val) => set({ showResolution: val }),
  setFilterBarOpen: (val) => set({ isFilterBarOpen: val }),
  setSearchOverlayOpen: (val) => set({ isSearchOverlayOpen: val }),
  setPreferencesModalOpen: (val) => set({ isPreferencesModalOpen: val }),

  setFilterColor: (color) => set({ filterColor: color }),
  setFilterKeyword: (kw) => set({ filterKeyword: kw }),
  setFilterFolderId: (id) => set({ filterFolderId: id }),
  setFilterTagId: (id) => set({ filterTagId: id }),
  setFilterFileType: (type) => set({ filterFileType: type }),
  setFilterShape: (shape) => set({ filterShape: shape }),
  setFilterRating: (rating) => set({ filterRating: rating }),
  resetFilters: () =>
    set({
      filterColor: null,
      filterKeyword: '',
      filterFolderId: null,
      filterTagId: null,
      filterFileType: null,
      filterShape: null,
      filterRating: null
    }),

  setViewerAsset: (asset, playlist) => {
    if (asset) {
      const currentTab = get().activeTab
      set({
        activeViewerAsset: asset,
        viewerPlaylist: playlist || [],
        previousTab: currentTab !== 'viewer' ? currentTab : get().previousTab,
        activeTab: 'viewer',
        selectedAssetIds: [asset.id]
      })
    } else {
      set({
        activeViewerAsset: null,
        viewerPlaylist: [],
        activeTab: get().previousTab || 'all'
      })
    }
  }
}))
