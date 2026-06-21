import React, { useState } from 'react'
import { X, Puzzle, Settings, HardDrive, Keyboard, Globe, Sparkles, ShieldAlert } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const categories = [
  {
    title: '基础与界面切换',
    items: [
      { name: '打开/关闭主窗口', keys: '主程序控制' },
      { name: '显示/隐藏文件筛选器', keys: 'Alt + F' },
      { name: '显示/隐藏子文件夹内容', keys: '—' },
      { name: '搜索文件', keys: 'Ctrl + F' },
      { name: '筛选文件夹或看板', keys: 'Ctrl + E' },
      { name: '前往文件夹', keys: 'Ctrl + G' },
      { name: '前往标签', keys: 'Ctrl + T' },
      { name: '切换布局模式 (网格/列表)', keys: 'Tab' }
    ]
  },
  {
    title: '列表素材导航',
    items: [
      { name: '全选当前列表素材', keys: 'Ctrl + A' },
      { name: '取消选择', keys: 'Ctrl + D' },
      { name: '上一个文件', keys: '← / Ctrl + P / Ctrl + H' },
      { name: '下一个文件', keys: '→ / Ctrl + N / Ctrl + L' },
      { name: '上', keys: '↑ / Ctrl + K' },
      { name: '下', keys: '↓ / Ctrl + J' },
      { name: '左', keys: '← / Ctrl + H' },
      { name: '右', keys: '→ / Ctrl + L' }
    ]
  },
  {
    title: '素材管理与编辑',
    items: [
      { name: '打开本地文件夹', keys: 'Ctrl + Enter' },
      { name: '在默认应用中打开', keys: 'Ctrl + O' },
      { name: '重命名文件', keys: 'F2' },
      { name: '移动到文件夹', keys: 'F' },
      { name: '添加到看板', keys: 'B' },
      { name: '移出当前看板', keys: 'Shift + B' },
      { name: '添加标签', keys: 'T' },
      { name: '删除文件 (移入废纸篓)', keys: 'Delete / Backspace' },
      { name: '永久删除文件 (物理删除)', keys: 'Shift + Delete' },
      { name: '复制物理文件', keys: 'Ctrl + C' },
      { name: '粘贴物理文件', keys: 'Ctrl + V' },
      { name: '复制图片至剪贴板', keys: 'Ctrl + Alt + C' },
      { name: '复制标签', keys: 'Ctrl + Shift + C' },
      { name: '粘贴标签', keys: 'Ctrl + Shift + V' }
    ]
  },
  {
    title: '大图预览与缩放控制',
    items: [
      { name: '打开/关闭大图预览', keys: 'Space / Escape' },
      { name: '放大图片', keys: 'Ctrl + =' },
      { name: '缩小图片', keys: 'Ctrl + -' },
      { name: '适应窗口大小', keys: 'Ctrl + 0' },
      { name: '原始大小 (1:1)', keys: 'Ctrl + 1' },
      { name: '宽度自适应', keys: 'Ctrl + 2' }
    ]
  },
  {
    title: '星级评分控制',
    items: [
      { name: '评分 1 ~ 5 星', keys: 'Shift + 1 / Shift + 2 / Shift + 3 / Shift + 4 / Shift + 5' },
      { name: '取消评分', keys: 'Shift + 0' }
    ]
  }
]

const renderKeys = (keyStr: string) => {
  if (keyStr === '—' || keyStr === '主程序控制') {
    return <span className="text-gray-400 text-[11px] font-sans font-medium">{keyStr}</span>
  }
  const parts = keyStr.split(' / ')
  return (
    <div className="flex flex-wrap items-center justify-end gap-y-1 gap-x-1.5 max-w-[260px]">
      {parts.map((part, index) => {
        const subParts = part.split(' + ')
        return (
          <div key={index} className="flex items-center gap-0.5">
            {index > 0 && <span className="text-gray-400 text-[9px] font-bold mx-0.5">或</span>}
            <div className="flex items-center gap-0.5">
              {subParts.map((sub, sIdx) => (
                <React.Fragment key={sIdx}>
                  {sIdx > 0 && <span className="text-gray-400 text-[9px] font-bold">+</span>}
                  <kbd className="inline-flex items-center justify-center min-w-[20px] h-[19px] px-1.5 text-[9px] font-bold text-gray-700 bg-gray-50 border border-gray-300 rounded shadow-[0_1.5px_0_rgba(0,0,0,0.12)] border-b-[2px] leading-none select-none">
                    {sub}
                  </kbd>
                </React.Fragment>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

type TabId =
  | 'general'
  | 'file-cache'
  | 'shortcuts'
  | 'network'
  | 'plugins'
  | 'ai'
  | 'privacy'

export const PreferencesModal: React.FC = () => {
  const { isPreferencesModalOpen, setPreferencesModalOpen } = useAppStore()
  const [activeTab, setActiveTab] = useState<TabId>('general')

  // 本地插件安装与启用模拟状态
  const [pluginsState, setPluginsState] = useState<
    Record<string, { installed: boolean; enabled: boolean }>
  >({
    '3d-lite': { installed: false, enabled: false },
    '3d-pro': { installed: false, enabled: false },
    'audio-player': { installed: false, enabled: false }
  })

  if (!isPreferencesModalOpen) return null

  const handleInstall = (id: string) => {
    setPluginsState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        installed: true,
        enabled: true
      }
    }))
  }

  const handleToggle = (id: string) => {
    setPluginsState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        enabled: prev[id].installed ? !prev[id].enabled : false
      }
    }))
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'plugins':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-[14px] font-bold text-gray-800">预览插件</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">扩展详情预览页支持的文件格式类型。</p>
            </div>

            <div className="space-y-4">
              {/* 3D 模型预览 Lite */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-app-border bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-indigo-500 rounded-lg flex flex-col items-center justify-center text-white shrink-0 shadow-inner">
                    <span className="text-[11px] font-black tracking-tighter">3D</span>
                    <span className="text-[8px] font-bold opacity-80 -mt-1">LITE</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 text-[13px]">3D 模型预览 Lite</span>
                      <span className="text-[10px] text-gray-400">Pixcall · 0.1.4</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-500 max-w-sm">
                      在文件详情页可直接查看 glTF、FBX、Rhino3DM 等 3D 模型文件。
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3.5">
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pluginsState['3d-lite'].enabled}
                      disabled={!pluginsState['3d-lite'].installed}
                      onChange={() => handleToggle('3d-lite')}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                  {/* Install Button */}
                  <button
                    onClick={() => handleInstall('3d-lite')}
                    disabled={pluginsState['3d-lite'].installed}
                    className={`h-7 px-3 text-[11px] font-medium rounded transition-all ${
                      pluginsState['3d-lite'].installed
                        ? 'bg-gray-100 text-gray-400 cursor-default'
                        : 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm'
                    }`}
                  >
                    {pluginsState['3d-lite'].installed ? '已安装' : '安装'}
                  </button>
                </div>
              </div>

              {/* 3D 模型预览 Pro */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-app-border bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-brand-500 rounded-lg flex flex-col items-center justify-center text-white shrink-0 shadow-inner">
                    <span className="text-[11px] font-black tracking-tighter">3D</span>
                    <span className="text-[8px] font-bold opacity-80 -mt-1">PRO</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 text-[13px]">3D 模型预览 Pro</span>
                      <span className="text-[10px] text-gray-400">Pixcall · 0.2.1</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-500 max-w-sm">
                      在文件详情页可直接查看 OBJ、STL、3DS、PLY、DAE、STEP、IGES、BREP 等 3D 模型文件。
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3.5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pluginsState['3d-pro'].enabled}
                      disabled={!pluginsState['3d-pro'].installed}
                      onChange={() => handleToggle('3d-pro')}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                  <button
                    onClick={() => handleInstall('3d-pro')}
                    disabled={pluginsState['3d-pro'].installed}
                    className={`h-7 px-3 text-[11px] font-medium rounded transition-all ${
                      pluginsState['3d-pro'].installed
                        ? 'bg-gray-100 text-gray-400 cursor-default'
                        : 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm'
                    }`}
                  >
                    {pluginsState['3d-pro'].installed ? '已安装' : '安装'}
                  </button>
                </div>
              </div>

              {/* 音频播放器 */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-app-border bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-lg flex flex-col items-center justify-center text-white shrink-0 shadow-inner">
                    {/* 音符 SVG */}
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 text-[13px]">音频播放器</span>
                      <span className="text-[10px] text-gray-400">Pixcall · 0.2.6</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-500 max-w-sm">
                      在文件详情页可直接播放 MP3、WAV、AAC、M4A、OGG、WebM、FLAC 等常见音频类型。
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3.5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pluginsState['audio-player'].enabled}
                      disabled={!pluginsState['audio-player'].installed}
                      onChange={() => handleToggle('audio-player')}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                  <button
                    onClick={() => handleInstall('audio-player')}
                    disabled={pluginsState['audio-player'].installed}
                    className={`h-7 px-3 text-[11px] font-medium rounded transition-all ${
                      pluginsState['audio-player'].installed
                        ? 'bg-gray-100 text-gray-400 cursor-default'
                        : 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm'
                    }`}
                  >
                    {pluginsState['audio-player'].installed ? '已安装' : '安装'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'shortcuts':
        return (
          <div className="space-y-5 pb-4 select-none flex flex-col h-full">
            <div>
              <h3 className="text-[14px] font-bold text-gray-800">全部快捷键</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">使用键盘快捷键，可以极大提升您的素材管理与预览效率。</p>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[340px] pr-1.5 custom-scrollbar">
              {categories.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-brand-600 border-b border-gray-100 pb-1">
                    {cat.title}
                  </h4>
                  <div className="divide-y divide-gray-100 bg-[#FAFBFC] rounded-xl border border-app-border">
                    {cat.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center justify-between px-3 py-2 text-[11px]">
                        <span className="text-gray-600 font-medium">{item.name}</span>
                        {renderKeys(item.keys)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 italic">
            <Settings size={28} className="mb-2 text-gray-300" />
            <span>此项设置功能正在完善中...</span>
          </div>
        )
    }
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode; group?: string }[] = [
    { id: 'general', label: '通用', icon: <Settings size={13} />, group: '软件设置' },
    { id: 'file-cache', label: '文件与缓存', icon: <HardDrive size={13} /> },
    { id: 'shortcuts', label: '快捷键', icon: <Keyboard size={13} /> },
    { id: 'network', label: '网络', icon: <Globe size={13} /> },
    { id: 'plugins', label: '插件', icon: <Puzzle size={13} /> },
    { id: 'ai', label: '智能 AI', icon: <Sparkles size={13} /> },
    { id: 'privacy', label: '隐私', icon: <ShieldAlert size={13} /> }
  ]

  return (
    <div
      onClick={() => setPreferencesModalOpen(false)}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/35 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-[680px] h-[480px] flex-col rounded-xl border border-app-border bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* 顶部标题栏 (图4顶部的淡绿色或灰绿色横栏) */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-app-border bg-[#F0F7F0] px-4">
          <div className="flex items-center gap-2 text-brand-700 font-bold text-[13px]">
            <Puzzle size={16} />
            <span>偏好设置</span>
          </div>
          <button
            onClick={() => setPreferencesModalOpen(false)}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            title="关闭偏好设置"
          >
            <X size={16} />
          </button>
        </div>

        {/* 主内容双栏划分 */}
        <div className="flex flex-1 min-h-0 bg-white">
          {/* 左侧侧栏 */}
          <aside className="w-44 border-r border-app-border bg-[#F8F9FA] py-3 text-[12px] text-gray-600 select-none overflow-y-auto flex flex-col gap-0.5">
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id
              return (
                <React.Fragment key={tab.id}>
                  {tab.group && (
                    <div className="px-4 pt-3.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {tab.group}
                    </div>
                  )}
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-500 pl-[14px]'
                        : 'hover:bg-gray-100 hover:text-gray-900 border-l-2 border-transparent'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                </React.Fragment>
              )
            })}
          </aside>

          {/* 右侧主设置面板 */}
          <main className="flex-1 overflow-y-auto p-6 bg-white text-[12px] text-gray-700">
            {renderTabContent()}
          </main>
        </div>
      </div>
    </div>
  )
}
