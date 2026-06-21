import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { LocalDb, Asset } from './db'
import { FileManager } from './fileManager'
import { AiService } from './ai'

export function initIpc(): void {
  const db = new LocalDb()
  const settings = db.getSettings()
  
  const fileManager = new FileManager(settings.libraryPath)
  const aiService = new AiService(
    settings.apiBaseUrl,
    settings.apiKey,
    settings.visionModel,
    settings.textModel
  )

  // 监听配置变化并更新其他服务
  const updateServicesConfig = (): void => {
    const s = db.getSettings()
    fileManager.updateLibraryPath(s.libraryPath)
    aiService.updateConfig(s.apiBaseUrl, s.apiKey, s.visionModel, s.textModel)
  }

  // --- Settings IPC ---
  ipcMain.handle('db-get-settings', () => {
    return db.getSettings()
  })

  ipcMain.handle('db-save-settings', (_event, newSettings) => {
    const s = db.saveSettings(newSettings)
    updateServicesConfig()
    return s
  })

  // --- Assets IPC ---
  ipcMain.handle('db-get-assets', () => {
    return db.getAssets()
  })

  ipcMain.handle('db-save-asset', (_event, asset: Asset) => {
    db.saveAsset(asset)
    return true
  })

  ipcMain.handle('db-delete-asset', (_event, id: string) => {
    const asset = db.getAssets().find(a => a.id === id)
    if (asset) {
      // 物理删除
      fileManager.deletePhysicalFiles(asset)
      db.deleteAsset(id)
    }
    return true
  })

  // --- Folders IPC ---
  ipcMain.handle('db-get-folders', () => {
    return db.getFolders()
  })

  ipcMain.handle('db-save-folder', (_event, folder) => {
    db.saveFolder(folder)
    return true
  })

  ipcMain.handle('db-delete-folder', (_event, id: string) => {
    db.deleteFolder(id)
    return true
  })

  // --- Tags IPC ---
  ipcMain.handle('db-get-tags', () => {
    return db.getTags()
  })

  ipcMain.handle('db-save-tag', (_event, tag) => {
    db.saveTag(tag)
    return true
  })

  ipcMain.handle('db-delete-tag', (_event, id: string) => {
    db.deleteTag(id)
    return true
  })

  // --- Boards IPC ---
  ipcMain.handle('db-get-boards', () => {
    return db.getBoards()
  })

  ipcMain.handle('db-save-board', (_event, board) => {
    db.saveBoard(board)
    return true
  })

  ipcMain.handle('db-delete-board', (_event, id: string) => {
    db.deleteBoard(id)
    return true
  })

  // --- File Dialog & Operations IPC ---
  ipcMain.handle('file-pick-dialog', async (_event, options) => {
    const result = await dialog.showOpenDialog(options)
    return result.filePaths
  })

  ipcMain.handle('file-open-path', async (_event, filePath: string) => {
    try {
      await shell.showItemInFolder(filePath)
      return true
    } catch (e) {
      console.error('打开文件所在文件夹失败:', e)
      return false
    }
  })

  // 递归解析文件夹内的所有图片文件
  const getAllImageFiles = (dirPath: string): string[] => {
    const fs = require('fs')
    const path = require('path')
    let results: string[] = []
    try {
      const list = fs.readdirSync(dirPath)
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
      list.forEach((file: string) => {
        const fullPath = path.join(dirPath, file)
        const stat = fs.statSync(fullPath)
        if (stat && stat.isDirectory()) {
          results = results.concat(getAllImageFiles(fullPath))
        } else {
          const ext = path.extname(fullPath).toLowerCase()
          if (allowedExts.includes(ext)) {
            results.push(fullPath)
          }
        }
      })
    } catch (err) {
      console.error(`读取文件夹 ${dirPath} 失败:`, err)
    }
    return results
  }

  ipcMain.handle('file-import', async (_event, { filePaths, folderId }) => {
    const fs = require('fs')
    const importedAssets: Asset[] = []
    
    // 解析可能包含文件夹的混合路径
    let resolvedPaths: string[] = []
    for (const p of filePaths) {
      try {
        const stat = fs.statSync(p)
        if (stat.isDirectory()) {
          resolvedPaths = resolvedPaths.concat(getAllImageFiles(p))
        } else {
          resolvedPaths.push(p)
        }
      } catch (e) {
        console.error(`解析路径 ${p} 属性失败:`, e)
      }
    }

    for (const filePath of resolvedPaths) {
      try {
        const asset = await fileManager.importFile(filePath, folderId)
        db.saveAsset(asset)
        importedAssets.push(asset)
      } catch (e) {
        console.error(`导入文件 ${filePath} 失败:`, e)
      }
    }
    return importedAssets
  })

  ipcMain.handle('file-import-data', async (_event, { arrayBuffer, fileName, folderId }) => {
    try {
      const buffer = Buffer.from(arrayBuffer)
      const asset = await fileManager.importFileData(buffer, fileName, folderId)
      db.saveAsset(asset)
      return asset
    } catch (e) {
      console.error(`导入文件数据 ${fileName} 失败:`, e)
      throw e
    }
  })

  // --- AI Operations IPC ---
  ipcMain.handle('ai-analyze-image', async (_event, { assetId, customUsage }) => {
    const assets = db.getAssets()
    const asset = assets.find(a => a.id === assetId)
    if (!asset) {
      throw new Error('素材未找到')
    }

    // 1. 更新状态为 processing
    asset.aiStatus = 'processing'
    db.saveAsset(asset)

    try {
      // 2. 调用 AI 服务
      const analysis = await aiService.analyzeImage(asset.filePath, customUsage)
      
      // 3. 将分析的 styleKeywords 存入数据库 Tags 并与图片关联
      const existingTags = db.getTags()
      const tagIds: string[] = []
      
      for (const tagText of analysis.styleKeywords) {
        let tag = existingTags.find(t => t.name.toLowerCase() === tagText.toLowerCase())
        if (!tag) {
          tag = {
            id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: tagText,
            color: '#8b5cf6', // 默认蓝紫色
            type: 'ai',
            createdAt: new Date().toISOString()
          }
          db.saveTag(tag)
          existingTags.push(tag)
        }
        tagIds.push(tag.id)
      }

      // 4. 更新素材信息
      asset.aiAnalysis = analysis
      asset.aiStatus = 'done'
      // 合并手动与 AI 自动标签
      asset.tags = Array.from(new Set([...asset.tags, ...tagIds]))
      asset.updatedAt = new Date().toISOString()
      
      db.saveAsset(asset)
      return asset
    } catch (e: any) {
      console.error(`AI 识别失败 assetId: ${assetId}, 错误:`, e)
      asset.aiStatus = 'failed'
      db.saveAsset(asset)
      throw new Error(e.message || 'AI 分析错误')
    }
  })

  // 生成多张图情景描述
  ipcMain.handle('ai-generate-scene', async (_event, assetIds: string[]) => {
    const assets = db.getAssets()
    const filePaths: string[] = []
    
    for (const id of assetIds) {
      const asset = assets.find(a => a.id === id)
      if (asset) {
        filePaths.push(asset.filePath)
      }
    }

    if (filePaths.length === 0) {
      throw new Error('未选择有效素材图片')
    }

    return await aiService.generateSceneDescription(filePaths)
  })

  // --- Window Settings IPC ---
  ipcMain.handle('win-toggle-always-on-top', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      const isTop = win.isAlwaysOnTop()
      win.setAlwaysOnTop(!isTop)
      return !isTop
    }
    return false
  })

  ipcMain.handle('win-toggle-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      const isFull = win.isFullScreen()
      win.setFullScreen(!isFull)
      return !isFull
    }
    return false
  })

  ipcMain.handle('win-get-always-on-top', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win ? win.isAlwaysOnTop() : false
  })

  ipcMain.handle('win-get-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win ? win.isFullScreen() : false
  })

  // --- New File Operations for Right Click Menu ---
  ipcMain.handle('file-open-external', async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath)
      return true
    } catch (e) {
      console.error('用默认应用打开文件失败:', e)
      return false
    }
  })

  ipcMain.handle('file-save-copy', async (event, { sourcePath, defaultName }) => {
    const path = require('path')
    const fs = require('fs')
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    
    const ext = path.extname(sourcePath)
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName || `export${ext}`,
      filters: [{ name: 'Images', extensions: [ext.replace('.', '')] }]
    })
    
    if (result.canceled || !result.filePath) {
      return false
    }
    
    try {
      fs.copyFileSync(sourcePath, result.filePath)
      return true
    } catch (e) {
      console.error('另存为失败:', e)
      return false
    }
  })

  ipcMain.handle('file-copy-image', async (_event, filePath: string) => {
    const { nativeImage, clipboard } = require('electron')
    try {
      const img = nativeImage.createFromPath(filePath)
      clipboard.writeImage(img)
      return true
    } catch (e) {
      console.error('复制图片到剪切板失败:', e)
      return false
    }
  })

  ipcMain.handle('file-export-assets', async (_event, { assetPaths, destDir }) => {
    const fs = require('fs')
    const path = require('path')
    let successCount = 0
    for (const srcPath of assetPaths) {
      try {
        const fileName = path.basename(srcPath)
        const destPath = path.join(destDir, fileName)
        fs.copyFileSync(srcPath, destPath)
        successCount++
      } catch (e) {
        console.error(`导出复制文件失败 ${srcPath}:`, e)
      }
    }
    return successCount
  })

  ipcMain.on('start-drag', (event, filePaths: string[]) => {
    if (!filePaths || filePaths.length === 0) return
    const { existsSync } = require('fs')
    const { nativeImage } = require('electron')

    // 仅保留磁盘上存在的文件路径
    const validPaths = filePaths.filter((p) => p && existsSync(p))
    if (validPaths.length === 0) return

    const iconPath = validPaths[0]
    try {
      let dragIcon = nativeImage.createFromPath(iconPath)
      const size = dragIcon.getSize()
      // 若原图过大，进行等比缩放限制在 96 像素内，防止 Windows 拖拽巨大图标崩溃或性能下降
      if (size.width > 96 || size.height > 96) {
        const maxDim = 96
        let newWidth = maxDim
        let newHeight = maxDim
        if (size.width > size.height) {
          newHeight = Math.round((size.height / size.width) * maxDim)
        } else {
          newWidth = Math.round((size.width / size.height) * maxDim)
        }
        dragIcon = dragIcon.resize({
          width: newWidth,
          height: newHeight,
          quality: 'good'
        })
      }

      event.sender.startDrag({
        files: validPaths,
        file: validPaths[0],
        icon: dragIcon
      })
    } catch (err) {
      console.error('Electron 原生拖拽启动失败:', err)
    }
  })
}
