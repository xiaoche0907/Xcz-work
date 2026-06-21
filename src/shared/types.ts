export interface AIAnalysis {
  summary: string
  subject: string
  scene: string
  styleKeywords: string[]
  colorAnalysis: string
  compositionAnalysis: string
  designThinking: string
  commercialUse: string[]
  chinesePrompt: string
  englishPrompt: string
  shortPrompt: string
  detailedPrompt: string
  negativePrompt: string
  model: string
  createdAt: string
}

export interface Asset {
  id: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  width: number
  height: number
  folderId: string
  thumbnailPath: string
  sourceUrl?: string
  isFavorite: boolean
  isDeleted: boolean
  aiStatus: "pending" | "processing" | "done" | "failed"
  aiAnalysis?: AIAnalysis
  description?: string
  rating?: number
  createdAt: string
  updatedAt: string
  tags: string[] // 关联标签的 id
}

export interface Folder {
  id: string
  name: string
  parentId?: string
  sortOrder: number
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
  type: "manual" | "ai" | "system"
  createdAt: string
}

export interface Board {
  id: string
  name: string
  description?: string
  createdAt: string
  assets: {
    assetId: string
    note?: string
    sortOrder: number
  }[]
}

export interface Settings {
  apiBaseUrl: string
  apiKey: string
  visionModel: string
  textModel: string
  libraryPath: string
  autoAnalyze: boolean
  theme: 'light' | 'dark' | 'system'
  thumbnailSize: number
}

export interface SceneDescription {
  styleSummary: string
  scene: string
  character: string
  clothing: string
  action: string
  camera: string
  lighting: string
  suggestedPrompt: string
  shootingAdvice: string
}
