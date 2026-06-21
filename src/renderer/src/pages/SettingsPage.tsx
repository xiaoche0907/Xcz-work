/* eslint-disable @typescript-eslint/explicit-function-return-type, react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react'
import { FolderOpen, Save, ShieldCheck } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useAppStore()
  const [apiKey, setApiKey] = useState('')
  const [apiBaseUrl, setApiBaseUrl] = useState('')
  const [visionModel, setVisionModel] = useState('')
  const [textModel, setTextModel] = useState('')
  const [libraryPath, setLibraryPath] = useState('')
  const [autoAnalyze, setAutoAnalyze] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')

  useEffect(() => {
    if (!settings) return

    setApiKey(settings.apiKey || '')
    setApiBaseUrl(settings.apiBaseUrl || 'https://yunwu.ai/v1')
    setVisionModel(settings.visionModel || 'gpt-4o')
    setTextModel(settings.textModel || 'gpt-4o')
    setLibraryPath(settings.libraryPath || '')
    setAutoAnalyze(settings.autoAnalyze || false)
    setTheme(settings.theme || 'light')
  }, [settings])

  const handleSelectPath = async () => {
    const paths = await window.api.pickDialog({
      title: '选择图片库存储文件夹',
      properties: ['openDirectory']
    })

    if (paths?.length) {
      setLibraryPath(paths[0])
    }
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    await updateSettings({
      apiKey: apiKey.trim(),
      apiBaseUrl: apiBaseUrl.trim(),
      visionModel: visionModel.trim(),
      textModel: textModel.trim(),
      libraryPath: libraryPath.trim(),
      autoAnalyze,
      theme
    })
    alert('配置已保存。')
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-white px-20 py-7">
      <div className="mb-9">
        <h1 className="text-[28px] font-semibold tracking-tight text-black">系统设置</h1>
        <p className="mt-2 text-[13px] text-gray-500">配置素材库路径、AI 模型和自动分析规则。</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <section className="rounded-lg border border-app-border bg-white p-5">
          <h2 className="mb-5 flex items-center gap-2 text-[14px] font-semibold text-gray-800">
            <ShieldCheck size={17} className="text-brand-500" />
            AI 模型参数
          </h2>

          <div className="space-y-4">
            <Field label="AI API Key">
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="请输入 OpenAI 兼容或云雾 API Key"
                className="h-9 w-full rounded-md px-3 text-[12px]"
              />
            </Field>

            <Field label="API Base URL">
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
                placeholder="例如: https://yunwu.ai/v1"
                className="h-9 w-full rounded-md px-3 font-mono text-[12px]"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="视觉分析模型">
                <input
                  type="text"
                  value={visionModel}
                  onChange={(event) => setVisionModel(event.target.value)}
                  placeholder="例如: gpt-4o"
                  className="h-9 w-full rounded-md px-3 font-mono text-[12px]"
                />
              </Field>
              <Field label="文本模型">
                <input
                  type="text"
                  value={textModel}
                  onChange={(event) => setTextModel(event.target.value)}
                  placeholder="例如: gpt-4o-mini"
                  className="h-9 w-full rounded-md px-3 font-mono text-[12px]"
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-app-border bg-white p-5">
          <h2 className="mb-5 text-[14px] font-semibold text-gray-800">本地素材库</h2>
          <Field label="存储路径">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={libraryPath}
                placeholder="请选择本地存储文件夹"
                className="h-9 min-w-0 flex-1 rounded-md bg-gray-50 px-3 text-[12px] text-gray-500"
              />
              <button
                type="button"
                onClick={handleSelectPath}
                className="flex h-9 items-center gap-1.5 rounded-md border border-app-border px-3 text-[12px] text-gray-700 hover:bg-app-hover"
              >
                <FolderOpen size={14} />
                选择目录
              </button>
            </div>
          </Field>
          <p className="mt-2 text-[11px] leading-5 text-gray-400">
            导入图片会统一保存到该目录下的 originals 和 thumbnails 子目录。
          </p>
        </section>

        <section className="rounded-lg border border-app-border bg-white p-5">
          <h2 className="mb-5 text-[14px] font-semibold text-gray-800">行为偏好</h2>
          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-[13px] font-medium text-gray-800">
                导入后自动触发 AI 分析
              </span>
              <span className="mt-1 block text-[11px] leading-5 text-gray-400">
                图片导入后自动生成标签、中文/英文 Prompt 和画面拆解。
              </span>
            </span>
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(event) => setAutoAnalyze(event.target.checked)}
              className="mt-1 h-4 w-4 accent-brand-500"
            />
          </label>
        </section>

        <button
          type="submit"
          className="flex h-9 w-full max-w-2xl items-center justify-center gap-1.5 rounded-md bg-brand-500 text-[13px] font-medium text-white hover:bg-brand-600"
        >
          <Save size={15} />
          保存全局设置
        </button>
      </form>
    </div>
  )
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-[12px] font-medium text-gray-600">{label}</span>
    {children}
  </label>
)
