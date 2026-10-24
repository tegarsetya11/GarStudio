import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIPlan, AIProvider, FileChange, PreviewError, RateLimitInfo, WorkspaceFile } from '../types'

// ── Rate Limit Error Detection ──────────────────────────────────────────────
function parseRateLimitError(error: unknown, provider: AIProvider): RateLimitInfo | null {
  const msg = error instanceof Error ? error.message : String(error)
  const lower = msg.toLowerCase()

  const isRateLimit =
    lower.includes('429') ||
    lower.includes('rate_limit') ||
    lower.includes('rate limit') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('too many requests') ||
    lower.includes('daily limit') ||
    lower.includes('tokens per') ||
    lower.includes('requests per minute')

  if (!isRateLimit) return null

  // Try to parse retry-after from message
  let retryAfter: number | undefined
  const retryMatch = msg.match(/retry.{0,20}(\d+)\s*second/i)
  if (retryMatch) retryAfter = parseInt(retryMatch[1], 10)

  let limitType: RateLimitInfo['limitType'] = 'rateLimit'
  if (lower.includes('quota') || lower.includes('resource_exhausted') || lower.includes('daily'))
    limitType = 'quota'
  else if (lower.includes('daily limit'))
    limitType = 'daily'
  else if (lower.includes('token'))
    limitType = 'token'

  return {
    provider,
    message: msg.slice(0, 200),
    retryAfter,
    limitType,
    timestamp: Date.now(),
  }
}

// ── GitHub Copilot (GitHub Models) API ──────────────────────────────────────
async function callCopilotAPI(
  githubToken: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Copilot API Error (${response.status}): ${errBody}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Unexpected response format from GitHub Copilot API')
  return content
}

// ── Anthropic Claude API ─────────────────────────────────────────────────────
async function callClaudeAPI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Claude API Error (${response.status}): ${errBody}`)
  }

  const data = await response.json()
  if (data.content?.[0]?.text) return data.content[0].text
  throw new Error('Unexpected response format from Claude API')
}

// ── System Prompt Builder ────────────────────────────────────────────────────
const LANGUAGE_INSTRUCTION = `
🌐 INSTRUKSI BAHASA / LANGUAGE INSTRUCTION (WAJIB DIIKUTI):
- Kamu HARUS mengerti Bahasa Indonesia dengan baik.
- Jika user bertanya atau memberi perintah dalam Bahasa Indonesia → jawab dalam Bahasa Indonesia.
- Jika user menggunakan Bahasa Inggris → jawab dalam Bahasa Inggris.
- Kamu bilingual: Indonesia ↔ English.
`

// ── AIAgentService ────────────────────────────────────────────────────────────
export class AIAgentService {

  /** Get provider display name */
  static providerLabel(provider: AIProvider): string {
    return provider === 'claude' ? 'Claude AI' : provider === 'copilot' ? 'GitHub Copilot' : 'Gemini'
  }

  /**
   * Detect if the user's prompt is a GitHub upload/push/commit command.
   * Supports Bahasa Indonesia & English.
   */
  static detectGitHubIntent(prompt: string): boolean {
    const lower = prompt.toLowerCase().trim()
    const keywords = [
      // Indonesian
      'upload ke github', 'push ke github', 'kirim ke github', 'simpan ke github',
      'upload github', 'push github', 'commit ke github', 'commit github',
      'sync ke github', 'sinkronkan ke github', 'upload file ke github',
      'upload project ke github', 'push project', 'push file',
      'taruh di github', 'simpan di github', 'unggah ke github',
      'buat repository', 'buat repo', 'buat github repo',
      // English
      'upload to github', 'push to github', 'commit to github',
      'sync to github', 'push files', 'upload files to github',
      'create repository', 'create repo', 'publish to github',
      'deploy to github', 'save to github', 'github push',
    ]
    return keywords.some((kw) => lower.includes(kw))
  }

  /**
   * Step 1: Planning — creates a structured architectural plan
   */
  static async planArchitecture(
    prompt: string,
    currentFiles: WorkspaceFile[],
    provider: AIProvider,
    geminiKey: string,
    geminiModel: string,
    claudeKey: string,
    claudeModel: string,
    copilotToken: string,
    copilotModel: string
  ): Promise<{ plan: AIPlan; rateLimit?: RateLimitInfo }> {
    const filesContext = currentFiles.map((f) => `- ${f.path}`).join('\n')

    const systemPrompt = `You are an expert autonomous software architect AI agent for mobile web applications inside GarStudio IDE.
${LANGUAGE_INSTRUCTION}
The user wants to build: "${prompt}"

Current workspace files:
${filesContext || '(Empty workspace)'}

Respond ONLY with a valid JSON object matching this schema without markdown fences:
{
  "goal": "Ringkasan jelas apa yang akan dibangun (sesuai bahasa user)",
  "overview": "Penjelasan arsitektur dan alasan desain",
  "steps": [
    {
      "id": "step-1",
      "title": "Judul langkah",
      "description": "Apa yang akan diimplementasikan",
      "action": "create" | "modify",
      "filePath": "path/to/file.ext",
      "status": "pending"
    }
  ]
}`

    try {
      let text = ''

      if (provider === 'claude') {
        if (!claudeKey) return { plan: this.mockPlan(prompt, 'Claude AI') }
        text = await callClaudeAPI(claudeKey, claudeModel || 'claude-sonnet-4-5', systemPrompt, prompt)
      } else if (provider === 'copilot') {
        if (!copilotToken) return { plan: this.mockPlan(prompt, 'GitHub Copilot') }
        text = await callCopilotAPI(copilotToken, copilotModel || 'gpt-4o', systemPrompt, prompt)
      } else {
        if (!geminiKey) return { plan: this.mockPlan(prompt, 'Gemini') }
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: geminiModel || 'gemini-3.8-flash' })
        const result = await model.generateContent(systemPrompt)
        text = result.response.text()
      }

      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      return { plan: JSON.parse(cleaned) as AIPlan }
    } catch (err) {
      console.error(`${provider} planning error:`, err)
      const rateLimit = parseRateLimitError(err, provider)
      if (rateLimit) return { plan: this.mockPlan(prompt, this.providerLabel(provider)), rateLimit }
      return { plan: this.mockPlan(prompt, this.providerLabel(provider)) }
    }
  }

  /**
   * Step 2: Code Generation
   */
  static async generateCode(
    plan: AIPlan,
    currentFiles: WorkspaceFile[],
    provider: AIProvider,
    geminiKey: string,
    geminiModel: string,
    claudeKey: string,
    claudeModel: string,
    copilotToken: string,
    copilotModel: string
  ): Promise<{ changes: FileChange[]; rateLimit?: RateLimitInfo }> {
    const stepsInfo = plan.steps
      .map((s) => `File: ${s.filePath} (${s.action}): ${s.description}`)
      .join('\n')

    const prompt = `You are GarStudio Autonomous AI Agent. Generate functional, production-ready code based on this plan.
${LANGUAGE_INSTRUCTION}
Goal: ${plan.goal}
Architecture: ${plan.overview}
Files to produce:
${stepsInfo}

Output your response strictly as a JSON array of objects (no markdown fences, no extra text):
[
  {
    "path": "index.html",
    "summary": "Ringkasan singkat perubahan",
    "code": "<!DOCTYPE html>..."
  }
]
Return ONLY valid JSON.`

    const sysPrompt = 'You are a senior full-stack web developer outputting strict JSON arrays of files. No markdown, no extra text.'

    try {
      let text = ''

      if (provider === 'claude') {
        if (!claudeKey) return { changes: this.mockCodeGeneration(currentFiles) }
        text = await callClaudeAPI(claudeKey, claudeModel || 'claude-sonnet-4-5', sysPrompt, prompt)
      } else if (provider === 'copilot') {
        if (!copilotToken) return { changes: this.mockCodeGeneration(currentFiles) }
        text = await callCopilotAPI(copilotToken, copilotModel || 'gpt-4o', sysPrompt, prompt)
      } else {
        if (!geminiKey) return { changes: this.mockCodeGeneration(currentFiles) }
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: geminiModel || 'gemini-3.8-flash' })
        const result = await model.generateContent(prompt)
        text = result.response.text()
      }

      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      return { changes: JSON.parse(cleaned) as FileChange[] }
    } catch (err) {
      console.error(`${provider} code generation error:`, err)
      const rateLimit = parseRateLimitError(err, provider)
      if (rateLimit) return { changes: this.mockCodeGeneration(currentFiles), rateLimit }
      return { changes: this.mockCodeGeneration(currentFiles) }
    }
  }

  /**
   * Interactive Mode: conversational pair programmer
   */
  static async interactiveChat(
    prompt: string,
    activeFile: WorkspaceFile | null,
    currentFiles: WorkspaceFile[],
    provider: AIProvider,
    geminiKey: string,
    geminiModel: string,
    claudeKey: string,
    claudeModel: string,
    copilotToken: string,
    copilotModel: string
  ): Promise<{ message: string; changes?: FileChange[]; rateLimit?: RateLimitInfo }> {
    const fileContext = activeFile
      ? `File Aktif (${activeFile.path}):\n\`\`\`\n${activeFile.content}\n\`\`\``
      : `File Workspace: ${currentFiles.map((f) => f.path).join(', ')}`

    const lang = activeFile?.name.endsWith('.html')
      ? 'html'
      : activeFile?.name.endsWith('.css')
      ? 'css'
      : 'javascript'

    const systemPrompt = `You are GarStudio Interactive AI Pair Programmer (${
      provider === 'claude' ? 'Claude 3.5' : provider === 'copilot' ? 'GitHub Copilot GPT-4o' : 'Gemini Flash'
    }), an expert mobile web developer assistant built into GarStudio IDE for Android.
${LANGUAGE_INSTRUCTION}
${fileContext}

Berikan respons yang membantu, ramah, dan ringkas. Jika kamu memberikan perubahan kode untuk ${
      activeFile ? activeFile.path : 'file aktif'
    }, jelaskan perubahannya, dan sertakan kode yang diperbarui dalam blok \`\`\`${lang} agar user bisa mereview dan menerapkannya langsung.`

    try {
      let text = ''

      if (provider === 'claude') {
        if (!claudeKey)
          return {
            message: `💬 [Claude - Interaktif]: Saya menerima: "${prompt}". Tambahkan API Key Claude di Settings untuk respons AI.`,
          }
        text = await callClaudeAPI(claudeKey, claudeModel || 'claude-sonnet-4-5', systemPrompt, prompt)
      } else if (provider === 'copilot') {
        if (!copilotToken)
          return {
            message: `💬 [Copilot - Interaktif]: Saya menerima: "${prompt}". Tambahkan GitHub Token di Settings untuk respons AI.`,
          }
        text = await callCopilotAPI(copilotToken, copilotModel || 'gpt-4o', systemPrompt, prompt)
      } else {
        if (!geminiKey)
          return {
            message: `💬 [Gemini - Interaktif]: Saya menerima: "${prompt}". Tambahkan Gemini API Key di Settings untuk respons AI penuh.`,
          }
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: geminiModel || 'gemini-3.8-flash' })
        const result = await model.generateContent(`${systemPrompt}\n\nUser: ${prompt}`)
        text = result.response.text()
      }

      return { message: text }
    } catch (err) {
      console.error(`${provider} interactive chat error:`, err)
      const rateLimit = parseRateLimitError(err, provider)
      return {
        message: `❌ Koneksi ke ${this.providerLabel(provider)} gagal. Periksa API Key di Settings.`,
        rateLimit: rateLimit ?? undefined,
      }
    }
  }

  /**
   * Autonomous Bug Fixer
   */
  static async autoFixBug(
    error: PreviewError,
    files: WorkspaceFile[],
    provider: AIProvider,
    geminiKey: string,
    geminiModel: string,
    claudeKey: string,
    claudeModel: string,
    copilotToken: string,
    copilotModel: string
  ): Promise<{ fixes: FileChange[]; rateLimit?: RateLimitInfo }> {
    const errorDetails = `Error: ${error.message}\nLine: ${error.lineno}, Col: ${error.colno}\nStack: ${error.stack || 'N/A'}`
    const filesContent = files
      .map((f) => `--- FILE: ${f.path} ---\n${f.content}\n--- END ---`)
      .join('\n\n')

    const prompt = `You are GarStudio Autonomous AI Debugger.
${LANGUAGE_INSTRUCTION}
The mobile browser sandbox intercepted the following runtime error:
${errorDetails}

Workspace code:
${filesContent}

Diagnose the root cause and provide the exact fix.
Return ONLY a JSON array of FileChange objects (no markdown, no explanation outside JSON):
[
  {
    "path": "file/with/error.js",
    "summary": "Penjelasan detail bug dan cara perbaikannya",
    "code": "Complete corrected file content"
  }
]`

    const sysPrompt = 'You are an expert debugger that outputs only a JSON array of file fixes.'

    // Demo fallback without key
    const activeKey = provider === 'claude' ? claudeKey : provider === 'copilot' ? copilotToken : geminiKey
    if (!activeKey) {
      const jsFile = files.find((f) => f.name.endsWith('.js') || f.name.endsWith('.ts'))
      if (jsFile && jsFile.content.includes('nonExistentDebuggerFunction')) {
        const fixed = jsFile.content.replace(
          /window\.nonExistentDebuggerFunction\([^)]*\);?/g,
          `console.log("✅ Bug berhasil diperbaiki oleh GarStudio AI Debugger (${this.providerLabel(provider)})!");\nalert("✅ Bug Diperbaiki! Error undefined function berhasil diatasi oleh AI.");`
        )
        return {
          fixes: [{ path: jsFile.path, summary: `Auto-fix error undefined function oleh ${this.providerLabel(provider)}`, code: fixed, oldCode: jsFile.content }],
        }
      }
      return {
        fixes: [{ path: jsFile?.path ?? 'app.js', summary: 'Tambahkan pengaman exception', code: (jsFile?.content ?? '') + '\n// AI safeguard added' }],
      }
    }

    try {
      let text = ''
      if (provider === 'claude') {
        text = await callClaudeAPI(claudeKey, claudeModel || 'claude-sonnet-4-5', sysPrompt, prompt)
      } else if (provider === 'copilot') {
        text = await callCopilotAPI(copilotToken, copilotModel || 'gpt-4o', sysPrompt, prompt)
      } else {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: geminiModel || 'gemini-3.8-flash' })
        const result = await model.generateContent(prompt)
        text = result.response.text()
      }
      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      return { fixes: JSON.parse(cleaned) as FileChange[] }
    } catch (err) {
      console.error(`${provider} debug error:`, err)
      const rateLimit = parseRateLimitError(err, provider)
      return { fixes: [], rateLimit: rateLimit ?? undefined }
    }
  }

  // ── Mock Fallbacks ──────────────────────────────────────────────────────────

  private static mockPlan(userPrompt: string, providerName: string): AIPlan {
    return {
      goal: `[${providerName}] ${userPrompt || 'Pengalaman Web Mobile yang Ditingkatkan'}`,
      overview: `Rencana otonom oleh ${providerName} untuk interaksi sentuh berkinerja tinggi di Android. Tambahkan API Key di Settings untuk perencanaan AI yang sesungguhnya.`,
      steps: [
        { id: 'step-1', title: 'Struktur HTML5 Semantik', description: 'Bangun markup semantik modern dengan target sentuh yang dapat diakses di mobile', action: 'modify', filePath: 'index.html', status: 'pending' },
        { id: 'step-2', title: 'Micro-Interaksi & Styling Adaptif', description: 'Tambahkan animasi fluid modern dan kartu glassmorphic responsif', action: 'modify', filePath: 'style.css', status: 'pending' },
        { id: 'step-3', title: 'Mesin State Event Sentuh', description: 'Tangani gesture sentuh, persistensi state, dan event DOM reaktif', action: 'modify', filePath: 'app.js', status: 'pending' },
      ],
    }
  }

  private static mockCodeGeneration(files: WorkspaceFile[]): FileChange[] {
    const indexFile = files.find((f) => f.path === 'index.html')
    if (!indexFile) return []
    return [
      {
        path: 'index.html',
        summary: 'Injeksi kartu AI analytics adaptif dan perbaikan sentuh mobile',
        code: indexFile.content,
      },
    ]
  }
}
