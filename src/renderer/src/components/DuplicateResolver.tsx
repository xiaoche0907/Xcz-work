/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useMemo, useState, useEffect } from 'react'
import { ArrowLeft, Check, Link, Tag, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Asset } from '../../../shared/types'
import clsx from 'clsx'

export const DuplicateResolver: React.FC = () => {
  const {
    assets,
    tags,
    saveAsset,
    moveToTrash,
    setActiveTab,
    setSelectedAssetIds
  } = useAppStore()

  // 忽略的组 Key 列表
  const [ignoredKeys, setIgnoredKeys] = useState<string[]>([])
  // 本地固定的重复组列表，防止合并时数据跳变
  const [groups, setGroups] = useState<{ key: string; assets: Asset[] }[]>([])
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)

  // 过滤分类状态：'all' | 'exact' | 'similar'
  const [filterType, setFilterType] = useState<'all' | 'exact' | 'similar'>('exact')

  // 未被删除的所有素材
  const activeAssets = useMemo(() => {
    return assets.filter((asset) => !asset.isDeleted)
  }, [assets])

  // 计算当前的重复组（首次加载或资产长度改变时）
  useEffect(() => {
    const groupsMap: Record<string, Asset[]> = {}
    activeAssets.forEach((asset) => {
      // 按照 fileSize 和 width x height 的组合作为重复特征 Key
      const key = `${asset.fileSize}-${asset.width}x${asset.height}`
      if (!groupsMap[key]) {
        groupsMap[key] = []
      }
      groupsMap[key].push(asset)
    })

    const list = Object.entries(groupsMap)
      .filter(([_, items]) => items.length >= 2)
      .map(([key, items]) => ({ key, assets: items }))
      .filter((g) => !ignoredKeys.includes(g.key))

    setGroups(list)
    if (currentGroupIndex >= list.length && list.length > 0) {
      setCurrentGroupIndex(list.length - 1)
    }
  }, [activeAssets.length, ignoredKeys])

  // 当前组与素材列表
  const currentGroup = groups[currentGroupIndex]
  const groupAssets = currentGroup?.assets || []

  // 属性合并勾选状态：保存当前选中保留特定属性的素材 ID
  const [fileNameAssetId, setFileNameAssetId] = useState<string>('')
  const [tagsAssetId, setTagsAssetId] = useState<string>('')
  const [sourceUrlAssetId, setSourceUrlAssetId] = useState<string>('')
  const [metaAssetId, setMetaAssetId] = useState<string>('')

  // 智能自动推荐最佳属性勾选
  useEffect(() => {
    if (groupAssets.length >= 2) {
      const assetA = groupAssets[0]
      const assetB = groupAssets[1]

      // 1. 文件名推荐：选择字数较长且非默认自动生成前缀（web-image-）的
      let bestNameId = assetA.id
      const isAWeb = assetA.fileName.startsWith('web-image-')
      const isBWeb = assetB.fileName.startsWith('web-image-')
      if (isAWeb && !isBWeb) {
        bestNameId = assetB.id
      } else if (!isAWeb && isBWeb) {
        bestNameId = assetA.id
      } else {
        bestNameId = assetA.fileName.length >= assetB.fileName.length ? assetA.id : assetB.id
      }

      // 2. 标签推荐：选择绑定标签数量多的一方
      const bestTagsId = (assetA.tags?.length || 0) >= (assetB.tags?.length || 0) ? assetA.id : assetB.id

      // 3. 来源网址推荐：优先选择存在有效链接的一方
      let bestUrlId = assetA.id
      if (!assetA.sourceUrl && assetB.sourceUrl) {
        bestUrlId = assetB.id
      } else if (assetA.sourceUrl && !assetB.sourceUrl) {
        bestUrlId = assetA.id
      }

      setFileNameAssetId(bestNameId)
      setTagsAssetId(bestTagsId)
      setSourceUrlAssetId(bestUrlId)
      setMetaAssetId(assetA.id) // 元信息默认勾选左边第一个
    }
  }, [currentGroupIndex, groupAssets])

  // 格式化文件大小
  const formattedSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const unit = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const index = Math.floor(Math.log(bytes) / Math.log(unit))
    return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(1))} ${sizes[index]}`
  }

  // 渲染标签列表名字
  const renderAssetTagsText = (assetTags: string[]) => {
    if (!assetTags || assetTags.length === 0) return '无标签'
    const tagNames = assetTags
      .map((tid) => tags.find((t) => t.id === tid)?.name)
      .filter(Boolean)
    return tagNames.length > 0 ? tagNames.join(', ') : '无标签'
  }

  // 合并当前重复组
  const handleMergeCurrent = async () => {
    if (groupAssets.length < 2) return

    const assetA = groupAssets[0]
    const assetB = groupAssets[1]

    // 以左侧 assetA 作为合并基准底本，抛弃右侧 assetB
    const baseAsset = assetA
    const discardAsset = assetB

    // 提取选中的各个字段的值
    const finalName = groupAssets.find((a) => a.id === fileNameAssetId)?.fileName || baseAsset.fileName
    const finalTags = groupAssets.find((a) => a.id === tagsAssetId)?.tags || baseAsset.tags
    const finalUrl = groupAssets.find((a) => a.id === sourceUrlAssetId)?.sourceUrl || baseAsset.sourceUrl

    const mergedAsset: Asset = {
      ...baseAsset,
      fileName: finalName,
      tags: [...finalTags],
      sourceUrl: finalUrl,
      updatedAt: new Date().toISOString()
    }

    try {
      // 1. 更新保留的基准图片
      await saveAsset(mergedAsset)
      // 2. 将舍弃的多余图片移入废纸篓
      await moveToTrash(discardAsset.id)
      // 3. 在本地列表中剔除该组
      setIgnoredKeys((prev) => [...prev, currentGroup.key])
      setSelectedAssetIds([])

      // 4. 合并成功后，如果是最后一组，索引需要收缩
      if (currentGroupIndex >= groups.length - 1 && currentGroupIndex > 0) {
        setCurrentGroupIndex((prev) => prev - 1)
      }
    } catch (err) {
      console.error('合并去重执行失败:', err)
      alert('合并失败，请重试')
    }
  }

  // 忽略当前这组重复文件，直接跳入下一组
  const handleIgnoreCurrent = () => {
    if (!currentGroup) return
    setIgnoredKeys((prev) => [...prev, currentGroup.key])
    if (currentGroupIndex >= groups.length - 1 && currentGroupIndex > 0) {
      setCurrentGroupIndex((prev) => prev - 1)
    }
  }

  // 忽略全部组：直接退出文件去重界面
  const handleIgnoreAll = () => {
    setActiveTab('all')
  }

  // 一键合并全部组（按照系统自动推荐的最佳选项静默完成全部合并）
  const handleMergeAll = async () => {
    if (groups.length === 0) return

    const confirmText = `确定要自动合并全部 ${groups.length} 组重复文件吗? 
合并后多余的重复文件将被移动到废纸篓。`
    if (!window.confirm(confirmText)) return

    try {
      for (const group of groups) {
        const assetsInGroup = group.assets
        if (assetsInGroup.length < 2) continue

        const assetA = assetsInGroup[0]
        const assetB = assetsInGroup[1]

        // 智能决策
        let bestName = assetA.fileName
        const isAWeb = assetA.fileName.startsWith('web-image-')
        const isBWeb = assetB.fileName.startsWith('web-image-')
        if (isAWeb && !isBWeb) {
          bestName = assetB.fileName
        } else if (!isAWeb && isBWeb) {
          bestName = assetA.fileName
        } else {
          bestName = assetA.fileName.length >= assetB.fileName.length ? assetA.fileName : assetB.fileName
        }

        const bestTags = (assetA.tags?.length || 0) >= (assetB.tags?.length || 0) ? assetA.tags : assetB.tags
        const bestUrl = assetA.sourceUrl || assetB.sourceUrl || ''

        const merged: Asset = {
          ...assetA,
          fileName: bestName,
          tags: [...bestTags],
          sourceUrl: bestUrl,
          updatedAt: new Date().toISOString()
        }

        await saveAsset(merged)
        await moveToTrash(assetB.id)
      }

      setIgnoredKeys((prev) => [...prev, ...groups.map((g) => g.key)])
      alert('全部重复文件合并处理完成！')
      setActiveTab('all')
    } catch (e) {
      console.error('批量自动合并去重失败:', e)
      alert('批量合并部分失败，请重试')
    }
  }

  // 三段式分类过滤后的实际可用组数量（由于目前只实现完全相同，相似和全部均以此做条件基础）
  const visibleGroups = useMemo(() => {
    if (filterType === 'similar') return []
    return groups
  }, [groups, filterType])

  // 当前激活的分组（基于过滤后）
  const activeGroup = visibleGroups[currentGroupIndex]
  const activeAssetsList = activeGroup?.assets || []

  return (
    <div className="flex flex-col h-full w-full bg-white select-none">
      {/* 顶部标题栏 */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-app-border px-4 bg-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="p-1 text-gray-500 hover:bg-app-hover hover:text-app-text rounded transition-colors"
            title="返回"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="text-[14px] font-bold text-gray-800">文件去重</h2>
        </div>
      </div>

      {/* 自动匹配最佳属性状态提示栏 */}
      <div className="flex h-10 shrink-0 items-center justify-between px-6 bg-gray-50/70 border-b border-app-border text-[12px] text-gray-500">
        <div className="flex items-center gap-1.5 font-medium text-gray-700">
          <CheckCircle2 size={13} className="text-brand-600" />
          <span>{activeAssetsList.length} 个完全相同文件 已自动选择最佳并选项</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              // 重置为自动推荐最佳
              if (activeAssetsList.length >= 2) {
                const assetA = activeAssetsList[0]
                const assetB = activeAssetsList[1]
                setFileNameAssetId(assetA.fileName.length >= assetB.fileName.length ? assetA.id : assetB.id)
                setTagsAssetId((assetA.tags?.length || 0) >= (assetB.tags?.length || 0) ? assetA.id : assetB.id)
                setSourceUrlAssetId(assetA.sourceUrl ? assetA.id : (assetB.sourceUrl ? assetB.id : assetA.id))
                setMetaAssetId(assetA.id)
              }
            }}
            className="flex items-center gap-1 hover:text-brand-600 transition-colors"
            title="恢复默认推荐"
          >
            <span className="text-[11px]">智能选择</span>
          </button>
        </div>
      </div>

      {/* 中间重复组展示及对比区域 */}
      <div className="flex-1 overflow-y-auto px-10 py-8 bg-white">
        {visibleGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-4">
              <Check size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-800">清理完成！</h3>
            <p className="text-xs text-gray-400 mt-1.5">当前没有检测到重复的文件，您的素材库十分干净。</p>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className="mt-6 px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg transition-colors shadow-sm"
            >
              返回全部文件
            </button>
          </div>
        ) : currentGroupIndex >= visibleGroups.length ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs">
            正在载入数据组...
          </div>
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col h-full">
            {/* 图片及属性单选双栏布局 */}
            <div className="grid grid-cols-2 gap-8 items-start flex-1 min-h-0">
              {activeAssetsList.slice(0, 2).map((asset, idx) => {
                const isLeft = idx === 0

                return (
                  <div
                    key={asset.id}
                    className="flex flex-col border border-app-border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* 图片预览容器 */}
                    <div className="h-64 w-full bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-100 relative group">
                      <img
                        src={`media://${asset.filePath}`}
                        alt={asset.fileName}
                        className="max-h-full max-w-full object-contain"
                      />
                      <span className="absolute top-3 left-3 bg-gray-700/60 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase text-white tracking-wide">
                        {isLeft ? '选项 A' : '选项 B'}
                      </span>
                    </div>

                    {/* 选项对比列表 */}
                    <div className="mt-5 space-y-3.5">
                      {/* 1. 文件元数据 (大小、格式、分辨率) */}
                      <div
                        onClick={() => setMetaAssetId(asset.id)}
                        className={clsx(
                          "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors text-[12px]",
                          metaAssetId === asset.id
                            ? "bg-brand-50/50 border-brand-300 text-gray-800"
                            : "bg-white border-gray-100 hover:bg-gray-50/70 text-gray-600"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={13} className="text-gray-400 shrink-0" />
                          <span className="truncate font-mono">
                            {formattedSize(asset.fileSize)} · {asset.fileType.toUpperCase()} · {asset.width}x{asset.height}
                          </span>
                        </div>
                        <div
                          className={clsx(
                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                            metaAssetId === asset.id
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-gray-300 bg-white"
                          )}
                        >
                          {metaAssetId === asset.id && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>

                      {/* 2. 文件名 */}
                      <div
                        onClick={() => setFileNameAssetId(asset.id)}
                        className={clsx(
                          "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors text-[12px]",
                          fileNameAssetId === asset.id
                            ? "bg-brand-50/50 border-brand-300 text-gray-800 font-medium"
                            : "bg-white border-gray-100 hover:bg-gray-50/70 text-gray-600"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={13} className="text-gray-400 shrink-0" />
                          <span className="truncate" title={asset.fileName}>
                            {asset.fileName}
                          </span>
                        </div>
                        <div
                          className={clsx(
                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                            fileNameAssetId === asset.id
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-gray-300 bg-white"
                          )}
                        >
                          {fileNameAssetId === asset.id && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>

                      {/* 3. 标签 */}
                      <div
                        onClick={() => setTagsAssetId(asset.id)}
                        className={clsx(
                          "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors text-[12px]",
                          tagsAssetId === asset.id
                            ? "bg-brand-50/50 border-brand-300 text-gray-800 font-medium"
                            : "bg-white border-gray-100 hover:bg-gray-50/70 text-gray-600"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Tag size={13} className="text-gray-400 shrink-0" />
                          <span className="truncate" title={renderAssetTagsText(asset.tags)}>
                            {renderAssetTagsText(asset.tags)}
                          </span>
                        </div>
                        <div
                          className={clsx(
                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                            tagsAssetId === asset.id
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-gray-300 bg-white"
                          )}
                        >
                          {tagsAssetId === asset.id && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>

                      {/* 4. 来源链接 */}
                      <div
                        onClick={() => setSourceUrlAssetId(asset.id)}
                        className={clsx(
                          "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors text-[12px]",
                          sourceUrlAssetId === asset.id
                            ? "bg-brand-50/50 border-brand-300 text-gray-800 font-medium"
                            : "bg-white border-gray-100 hover:bg-gray-50/70 text-gray-600"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Link size={13} className="text-gray-400 shrink-0" />
                          <span className="truncate" title={asset.sourceUrl || '无链接'}>
                            {asset.sourceUrl || '无链接'}
                          </span>
                        </div>
                        <div
                          className={clsx(
                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                            sourceUrlAssetId === asset.id
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-gray-300 bg-white"
                          )}
                        >
                          {sourceUrlAssetId === asset.id && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部控制栏 */}
      {visibleGroups.length > 0 && (
        <div className="flex h-14 shrink-0 items-center justify-between border-t border-app-border px-6 bg-white select-none">
          {/* 左侧组进度 */}
          <div className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium">
            <AlertCircle size={13} className="text-gray-400" />
            <span>当前第 {currentGroupIndex + 1} 组 / 共 {visibleGroups.length} 组</span>
          </div>

          {/* 中间筛选类型 */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg text-[12px] text-gray-600">
            {[
              { id: 'all', label: '全部' },
              { id: 'exact', label: '完全相同' },
              { id: 'similar', label: '相似' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterType(tab.id as any)
                  setCurrentGroupIndex(0)
                }}
                className={clsx(
                  "px-3 py-1 rounded-md transition-colors",
                  filterType === tab.id
                    ? "bg-white text-gray-900 font-semibold shadow-sm"
                    : "hover:text-gray-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 右侧批量控制 */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleIgnoreCurrent}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-lg text-[12px] font-semibold transition-colors"
            >
              忽略当前
            </button>
            <button
              type="button"
              onClick={handleIgnoreAll}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-lg text-[12px] font-semibold transition-colors"
            >
              忽略全部
            </button>
            <button
              type="button"
              onClick={handleMergeCurrent}
              className="px-4 py-1.5 text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg text-[12px] font-semibold transition-colors shadow-sm"
            >
              合并当前
            </button>
            <button
              type="button"
              onClick={handleMergeAll}
              className="px-4 py-1.5 text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg text-[12px] font-semibold transition-colors shadow-sm"
            >
              合并全部
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
