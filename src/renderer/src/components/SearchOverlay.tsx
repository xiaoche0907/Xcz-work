import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  Folder,
  Tag,
  ChevronLeft,
  Heart,
  Image as ImageIcon
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const SafeFolderHeart = Heart || Folder
const SafeFolderSync = Folder
const SafeFolderOpen = Folder
const SafeArrowLeft = ChevronLeft
const SafeImageIcon = ImageIcon || Folder

// 错误边界组件，用于捕获搜索命令面板的渲染异常，防止应用整页白屏
class SearchOverlayErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SearchOverlayErrorBoundary 捕获到渲染错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/45 p-10 backdrop-blur-sm">
          <div className="w-[520px] rounded-xl border border-red-200 bg-white p-6 shadow-2xl mt-10">
            <h2 className="text-[14px] font-bold text-red-600 mb-2 flex items-center gap-2">
              ⚠️ 搜索命令面板渲染出错
            </h2>
            <p className="text-[12px] mb-4 text-gray-600">
              加载此面板时发生运行时错误。这通常是由于未定义的数据字段或图标缺失引起的。
            </p>
            <pre className="overflow-auto max-h-[180px] rounded bg-gray-900 p-4 text-[11px] text-green-400 font-mono whitespace-pre-wrap">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  // 重置内部错误状态
                  this.setState({ hasError: false, error: null })
                  // 尝试关闭面板以防死循环
                  try {
                    window.location.reload()
                  } catch (e) {}
                }}
                className="rounded bg-gray-100 hover:bg-gray-200 px-4 py-2 text-gray-700 text-[12px] font-medium"
              >
                刷新应用
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                }}
                className="rounded bg-red-600 hover:bg-red-700 px-4 py-2 text-white text-[12px] font-medium"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

interface CommandItem {
  id: string
  label: string
  icon: React.ReactNode
  action: () => void
}

// 实际的 SearchOverlay 内部实现
const SearchOverlayContent: React.FC = () => {
  const store = useAppStore() || {}
  
  // 安全地解构 store 属性，防止任何字段不存在导致报错
  const {
    isSearchOverlayOpen = false,
    setSearchOverlayOpen = () => {},
    folders = [],
    tags = [],
    boards = [],
    selectedAssetIds = [],
    assets = [],
    setActiveTab = () => {},
    setActiveFolderId = () => {},
    setSearchQuery = () => {},
    moveAssetsToFolder = async () => {},
    addAssetsToBoard = async () => {},
    updateAssetTags = async () => {}
  } = store

  const [inputVal, setInputVal] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [subStep, setSubStep] = useState<
    'folders-navigate' | 'tags-navigate' | 'folders-move' | 'boards-add' | 'tags-add' | null
  >(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 每次打开时自动 focus 输入框，重置状态
  useEffect(() => {
    if (isSearchOverlayOpen) {
      setInputVal('')
      setSelectedIndex(0)
      setSubStep(null)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isSearchOverlayOpen])


  // 获取模糊搜索到的匹配文件（当没有在子步骤，且有输入文字时）
  const safeAssets = (assets || []).filter(Boolean)
  const searchResults =
    inputVal.trim() && !subStep
      ? safeAssets
          .filter((asset) => asset && !asset.isDeleted && asset.fileName && asset.fileName.toLowerCase().includes(inputVal.toLowerCase()))
          .slice(0, 8)
      : []

  // 1. 主命令列表
  const mainCommands: CommandItem[] = [
    {
      id: 'move-folder',
      label: '移动所选图片到文件夹',
      icon: <SafeFolderSync size={15} className="text-blue-500" />,
      action: () => {
        const safeSelectedAssetIds = selectedAssetIds || []
        if (safeSelectedAssetIds.length === 0) {
          alert('请先在主网格中选择图片！')
          return
        }
        setSubStep('folders-move')
        setSelectedIndex(0)
      }
    },
    {
      id: 'add-board',
      label: '添加所选图片至看板',
      icon: <SafeFolderHeart size={15} className="text-pink-500" />,
      action: () => {
        const safeSelectedAssetIds = selectedAssetIds || []
        if (safeSelectedAssetIds.length === 0) {
          alert('请先在主网格中选择图片！')
          return
        }
        setSubStep('boards-add')
        setSelectedIndex(0)
      }
    },
    {
      id: 'add-tag',
      label: '给所选图片添加标签',
      icon: <Tag size={15} className="text-violet-500" />,
      action: () => {
        const safeSelectedAssetIds = selectedAssetIds || []
        if (safeSelectedAssetIds.length === 0) {
          alert('请先在主网格中选择图片！')
          return
        }
        setSubStep('tags-add')
        setSelectedIndex(0)
      }
    },
    {
      id: 'nav-folder',
      label: '前往文件夹目录',
      icon: <SafeFolderOpen size={15} className="text-amber-500" />,
      action: () => {
        setSubStep('folders-navigate')
        setSelectedIndex(0)
      }
    },
    {
      id: 'nav-tag',
      label: '前往标签分类',
      icon: <Tag size={15} className="text-emerald-500" />,
      action: () => {
        setSubStep('tags-navigate')
        setSelectedIndex(0)
      }
    },
    {
      id: 'search-keyword',
      label: '以输入文本全局搜索关键字',
      icon: <Search size={15} className="text-gray-500" />,
      action: () => {
        if (!inputVal.trim()) return
        setSearchQuery(inputVal.trim())
        setActiveTab('all')
        setSearchOverlayOpen(false)
      }
    }
  ]

  // 生成当前渲染的列表项（包含子步骤的列表）
  let currentItems: { label: string; icon: React.ReactNode; onSelect: () => void }[] = []

  const safeFolders = (folders || []).filter(Boolean)
  const safeTags = (tags || []).filter(Boolean)
  const safeBoards = (boards || []).filter(Boolean)
  const safeSelectedAssetIds = selectedAssetIds || []

  if (searchResults.length > 0) {
    currentItems = searchResults.map((asset) => ({
      label: `文件: ${asset.fileName || ''}`,
      icon: <SafeImageIcon size={15} className="text-gray-400" />,
      onSelect: () => {
        // 全局搜索并定位文件：设置搜索词并将该图片置为唯一选中
        setSearchQuery(asset.fileName || '')
        setActiveTab('all')
        setSearchOverlayOpen(false)
      }
    }))
  } else if (!subStep) {
    currentItems = mainCommands.map((cmd) => ({
      label: cmd.label,
      icon: cmd.icon,
      onSelect: cmd.action
    }))
  } else {
    // 渲染子步骤选项
    switch (subStep) {
      case 'folders-navigate':
        currentItems = safeFolders.map((f) => ({
          label: `前往文件夹: ${f.name || ''}`,
          icon: <Folder size={15} className="text-amber-500" />,
          onSelect: () => {
            setActiveFolderId(f.id)
            setActiveTab('folder')
            setSearchOverlayOpen(false)
          }
        }))
        break
      case 'tags-navigate':
        currentItems = safeTags.map((t) => ({
          label: `前往标签: ${t.name || ''}`,
          icon: <Tag size={15} className="text-emerald-500" />,
          onSelect: () => {
            setSearchQuery(t.name || '')
            setActiveTab('all')
            setSearchOverlayOpen(false)
          }
        }))
        break
      case 'folders-move':
        currentItems = [
          {
            label: '/ 移动至全部文件 (清除目录归属)',
            icon: <Folder size={15} className="text-blue-500" />,
            onSelect: async () => {
              await moveAssetsToFolder(safeSelectedAssetIds, '')
              alert(`成功移动 ${safeSelectedAssetIds.length} 张图片到全部文件目录`)
              setSearchOverlayOpen(false)
            }
          },
          ...safeFolders.map((f) => ({
            label: `移动到文件夹: ${f.name || ''}`,
            icon: <Folder size={15} className="text-blue-500" />,
            onSelect: async () => {
              await moveAssetsToFolder(safeSelectedAssetIds, f.id)
              alert(`成功移动 ${safeSelectedAssetIds.length} 张图片至「${f.name || ''}」`)
              setSearchOverlayOpen(false)
            }
          }))
        ]
        break
      case 'boards-add':
        currentItems = safeBoards.map((b) => ({
          label: `添加到看板: ${b.name || ''}`,
          icon: <SafeFolderHeart size={15} className="text-pink-500" />,
          onSelect: async () => {
            await addAssetsToBoard(b.id, safeSelectedAssetIds)
            alert(`成功添加 ${safeSelectedAssetIds.length} 张图片至看板「${b.name || ''}」`)
            setSearchOverlayOpen(false)
          }
        }))
        break
      case 'tags-add':
        currentItems = safeTags.map((t) => ({
          label: `添加标签: ${t.name || ''}`,
          icon: <Tag size={15} className="text-violet-500" />,
          onSelect: async () => {
            // 为选中的所有素材追加标签
            for (const assetId of safeSelectedAssetIds) {
              const asset = safeAssets.find((a) => a.id === assetId)
              if (asset) {
                const assetTags = asset.tags || []
                if (!assetTags.includes(t.id)) {
                  await updateAssetTags(assetId, [...assetTags, t.id])
                }
              }
            }
            alert(`标签「${t.name || ''}」已追加应用到 ${safeSelectedAssetIds.length} 张图片`)
            setSearchOverlayOpen(false)
          }
        }))
        break
    }
  }

  // 键盘操作响应
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, currentItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + currentItems.length) % Math.max(1, currentItems.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (currentItems[selectedIndex]) {
        currentItems[selectedIndex].onSelect()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (subStep) {
        setSubStep(null)
        setSelectedIndex(0)
      } else {
        setSearchOverlayOpen(false)
      }
    }
  }

  // 滚动跟随选中项
  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return
    const activeEl = listEl.children[selectedIndex] as HTMLElement
    if (!activeEl) return

    const containerHeight = listEl.clientHeight
    const elementTop = activeEl.offsetTop
    const elementHeight = activeEl.clientHeight

    if (elementTop + elementHeight > listEl.scrollTop + containerHeight) {
      listEl.scrollTop = elementTop + elementHeight - containerHeight
    } else if (elementTop < listEl.scrollTop) {
      listEl.scrollTop = elementTop
    }
  }, [selectedIndex])

  if (!isSearchOverlayOpen) return null

  return (
    <div
      onClick={() => setSearchOverlayOpen(false)}
      className="fixed inset-0 z-[99999] flex items-start justify-center bg-gray-900/30 p-20 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-[520px] flex-col rounded-xl border border-app-border bg-white shadow-2xl overflow-hidden mt-10 animate-in zoom-in-95 slide-in-from-top-6 duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* 输入框区域 */}
        <div className="flex h-12 items-center gap-3 border-b border-app-border bg-[#F4F5F7] px-4">
          {subStep ? (
            <button
              onClick={() => {
                setSubStep(null)
                setSelectedIndex(0)
              }}
              className="text-gray-400 hover:text-gray-700"
              title="返回上级"
            >
              <SafeArrowLeft size={16} />
            </button>
          ) : (
            <Search size={16} className="text-gray-400" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder={
              subStep
                ? `检索列表选项...`
                : (selectedAssetIds || []).length > 0
                ? `搜索文件或对选中的 ${(selectedAssetIds || []).length} 项输入指令...`
                : '搜索文件或输入快速操作命令...'
            }
            className="flex-1 bg-transparent text-[13px] text-gray-800 focus:outline-none placeholder-gray-400"
          />
          <span className="text-[10px] text-gray-400 font-mono border border-gray-200 bg-white rounded px-1.5 py-0.5 shadow-sm">
            ESC
          </span>
        </div>

        {/* 结果/选项展示区 */}
        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto py-1.5 bg-white flex flex-col text-[12px] text-gray-700 menu-scrollbar"
        >
          {currentItems.length === 0 ? (
            <div className="py-8 text-center text-gray-400 italic">
              {subStep ? '无可匹配的选项项目' : '未找到匹配的本地文件'}
            </div>
          ) : (
            currentItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onSelect}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === selectedIndex ? 'bg-[#EDEDED] text-black font-semibold' : 'hover:bg-gray-50'
                }`}
              >
                {item.icon}
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            ))
          )}
        </div>

        {/* 底部键盘引导栏 */}
        <div className="flex h-8 items-center justify-between border-t border-app-border bg-[#F8F9FA] px-4 text-[10px] text-gray-400 font-medium">
          <div className="flex items-center gap-3">
            <span>
              选择 <kbd className="font-mono text-gray-600 font-bold bg-white border border-gray-200 px-1 py-0.5 rounded shadow-sm">↑</kbd>{' '}
              <kbd className="font-mono text-gray-600 font-bold bg-white border border-gray-200 px-1 py-0.5 rounded shadow-sm">↓</kbd>
            </span>
            <span>
              确定 <kbd className="font-mono text-gray-600 font-bold bg-white border border-gray-200 px-1 py-0.5 rounded shadow-sm">Enter</kbd>
            </span>
            <span>
              返回/关闭 <kbd className="font-mono text-gray-600 font-bold bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm">Esc</kbd>
            </span>
          </div>
          {subStep && (
            <button
              onClick={() => {
                setSubStep(null)
                setSelectedIndex(0)
              }}
              className="text-brand-600 hover:text-brand-700"
            >
              返回主菜单
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// 导出被错误边界包裹的组件
export const SearchOverlay: React.FC = () => {
  return (
    <SearchOverlayErrorBoundary>
      <SearchOverlayContent />
    </SearchOverlayErrorBoundary>
  )
}

