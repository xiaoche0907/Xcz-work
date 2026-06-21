import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const COLOR_PRESETS = [
  { name: 'red', label: '红色', hex: '#ef4444' },
  { name: 'orange', label: '橙色', hex: '#f97316' },
  { name: 'yellow', label: '黄色', hex: '#eab308' },
  { name: 'green', label: '绿色', hex: '#22c55e' },
  { name: 'teal', label: '青色', hex: '#06b6d4' },
  { name: 'blue', label: '蓝色', hex: '#3b82f6' },
  { name: 'purple', label: '紫色', hex: '#a855f7' },
  { name: 'pink', label: '粉色', hex: '#ec4899' },
  { name: 'brown', label: '棕色', hex: '#78350f' },
  { name: 'white', label: '白色', hex: '#ffffff', border: true },
  { name: 'black', label: '黑色', hex: '#000000' },
  { name: 'grey', label: '灰色', hex: '#6b7280' }
]

export const FilterBar: React.FC = () => {
  const {
    folders,
    tags,
    filterColor,
    setFilterColor,
    filterKeyword,
    setFilterKeyword,
    filterFolderId,
    setFilterFolderId,
    filterTagId,
    setFilterTagId,
    filterFileType,
    setFilterFileType,
    filterShape,
    setFilterShape,
    filterRating,
    setFilterRating,
    resetFilters
  } = useAppStore()

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
      }
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  const hasActiveFilters =
    filterColor !== null ||
    filterKeyword.trim() !== '' ||
    filterFolderId !== null ||
    filterTagId !== null ||
    filterFileType !== null ||
    filterShape !== null ||
    filterRating !== null

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name)
  }

  const getFolderLabel = () => {
    if (!filterFolderId) return '文件夹'
    const folder = folders.find((f) => f.id === filterFolderId)
    return folder ? `目录: ${folder.name}` : '文件夹'
  }

  const getTagLabel = () => {
    if (!filterTagId) return '标签'
    const tag = tags.find((t) => t.id === filterTagId)
    return tag ? `标签: ${tag.name}` : '标签'
  }

  const getFileTypeLabel = () => {
    if (!filterFileType) return '文件类型'
    return `类型: ${filterFileType.toUpperCase()}`
  }

  const getShapeLabel = () => {
    if (!filterShape) return '形状'
    if (filterShape === 'horizontal') return '横图'
    if (filterShape === 'vertical') return '竖图'
    if (filterShape === 'square') return '方图'
    return '形状'
  }

  const getRatingLabel = () => {
    if (filterRating === null) return '评分'
    if (filterRating === 0) return '无评分'
    return `${filterRating} 星及以上`
  }

  return (
    <div
      ref={barRef}
      className="flex h-10 shrink-0 items-center justify-between border-b border-app-border bg-[#F8F9FA] px-4 text-[12px] text-gray-600 relative select-none"
    >
      <div className="flex items-center gap-3">
        {/* 色轮圆圈选择面板 (图2最左侧色彩小标志) */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('color')}
            className={`flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-200 transition-colors ${
              filterColor ? 'bg-brand-50 text-brand-600' : ''
            }`}
            title="按颜色过滤"
          >
            {filterColor ? (
              <div
                style={{
                  backgroundColor: COLOR_PRESETS.find((c) => c.name === filterColor)?.hex
                }}
                className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
              />
            ) : (
              // 渐变色轮 SVG
              <svg className="w-4 h-4" viewBox="0 0 32 32">
                <defs>
                  <linearGradient id="wheel" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                </defs>
                <circle cx="16" cy="16" r="14" fill="url(#wheel)" />
              </svg>
            )}
          </button>

          {activeDropdown === 'color' && (
            <div className="absolute left-0 top-full mt-1.5 z-[10000] w-48 rounded-lg border border-app-border bg-white p-3 shadow-xl grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => {
                    setFilterColor(filterColor === color.name ? null : color.name)
                    setActiveDropdown(null)
                  }}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                    color.border ? 'border-gray-300' : 'border-transparent'
                  } ${
                    filterColor === color.name ? 'ring-2 ring-brand-500 ring-offset-2 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.label}
                >
                  {filterColor === color.name && (
                    <Check
                      size={14}
                      className={color.name === 'white' ? 'text-black' : 'text-white'}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 关键字筛选 */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('keyword')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-gray-200 transition-colors ${
              filterKeyword ? 'bg-brand-50 text-brand-700 font-semibold' : ''
            }`}
          >
            <span>{filterKeyword ? `关键字: ${filterKeyword}` : '关键字'}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {activeDropdown === 'keyword' && (
            <div className="absolute left-0 top-full mt-1.5 z-[10000] w-52 rounded-lg border border-app-border bg-white p-2.5 shadow-xl">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  placeholder="输入过滤关键字..."
                  className="h-7 w-full rounded border border-app-border px-2 text-[11px]"
                  autoFocus
                />
                {filterKeyword && (
                  <button
                    onClick={() => setFilterKeyword('')}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 文件夹筛选 */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('folder')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-gray-200 transition-colors ${
              filterFolderId ? 'bg-brand-50 text-brand-700 font-semibold' : ''
            }`}
          >
            <span>{getFolderLabel()}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {activeDropdown === 'folder' && (
            <div className="absolute left-0 top-full mt-1.5 z-[10000] w-48 max-h-56 overflow-y-auto rounded-lg border border-app-border bg-white py-1 shadow-xl">
              <button
                onClick={() => {
                  setFilterFolderId(null)
                  setActiveDropdown(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
              >
                <span>全部文件夹</span>
                {filterFolderId === null && <Check size={12} className="text-brand-600" />}
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilterFolderId(f.id)
                    setActiveDropdown(null)
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
                >
                  <span className="truncate pr-2">{f.name}</span>
                  {filterFolderId === f.id && <Check size={12} className="text-brand-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 标签筛选 */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('tag')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-gray-200 transition-colors ${
              filterTagId ? 'bg-brand-50 text-brand-700 font-semibold' : ''
            }`}
          >
            <span>{getTagLabel()}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {activeDropdown === 'tag' && (
            <div className="absolute left-0 top-full mt-1.5 z-[10000] w-48 max-h-56 overflow-y-auto rounded-lg border border-app-border bg-white py-1 shadow-xl">
              <button
                onClick={() => {
                  setFilterTagId(null)
                  setActiveDropdown(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
              >
                <span>全部标签</span>
                {filterTagId === null && <Check size={12} className="text-brand-600" />}
              </button>
              {tags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setFilterTagId(t.id)
                    setActiveDropdown(null)
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
                >
                  <span className="truncate pr-2">{t.name}</span>
                  {filterTagId === t.id && <Check size={12} className="text-brand-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 文件类型筛选 */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('fileType')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-gray-200 transition-colors ${
              filterFileType ? 'bg-brand-50 text-brand-700 font-semibold' : ''
            }`}
          >
            <span>{getFileTypeLabel()}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {activeDropdown === 'fileType' && (
            <div className="absolute left-0 top-full mt-1.5 z-[10000] w-40 rounded-lg border border-app-border bg-white py-1 shadow-xl">
              <button
                onClick={() => {
                  setFilterFileType(null)
                  setActiveDropdown(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
              >
                <span>全部</span>
                {filterFileType === null && <Check size={12} className="text-brand-600" />}
              </button>
              {['png', 'jpg', 'jpeg', 'webp', 'gif'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterFileType(type)
                    setActiveDropdown(null)
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
                >
                  <span>{type.toUpperCase()}</span>
                  {filterFileType === type && <Check size={12} className="text-brand-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 形状筛选 */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('shape')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-gray-200 transition-colors ${
              filterShape ? 'bg-brand-50 text-brand-700 font-semibold' : ''
            }`}
          >
            <span>{getShapeLabel()}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {activeDropdown === 'shape' && (
            <div className="absolute left-0 top-full mt-1.5 z-[10000] w-40 rounded-lg border border-app-border bg-white py-1 shadow-xl">
              <button
                onClick={() => {
                  setFilterShape(null)
                  setActiveDropdown(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
              >
                <span>全部</span>
                {filterShape === null && <Check size={12} className="text-brand-600" />}
              </button>
              <button
                onClick={() => {
                  setFilterShape('horizontal')
                  setActiveDropdown(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
              >
                <span>横图</span>
                {filterShape === 'horizontal' && <Check size={12} className="text-brand-600" />}
              </button>
              <button
                onClick={() => {
                  setFilterShape('vertical')
                  setActiveDropdown(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
              >
                <span>竖图</span>
                {filterShape === 'vertical' && <Check size={12} className="text-brand-600" />}
              </button>
              <button
                onClick={() => {
                  setFilterShape('square')
                  setActiveDropdown(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
              >
                <span>方图</span>
                {filterShape === 'square' && <Check size={12} className="text-brand-600" />}
              </button>
            </div>
          )}
        </div>

        {/* 评分筛选 */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('rating')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-gray-200 transition-colors ${
              filterRating !== null ? 'bg-brand-50 text-brand-700 font-semibold' : ''
            }`}
          >
            <span>{getRatingLabel()}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {activeDropdown === 'rating' && (
            <div className="absolute left-0 top-full mt-1.5 z-[10000] w-48 rounded-lg border border-app-border bg-white py-1 shadow-xl">
              <button
                onClick={() => {
                  setFilterRating(null)
                  setActiveDropdown(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
              >
                <span>全部</span>
                {filterRating === null && <Check size={12} className="text-brand-600" />}
              </button>
              <button
                onClick={() => {
                  setFilterRating(0)
                  setActiveDropdown(null)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
              >
                <span>无评分</span>
                {filterRating === 0 && <Check size={12} className="text-brand-600" />}
              </button>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => {
                    setFilterRating(star)
                    setActiveDropdown(null)
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-app-hover"
                >
                  <span>{star} 星及以上</span>
                  {filterRating === star && <Check size={12} className="text-brand-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 清除筛选按钮 */}
      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 rounded bg-[#EDEDED] hover:bg-[#E2E2E2] px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>清除筛选</span>
          <X size={12} />
        </button>
      )}
    </div>
  )
}
