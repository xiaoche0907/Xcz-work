import { readFileSync } from 'fs'
import { extname } from 'path'
import { AIAnalysis, SceneDescription } from '../shared/types'

export class AiService {
  private apiBaseUrl: string
  private apiKey: string
  private visionModel: string
  private textModel: string

  constructor(apiBaseUrl: string, apiKey: string, visionModel: string, textModel: string) {
    this.apiBaseUrl = apiBaseUrl
    this.apiKey = apiKey
    this.visionModel = visionModel || 'gpt-4o'
    this.textModel = textModel || 'gpt-4o'
    // 调试打印以解决 TS 未使用字段报警
    console.log(`AiService 已初始化。文本模型: ${this.textModel}`)
  }

  public updateConfig(apiBaseUrl: string, apiKey: string, visionModel: string, textModel: string): void {
    this.apiBaseUrl = apiBaseUrl
    this.apiKey = apiKey
    this.visionModel = visionModel || 'gpt-4o'
    this.textModel = textModel || 'gpt-4o'
  }

  // 将本地文件转换为 base64 格式
  private fileToBase64(filePath: string): string {
    const data = readFileSync(filePath)
    const base64 = data.toString('base64')
    const ext = extname(filePath).toLowerCase()
    
    let mimeType = 'image/jpeg'
    if (ext === '.png') mimeType = 'image/png'
    else if (ext === '.webp') mimeType = 'image/webp'
    else if (ext === '.gif') mimeType = 'image/gif'

    return `data:${mimeType};base64,${base64}`
  }

  // 辅助解析 AI 返回的 JSON 文本
  private parseJsonFromResponse(text: string): any {
    let cleanText = text.trim()
    
    // 如果返回带有 markdown code blocks, 去除它们
    if (cleanText.includes('```')) {
      const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (match && match[1]) {
        cleanText = match[1].trim()
      }
    }
    
    // 移除部分模型的乱码前缀
    try {
      return JSON.parse(cleanText)
    } catch (e) {
      console.error('JSON 第一遍解析失败，尝试清洗特殊字符...', e)
      
      // 容错清洗逻辑：寻找第一个 { 和最后一个 }
      const startIdx = cleanText.indexOf('{')
      const endIdx = cleanText.lastIndexOf('}')
      if (startIdx >= 0 && endIdx > startIdx) {
        try {
          return JSON.parse(cleanText.slice(startIdx, endIdx + 1))
        } catch (e2) {
          throw new Error('AI 返回内容无法解析为有效 JSON 格式')
        }
      }
      throw e
    }
  }

  /**
   * 分析单张图片
   */
  public async analyzeImage(imagePath: string, customUsage: string = ''): Promise<AIAnalysis> {
    if (!this.apiKey) {
      throw new Error('未配置 AI API Key，请前往设置页面填写。')
    }

    const base64Image = this.fileToBase64(imagePath)
    
    const systemPrompt = `你是一个专业的电商视觉设计分析师和 AI 图像 Prompt 反推专家。
请根据用户提供的图片，分析图片内容，并输出结构化 JSON。

你需要判断：
1. 图片主体是什么
2. 图片属于什么设计类型
3. 图片适合什么商业用途
4. 图片有哪些视觉风格
5. 图片的构图、色彩、光线、场景特点
6. 如果要用 AI 复刻类似风格，应该如何写 Prompt
7. 这张图片对设计师有什么参考价值

${customUsage ? `【用户特定用途要求】：${customUsage}。请特别围绕此用途重新进行设计思路、优化建议与生图 Prompt 的反推。` : ''}

输出必须是标准的 JSON，不要输出任何多余的 Markdown 标记外的解释。`

    const userPrompt = `请详细分析本张图片，并按如下 JSON 结构返回：
{
  "summary": "图片整体描述",
  "subject": "主体",
  "scene": "场景描述",
  "categoryTags": ["类别标签1", "类别标签2"],
  "styleTags": ["风格标签1", "风格标签2"],
  "usageTags": ["用途标签1", "用途标签2"],
  "colorAnalysis": "色彩分析与色彩逻辑",
  "compositionAnalysis": "构图分析与构图逻辑",
  "lightingAnalysis": "光线与光影逻辑",
  "designThinking": "设计思路分析",
  "commercialUse": ["适合商业平台或途径1", "适合商业平台或途径2"],
  "chinesePrompt": "反推的中文生图 Prompt",
  "englishPrompt": "反推的英文生图 Prompt（适合直接复制至Midjourney/Flux/DALL-E）",
  "shortPrompt": "简短提示词",
  "detailedPrompt": "详细提示词（包含细节、镜头、材质与氛围）",
  "negativePrompt": "负面提示词"
}`

    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.visionModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        // 部分模型不支持 response_format，我们通过 prompt 强约束，不传该参数以保证普适性
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI 请求失败 (状态码: ${response.status}): ${errorText}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('AI 返回内容为空')
    }

    const parsedData = this.parseJsonFromResponse(content)
    
    return {
      summary: parsedData.summary || '',
      subject: parsedData.subject || '',
      scene: parsedData.scene || '',
      styleKeywords: [
        ...(parsedData.categoryTags || []),
        ...(parsedData.styleTags || []),
        ...(parsedData.usageTags || [])
      ],
      colorAnalysis: parsedData.colorAnalysis || '',
      compositionAnalysis: parsedData.compositionAnalysis || `${parsedData.compositionAnalysis || ''}\n${parsedData.lightingAnalysis || ''}`,
      designThinking: parsedData.designThinking || '',
      commercialUse: parsedData.commercialUse || [],
      chinesePrompt: parsedData.chinesePrompt || '',
      englishPrompt: parsedData.englishPrompt || '',
      shortPrompt: parsedData.shortPrompt || '',
      detailedPrompt: parsedData.detailedPrompt || '',
      negativePrompt: parsedData.negativePrompt || '',
      model: this.visionModel,
      createdAt: new Date().toISOString()
    }
  }

  /**
   * 生成多张图片的情景描述
   */
  public async generateSceneDescription(imagePaths: string[]): Promise<SceneDescription> {
    if (!this.apiKey) {
      throw new Error('未配置 AI API Key，请前往设置页面填写。')
    }

    const userContent: any[] = [
      {
        type: 'text',
        text: `分析这组图片，总结统一风格，并按如下 JSON 结构返回：
{
  "styleSummary": "对这一组图片统一风格调性的精炼总结",
  "scene": "对这组图中所反映出的场景、背景的统一融合描述",
  "character": "画面中人物或主要物体的统一形象、情绪、特征描述",
  "clothing": "服装搭配、材质与色彩风格提炼",
  "action": "典型动作、姿势与动态参考建议",
  "camera": "主镜头的选择、构图透视和角度建议",
  "lighting": "主光源类型、色温、光影氛围及材质反光建议",
  "suggestedPrompt": "根据本组图提炼生成的、用于在 Midjourney/Flux 等工具中重现该风格的统一英文提示词 (English Prompt)",
  "shootingAdvice": "为团队提供的适合实拍执行或AI生图调试的实操步骤建议"
}`
      }
    ]

    // 加载所有选定图片
    imagePaths.forEach(path => {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: this.fileToBase64(path)
        }
      })
    })

    const systemPrompt = `你是一个专业的视觉总监和 AI 图像专家。请从用户提供的一组关联参考图中，提取其共同的视觉基因、风格特征与场景设定，并撰写可执行的 AI 提示词与实拍建议。请以纯 JSON 形式返回。`

    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.visionModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI 请求失败 (状态码: ${response.status}): ${errorText}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('AI 返回内容为空')
    }

    return this.parseJsonFromResponse(content)
  }
}
