import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import type { Asset, Folder, Tag, Board, Settings } from '../shared/types'

export type { Asset, Folder, Tag, Board, Settings }

export interface DbSchema {
  settings: Settings
  assets: Asset[]
  folders: Folder[]
  tags: Tag[]
  boards: Board[]
}

const DEFAULT_SETTINGS = (): Settings => ({
  apiBaseUrl: 'https://yunwu.ai/v1', // 默认使用云雾API地址作为参考
  apiKey: '',
  visionModel: 'gpt-4o',
  textModel: 'gpt-4o',
  libraryPath: join(app.getPath('home'), 'XiaoCeZiLibrary'),
  autoAnalyze: false,
  theme: 'light',
  thumbnailSize: 180
})

export class LocalDb {
  private dbPath: string
  private data: DbSchema

  constructor() {
    const appDataPath = app.getPath('userData')
    if (!existsSync(appDataPath)) {
      mkdirSync(appDataPath, { recursive: true })
    }
    this.dbPath = join(appDataPath, 'db.json')
    this.data = this.load()
  }

  private load(): DbSchema {
    try {
      if (existsSync(this.dbPath)) {
        const fileContent = readFileSync(this.dbPath, 'utf-8')
        const parsed = JSON.parse(fileContent)
        // 补全默认字段，防范版本更新字段缺失
        return {
          settings: { ...DEFAULT_SETTINGS(), ...parsed.settings },
          assets: parsed.assets || [],
          folders: parsed.folders || [],
          tags: parsed.tags || [],
          boards: parsed.boards || []
        }
      }
    } catch (e) {
      console.error('加载本地数据库失败:', e)
    }

    const defaultData: DbSchema = {
      settings: DEFAULT_SETTINGS(),
      assets: [],
      folders: [],
      tags: [],
      boards: []
    }
    this.saveData(defaultData)
    return defaultData
  }

  private saveData(data: DbSchema): void {
    try {
      writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {
      console.error('写入本地数据库失败:', e)
    }
  }

  public getDb(): DbSchema {
    return this.data
  }

  // Settings CRUD
  public getSettings(): Settings {
    return this.data.settings
  }

  public saveSettings(settings: Partial<Settings>): Settings {
    this.data.settings = { ...this.data.settings, ...settings }
    this.saveData(this.data)
    return this.data.settings
  }

  // Assets CRUD
  public getAssets(): Asset[] {
    return this.data.assets
  }

  public saveAsset(asset: Asset): void {
    const idx = this.data.assets.findIndex(a => a.id === asset.id)
    if (idx >= 0) {
      this.data.assets[idx] = asset
    } else {
      this.data.assets.push(asset)
    }
    this.saveData(this.data)
  }

  public deleteAsset(id: string): void {
    this.data.assets = this.data.assets.filter(a => a.id !== id)
    this.saveData(this.data)
  }

  // Folders CRUD
  public getFolders(): Folder[] {
    return this.data.folders
  }

  public saveFolder(folder: Folder): void {
    const idx = this.data.folders.findIndex(f => f.id === folder.id)
    if (idx >= 0) {
      this.data.folders[idx] = folder
    } else {
      this.data.folders.push(folder)
    }
    this.saveData(this.data)
  }

  public deleteFolder(id: string): void {
    this.data.folders = this.data.folders.filter(f => f.id !== id)
    // 更新所属文件夹为全部文件（根目录）
    this.data.assets.forEach(asset => {
      if (asset.folderId === id) {
        asset.folderId = ''
      }
    })
    this.saveData(this.data)
  }

  // Tags CRUD
  public getTags(): Tag[] {
    return this.data.tags
  }

  public saveTag(tag: Tag): void {
    const idx = this.data.tags.findIndex(t => t.id === tag.id)
    if (idx >= 0) {
      this.data.tags[idx] = tag
    } else {
      this.data.tags.push(tag)
    }
    this.saveData(this.data)
  }

  public deleteTag(id: string): void {
    this.data.tags = this.data.tags.filter(t => t.id !== id)
    // 从所有图片的关联标签中移除
    this.data.assets.forEach(asset => {
      asset.tags = asset.tags.filter(tid => tid !== id)
    })
    this.saveData(this.data)
  }

  // Boards CRUD
  public getBoards(): Board[] {
    return this.data.boards
  }

  public saveBoard(board: Board): void {
    const idx = this.data.boards.findIndex(b => b.id === board.id)
    if (idx >= 0) {
      this.data.boards[idx] = board
    } else {
      this.data.boards.push(board)
    }
    this.saveData(this.data)
  }

  public deleteBoard(id: string): void {
    this.data.boards = this.data.boards.filter(b => b.id !== id)
    this.saveData(this.data)
  }
}
