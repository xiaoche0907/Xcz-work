import { nativeImage } from 'electron'
import { join, extname, basename } from 'path'
import { existsSync, mkdirSync, copyFileSync, writeFileSync, unlinkSync } from 'fs'
import { randomUUID } from 'crypto'
import { Asset } from './db'

export class FileManager {
  private libraryPath: string
  private originalsDir: string
  private thumbnailsDir: string

  constructor(libraryPath: string) {
    this.libraryPath = libraryPath
    this.originalsDir = join(this.libraryPath, 'originals')
    this.thumbnailsDir = join(this.libraryPath, 'thumbnails')
    this.ensureDirs()
  }

  // 确保图片库存放路径存在
  public updateLibraryPath(newPath: string): void {
    this.libraryPath = newPath
    this.originalsDir = join(this.libraryPath, 'originals')
    this.thumbnailsDir = join(this.libraryPath, 'thumbnails')
    this.ensureDirs()
  }

  private ensureDirs(): void {
    if (!existsSync(this.libraryPath)) {
      mkdirSync(this.libraryPath, { recursive: true })
    }
    if (!existsSync(this.originalsDir)) {
      mkdirSync(this.originalsDir, { recursive: true })
    }
    if (!existsSync(this.thumbnailsDir)) {
      mkdirSync(this.thumbnailsDir, { recursive: true })
    }
  }

  /**
   * 导入单张图片
   * @param sourcePath 源文件绝对路径
   * @param folderId 所属文件夹
   */
  public async importFile(sourcePath: string, folderId: string = ''): Promise<Asset> {
    this.ensureDirs()
    
    const ext = extname(sourcePath).toLowerCase()
    const fileName = basename(sourcePath)
    const id = randomUUID()
    
    const destFileName = `${id}${ext}`
    const destFilePath = join(this.originalsDir, destFileName)
    
    // 1. 复制原文件
    copyFileSync(sourcePath, destFilePath)
    
    // 2. 读取图片信息与生成缩略图（利用 Electron 原生 nativeImage 直接读取源路径以避免复制延迟）
    const image = nativeImage.createFromPath(sourcePath)
    const size = image.getSize()
    
    let width = size.width
    let height = size.height
    
    // 备用长宽提取（防范 nativeImage 加载延迟或失败）
    if (width === 0 || height === 0) {
      width = 800
      height = 600
    }
    
    // 3. 计算缩略图尺寸并生成
    const thumbWidth = 300
    const thumbHeight = Math.round((height / width) * thumbWidth)
    const thumbnail = image.resize({
      width: thumbWidth,
      height: thumbHeight,
      quality: 'good'
    })
    
    const thumbnailFileName = `${id}.jpg`
    const thumbnailPath = join(this.thumbnailsDir, thumbnailFileName)
    
    // 将缩略图保存为 JPEG (80% 质量)
    writeFileSync(thumbnailPath, thumbnail.toJPEG(80))
    
    // 获取文件大小
    const { size: fileSize } = require('fs').statSync(destFilePath)
    
    // 4. 构建 Asset 数据模型
    const now = new Date().toISOString()
    const asset: Asset = {
      id,
      fileName,
      filePath: destFilePath,
      fileType: ext.replace('.', '').toUpperCase(),
      fileSize,
      width,
      height,
      folderId,
      thumbnailPath,
      isFavorite: false,
      isDeleted: false,
      aiStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      tags: []
    }
    
    return asset
  }

  /**
   * 从内存 Buffer 导入单张图片
   * @param data 图片二进制 Buffer
   * @param originalName 原始文件名（或自动生成的名字）
   * @param folderId 所属文件夹
   */
  public async importFileData(data: Buffer, originalName: string, folderId: string = ''): Promise<Asset> {
    this.ensureDirs()
    
    let ext = extname(originalName).toLowerCase()
    if (!ext) {
      ext = '.png'
    }
    const id = randomUUID()
    
    const destFileName = `${id}${ext}`
    const destFilePath = join(this.originalsDir, destFileName)
    
    // 1. 写入原文件
    writeFileSync(destFilePath, data)
    
    // 2. 读取图片信息与生成缩略图（直接从内存中的 Buffer 解析，完全不依赖磁盘）
    const image = nativeImage.createFromBuffer(data)
    const size = image.getSize()
    
    let width = size.width
    let height = size.height
    
    if (width === 0 || height === 0) {
      width = 800
      height = 600
    }
    
    // 3. 计算缩略图尺寸并生成
    const thumbWidth = 300
    const thumbHeight = Math.round((height / width) * thumbWidth)
    const thumbnail = image.resize({
      width: thumbWidth,
      height: thumbHeight,
      quality: 'good'
    })
    
    const thumbnailFileName = `${id}.jpg`
    const thumbnailPath = join(this.thumbnailsDir, thumbnailFileName)
    
    writeFileSync(thumbnailPath, thumbnail.toJPEG(80))
    
    const fileSize = data.length
    
    // 4. 构建 Asset 数据模型
    const now = new Date().toISOString()
    const asset: Asset = {
      id,
      fileName: originalName,
      filePath: destFilePath,
      fileType: ext.replace('.', '').toUpperCase(),
      fileSize,
      width,
      height,
      folderId,
      thumbnailPath,
      isFavorite: false,
      isDeleted: false,
      aiStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      tags: []
    }
    
    return asset
  }

  /**
   * 删除物理文件 (包括原图与缩略图)
   */
  public deletePhysicalFiles(asset: Asset): void {
    try {
      if (existsSync(asset.filePath)) {
        unlinkSync(asset.filePath)
      }
      if (existsSync(asset.thumbnailPath)) {
        unlinkSync(asset.thumbnailPath)
      }
    } catch (e) {
      console.error(`物理删除文件 ${asset.fileName} 失败:`, e)
    }
  }
}
