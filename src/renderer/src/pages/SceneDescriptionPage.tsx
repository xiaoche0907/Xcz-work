/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useState } from 'react'
import { AlertCircle, Check, Clipboard, Image as ImageIcon, Loader, Sparkles } from 'lucide-react'
import { SceneDescription } from '../../../shared/types'
import { useAppStore } from '../store/useAppStore'

export const SceneDescriptionPage: React.FC = () => {
  const { selectedAssetIds, assets, settings } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<SceneDescription | null>(null)

  const selectedAssets = assets.filter(
    (asset) => selectedAssetIds.includes(asset.id) && !asset.isDeleted
  )

  const handleGenerate = async () => {
    if (selectedAssets.length < 2) {
      alert('请至少多选 2 张参考图。')
      return
    }

    if (!settings?.apiKey) {
      alert('请先在设置中配置 API Key。')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const data = await window.api.generateSceneDescription(
        selectedAssets.map((asset) => asset.id)
      )
      setResult(data)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '生成情景描述失败，请检查 API 配置。'
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPrompt = () => {
    if (!result?.suggestedPrompt) return

    navigator.clipboard.writeText(result.suggestedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-white px-20 py-7">
      <div className="mb-9">
        <h1 className="text-[28px] font-semibold tracking-tight text-black">浏览器</h1>
        <p className="mt-2 text-[13px] text-gray-500">
          多选 2 张或更多参考图，融合生成统一的生图与拍摄方案。
        </p>
      </div>

      {selectedAssets.length < 2 ? (
        <div className="mx-auto mt-16 flex max-w-sm flex-col items-center rounded-lg border border-app-border bg-white p-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <ImageIcon size={20} />
          </div>
          <h3 className="mt-4 text-[14px] font-semibold text-gray-800">未满足多选条件</h3>
          <p className="mt-2 text-[12px] leading-5 text-gray-400">
            请先在文件网格中按住 Ctrl 或 Shift 多选 2 张以上图片，再回到这里生成方案。
          </p>
          <div className="mt-5 flex gap-2 rounded-md border border-amber-100 bg-amber-50 p-3 text-left text-[12px] text-amber-800">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
            <span>当前仅选中 {selectedAssets.length} 张图片。</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-4 rounded-lg border border-app-border bg-white p-4">
            <h2 className="text-[14px] font-semibold text-gray-800">
              已选参考图 ({selectedAssets.length} 张)
            </h2>
            <div className="mt-4 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-md bg-[#F7F8FA] p-2">
              {selectedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex aspect-square items-center justify-center overflow-hidden rounded bg-white"
                >
                  <img
                    src={`media://${asset.thumbnailPath}`}
                    alt={asset.fileName}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-brand-500 text-[13px] font-medium text-white hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? '融合分析中...' : '生成多图融合情景描述'}
            </button>
          </section>

          <section className="col-span-8 min-h-[360px] rounded-lg border border-app-border bg-white p-5">
            {loading && (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                <Loader size={30} className="animate-spin text-brand-500" />
                <h3 className="mt-4 text-[14px] font-semibold text-brand-600">
                  AI 正在融合视觉特征
                </h3>
                <p className="mt-2 max-w-sm text-[12px] leading-5 text-gray-400">
                  多图分析需要对比画面、人物、服装、光影和构图，请稍候。
                </p>
              </div>
            )}

            {!loading && !result && (
              <div className="flex h-full min-h-[320px] items-center justify-center text-[13px] text-gray-400">
                点击左侧按钮开始生成方案。
              </div>
            )}

            {!loading && result && (
              <div className="space-y-5 text-[12px]">
                <TextBlock title="融合风格总结" accent>
                  {result.styleSummary}
                </TextBlock>

                <div className="grid grid-cols-2 gap-3">
                  <TextBlock title="场景设定">{result.scene}</TextBlock>
                  <TextBlock title="主体/人物">{result.character}</TextBlock>
                  <TextBlock title="服装材质">{result.clothing}</TextBlock>
                  <TextBlock title="姿势动作">{result.action}</TextBlock>
                  <TextBlock title="构图镜头">{result.camera}</TextBlock>
                  <TextBlock title="光影氛围">{result.lighting}</TextBlock>
                </div>

                <div className="border-t border-app-border pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-gray-800">融合反推英文 Prompt</h3>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="flex h-7 items-center gap-1 rounded-md bg-brand-50 px-2 text-[12px] text-brand-700 hover:bg-brand-100"
                    >
                      {copied ? (
                        <Check size={12} className="text-emerald-500" />
                      ) : (
                        <Clipboard size={12} />
                      )}
                      {copied ? '已复制' : '复制'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={result.suggestedPrompt}
                    className="h-24 w-full resize-none rounded-md bg-white p-2 text-[12px] leading-5 text-gray-600"
                  />
                </div>

                <TextBlock title="拍摄或 AI 生图建议">{result.shootingAdvice}</TextBlock>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

const TextBlock: React.FC<{ title: string; children: React.ReactNode; accent?: boolean }> = ({
  title,
  children,
  accent
}) => (
  <div className="rounded-md border border-app-border bg-white p-3">
    <h3 className={`text-[12px] font-semibold ${accent ? 'text-brand-600' : 'text-gray-800'}`}>
      {title}
    </h3>
    <p className="mt-1.5 text-[12px] leading-5 text-gray-500">{children}</p>
  </div>
)
