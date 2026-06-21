import { ElectronAPI } from '@electron-toolkit/utils'
import { Asset, Folder, Tag, Board, Settings, SceneDescription } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getSettings: () => Promise<Settings>
      saveSettings: (settings: Partial<Settings>) => Promise<Settings>
      getAssets: () => Promise<Asset[]>
      saveAsset: (asset: Asset) => Promise<boolean>
      deleteAsset: (id: string) => Promise<boolean>
      getFolders: () => Promise<Folder[]>
      saveFolder: (folder: Folder) => Promise<boolean>
      deleteFolder: (id: string) => Promise<boolean>
      getTags: () => Promise<Tag[]>
      saveTag: (tag: Tag) => Promise<boolean>
      deleteTag: (id: string) => Promise<boolean>
      getBoards: () => Promise<Board[]>
      saveBoard: (board: Board) => Promise<boolean>
      deleteBoard: (id: string) => Promise<boolean>
      pickDialog: (options: any) => Promise<string[]>
      openPath: (path: string) => Promise<boolean>
      importFiles: (filePaths: string[], folderId?: string) => Promise<Asset[]>
      importFileData: (arrayBuffer: ArrayBuffer, fileName: string, folderId?: string) => Promise<Asset>
      analyzeImage: (assetId: string, customUsage?: string) => Promise<Asset>
      generateSceneDescription: (assetIds: string[]) => Promise<SceneDescription>
      toggleAlwaysOnTop: () => Promise<boolean>
      toggleFullScreen: () => Promise<boolean>
      isAlwaysOnTop: () => Promise<boolean>
      isFullScreen: () => Promise<boolean>
      openExternal: (path: string) => Promise<boolean>
      saveCopy: (sourcePath: string, defaultName: string) => Promise<boolean>
      copyImage: (filePath: string) => Promise<boolean>
      exportAssets: (assetPaths: string[], destDir: string) => Promise<number>
      startDrag: (filePaths: string[]) => void
    }
  }
}
