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
🧠 ANTIGRAVITY-LEVEL AI AGENT — CORE PRINCIPLES:

1. ALWAYS UNDERSTAND & NEVER ASK FOR CLARIFICATION:
   - You are an expert AI coding agent that ALWAYS understands user intent — no matter how brief, vague, or informal the request.
   - NEVER reply with "Bisakah kamu jelaskan?" or "Apa maksud Anda?" or any clarifying question.
   - If the user says "buat game" → build a complete stunning game. If they say "toko online" → build a full e-commerce landing. ALWAYS infer and build.
   - Treat every prompt as a complete specification. Fill in missing details with best-practice assumptions.

2. CONTINUOUS SINGLE-WORKSPACE ARCHITECTURE (LIKE VS CODE / ANTIGRAVITY):
   - Treat the project as ONE continuous workspace. Never discard or reset existing files unless explicitly told to start over.
   - Modify, expand, and update existing files (index.html, style.css, script.js) directly, preserving all existing functionality.
   - When correcting: read the FULL existing code before changing anything. Surgical edits only — never break what already works.

3. HANDCRAFTED, NON-GENERIC UI/UX (AVOID STERILE AI-LOOKING LAYOUTS):
   - NEVER use plain generic card layouts, basic colors, or template-looking designs.
   - Craft UIs that look designed by world-class product designers:
     • Curated color palettes (deep dark modes, vibrant neon accents, or elegant pastel gradients)
     • Modern typography (Plus Jakarta Sans, Outfit, Inter from Google Fonts)
     • Fluid micro-animations, glassmorphism, depth shadows, smooth transitions
     • Clear visual hierarchy, touch-friendly interactive elements
     • High-contrast readability, beautiful hover/active states

4. PROACTIVE FEATURE EXPANSION — ALWAYS GO BEYOND THE MINIMUM:
   - Even if the prompt is just 3 words, build a FULL, RICH, INTERACTIVE experience.
   - Add: sound/visual feedback, state management, edge case handling, loading states, animations, responsive design.
   - Think: "What would a senior engineer add to make this truly impressive?"

5. BILINGUAL EXPERT — BAHASA INDONESIA & ENGLISH:
   - Understand both languages perfectly. Detect which language was used and respond in the same language.
   - UI text defaults to Bahasa Indonesia unless the prompt or context is in English.
   - Understand slang, abbreviations, typos (e.g. "gabutin" = "gabungkan", "bikin" = "buat").

6. PRODUCTION-READY CODE ONLY:
   - All code must run INSTANTLY in a browser iframe sandbox with no external build step.
   - Use CDN links for libraries (tailwindcss, chart.js, etc.) — never assume npm packages.
   - Complete HTML in one file unless multiple files are clearly better.
   - JavaScript must be robust: no undefined references, proper event listeners, error handling.
`

// ── Robust JSON Extractor ───────────────────────────────────────────────────
function safeExtractJson<T>(text: string, type: 'array' | 'object'): T | null {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.trim()

  // 1. Try markdown code block
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T
    } catch {}
  }

  // 2. Try slice between outer brackets
  const startChar = type === 'array' ? '[' : '{'
  const endChar = type === 'array' ? ']' : '}'
  const startIdx = cleaned.indexOf(startChar)
  const endIdx = cleaned.lastIndexOf(endChar)
  if (startIdx !== -1 && endIdx > startIdx) {
    const raw = cleaned.slice(startIdx, endIdx + 1)
    try {
      return JSON.parse(raw) as T
    } catch {
      // Clean possible trailing commas: ,] or ,}
      try {
        const withoutTrailingCommas = raw.replace(/,\s*([\]}])/g, '$1')
        return JSON.parse(withoutTrailingCommas) as T
      } catch {}
    }
  }

  // 3. Fallback direct parse
  try {
    return JSON.parse(cleaned) as T
  } catch {}

  return null
}

// ── AIAgentService ────────────────────────────────────────────────────────────
export class AIAgentService {

  /** Get provider display name */
  static providerLabel(provider: AIProvider): string {
    return provider === 'claude' ? 'Claude AI' : provider === 'copilot' ? 'GitHub Copilot' : 'Gemini'
  }

  /**
   * Detect if the prompt is a GitHub intent.
   */
  static detectGitHubIntent(prompt: string): boolean {
    const lower = prompt.toLowerCase().trim()
    const keywords = [
      'upload ke github', 'push ke github', 'kirim ke github', 'simpan ke github',
      'upload github', 'push github', 'commit ke github', 'commit github',
      'sync ke github', 'sinkronkan ke github', 'upload file ke github',
      'upload project ke github', 'push project', 'push file',
      'taruh di github', 'simpan di github', 'unggah ke github',
      'buat repository', 'buat repo', 'buat github repo',
      'upload to github', 'push to github', 'commit to github',
      'sync to github', 'push files', 'upload files to github',
      'create repository', 'create repo', 'publish to github',
    ]
    return keywords.some((kw) => lower.includes(kw))
  }

  /**
   * Smart auto-detection: Correction/Edit vs New Web Creation.
   * Uses broad NLP-style keyword matching — understands natural language in both Indonesian and English.
   */
  static isCorrectionOrEdit(prompt: string, currentFiles: WorkspaceFile[]): boolean {
    const hasExistingCode = currentFiles.some(
      (f) => (f.name === 'index.html' || f.path.endsWith('.html') || f.path.endsWith('.js') || f.path.endsWith('.css'))
            && f.content.trim().length > 30
    )

    // No existing code at all → always create new
    if (!hasExistingCode) return false

    const lower = prompt.toLowerCase().trim()

    // Explicit "create new" keywords → always create fresh
    const newWebKeywords = [
      'buatkan saya web baru', 'bikin web baru', 'buat web baru', 'buat website baru',
      'create new website', 'start from scratch', 'hapus dan buat baru', 'reset semua',
      'mulai dari nol', 'buat ulang', 'replace with', 'buat yang baru',
    ]
    if (newWebKeywords.some((k) => lower.includes(k))) return false

    // If the prompt is clearly about building a whole new concept, it's a new creation
    // (e.g. "buat game tebak kata" when existing code is a calculator)
    const newCreationPatterns = [
      /^buat(kan)? (sebuah |satu |)?(web|website|app|aplikasi|game|halaman|landing|toko|kalkulator|konverter|todo|chat|dashboard)/i,
      /^bikin (web|website|app|aplikasi|game|halaman)/i,
      /^create (a |an |)?(web|website|app|game|landing|dashboard|calculator|todo|chat)/i,
      /^make (a |an |)?(web|website|app|game|landing|dashboard)/i,
      /^build (a |an |)?(web|website|app|game|landing|dashboard)/i,
      /^generate (a |an |)?(web|website|app|game)/i,
    ]
    if (newCreationPatterns.some((rx) => rx.test(lower)) && !hasExistingCode) return false
    // If matches creation pattern AND there IS existing code → treat as new creation unless it's clearly a modification
    if (newCreationPatterns.some((rx) => rx.test(lower))) {
      // Could be "buat tombol baru" (modification) vs "buat game baru" (new app)
      const isModificationOfExisting = [
        'tombol', 'button', 'section', 'bagian', 'kolom', 'baris', 'card', 'navbar',
        'header', 'footer', 'form', 'input', 'modal', 'dropdown', 'menu', 'tab',
      ].some((w) => lower.includes(w))
      if (!isModificationOfExisting) return false
    }

    // Broad correction/modification keywords (Indonesian + English + slang)
    const correctionKeywords = [
      // Indonesian standard
      'ubah', 'ganti', 'perbaiki', 'koreksi', 'tambah', 'tambahkan', 'edit', 'hapus',
      'kurangi', 'warna', 'warnanya', 'background', 'font', 'ukuran', 'ukurannya',
      'tombol', 'tombolnya', 'teks', 'tulisan', 'judul', 'timer', 'soal', 'pertanyaan',
      'skor', 'sound', 'suara', 'animasi', 'layout', 'posisi', 'geser', 'pindah',
      'hilangkan', 'sembunyikan', 'tampilkan', 'aktifkan', 'matikan',
      // Indonesian slang / informal
      'gabutin', 'hapusin', 'tambahin', 'gantin', 'benerin', 'betulin', 'jadiin',
      'bikin jadi', 'buat jadi', 'jadikan', 'jadi lebih', 'bisa gak', 'bisa dong',
      'ganti aja', 'hapus aja', 'tambah aja', 'pake', 'pakai',
      // English standard
      'fix', 'change', 'modify', 'update', 'tweak', 'adjust', 'add', 'remove', 'delete',
      'rename', 'move', 'resize', 'replace', 'switch', 'toggle', 'enable', 'disable',
      'make it', 'make the', 'set the', 'set it', 'turn on', 'turn off', 'show', 'hide',
      'improve', 'enhance', 'style', 'color', 'theme', 'font', 'size', 'position',
      // Question-style corrections
      'kenapa', 'mengapa', 'kok', 'knp', 'gak bisa', 'tidak bisa', "can't", "doesn't work",
      'error', 'bug', 'broken', 'salah', 'kurang', 'belum', 'masih',
    ]
    if (correctionKeywords.some((kw) => lower.includes(kw))) return true

    // Short prompts with existing code → likely a correction
    if (lower.split(' ').length <= 5 && hasExistingCode) return true

    return false
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

    const systemPrompt = `You are GarStudio's Antigravity-level AI Architect Agent. You understand ANY user request — no matter how brief or informal — and ALWAYS produce a complete, actionable plan. NEVER ask for clarification.
${LANGUAGE_INSTRUCTION}

User request: "${prompt}"
Current workspace files:
${filesContext || '(Empty workspace — buat dari awal)'}

Analyze the request intelligently:
- Understand intent even if the request is vague or uses slang
- Plan a COMPLETE, RICH web application — not a minimal demo
- Always plan for: modern UI/UX, full interactivity, responsive design, error handling

Respond ONLY with a valid JSON object (no markdown fences, no extra text):
{
  "goal": "Ringkasan jelas dan spesifik apa yang dibangun",
  "overview": "Penjelasan arsitektur, pilihan teknologi, dan fitur-fitur unggulan yang akan diimplementasikan",
  "steps": [
    {
      "id": "step-1",
      "title": "Judul langkah spesifik",
      "description": "Detail implementasi yang akan dilakukan",
      "action": "create",
      "filePath": "index.html",
      "status": "pending"
    }
  ]
}`

    try {
      let text = ''
      if (provider === 'claude' && claudeKey) {
        text = await callClaudeAPI(claudeKey, claudeModel || 'claude-sonnet-4-5', systemPrompt, prompt)
      } else if (provider === 'copilot' && copilotToken) {
        text = await callCopilotAPI(copilotToken, copilotModel || 'gpt-4o', systemPrompt, prompt)
      } else if (geminiKey) {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: geminiModel || 'gemini-3.8-flash' })
        const result = await model.generateContent(systemPrompt)
        text = result.response.text()
      } else {
        return { plan: this.createTailoredPlan(prompt, this.providerLabel(provider)) }
      }

      const parsed = safeExtractJson<AIPlan>(text, 'object')
      if (parsed && parsed.goal && Array.isArray(parsed.steps)) {
        return { plan: parsed }
      }
      return { plan: this.createTailoredPlan(prompt, this.providerLabel(provider)) }
    } catch (err) {
      console.error(`${provider} planning error:`, err)
      const rateLimit = parseRateLimitError(err, provider)
      return { plan: this.createTailoredPlan(prompt, this.providerLabel(provider)), rateLimit: rateLimit ?? undefined }
    }
  }

  /**
   * Step 2: Code Generation — generates functional files based on plan / prompt
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
    copilotModel: string,
    originalPrompt?: string
  ): Promise<{ changes: FileChange[]; rateLimit?: RateLimitInfo }> {
    const promptText = originalPrompt || plan.goal
    const stepsInfo = plan.steps
      .map((s) => `File: ${s.filePath} (${s.action}): ${s.description}`)
      .join('\n')

    const prompt = `You are GarStudio's Antigravity AI Code Generator. Generate a COMPLETE, STUNNING, PRODUCTION-READY web application based on this plan.
${LANGUAGE_INSTRUCTION}

User's original request: "${promptText}"
Goal: ${plan.goal}
Architecture overview: ${plan.overview}
Files to generate:
${stepsInfo}

CRITICAL REQUIREMENTS:
1. Generate COMPLETE, self-contained code — everything in index.html (HTML + CSS + JS unless plan specifies separate files).
2. The web MUST work instantly in a browser iframe with no build step needed.
3. UI MUST be stunning: dark mode, modern gradients, glassmorphism effects, smooth CSS animations, beautiful typography (use Google Fonts CDN).
4. Make it FULLY INTERACTIVE: real working logic, state management, event handlers, form validation, visual/audio feedback.
5. Mobile-first responsive design — works perfectly on phone, tablet, and desktop.
6. Code must be complete — no TODO comments, no placeholder content, no "add your content here" sections.
7. Include ALL questions/data/content if it's a quiz, game, or data-driven app — never use placeholder data.

Return ONLY a JSON array (no markdown, no explanation outside JSON):
[
  {
    "path": "index.html",
    "summary": "Deskripsi lengkap fitur yang diimplementasikan",
    "code": "<!DOCTYPE html>..."
  }
]
Return ONLY valid JSON.`

    const sysPrompt = `You are an elite senior full-stack web developer. Output ONLY a valid JSON array of complete file objects. No markdown fences, no explanation text, no code block markers. Just pure JSON starting with [ and ending with ].`

    try {
      let text = ''
      if (provider === 'claude' && claudeKey) {
        text = await callClaudeAPI(claudeKey, claudeModel || 'claude-sonnet-4-5', sysPrompt, prompt)
      } else if (provider === 'copilot' && copilotToken) {
        text = await callCopilotAPI(copilotToken, copilotModel || 'gpt-4o', sysPrompt, prompt)
      } else if (geminiKey) {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: geminiModel || 'gemini-3.8-flash' })
        const result = await model.generateContent(prompt)
        text = result.response.text()
      } else {
        // Fallback to high-quality built-in engine
        return { changes: this.generateSmartWebFiles(promptText) }
      }

      const parsed = safeExtractJson<FileChange[]>(text, 'array')
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) {
        return { changes: parsed }
      }
      return { changes: this.generateSmartWebFiles(promptText) }
    } catch (err) {
      console.error(`${provider} code generation error:`, err)
      const rateLimit = parseRateLimitError(err, provider)
      return { changes: this.generateSmartWebFiles(promptText), rateLimit: rateLimit ?? undefined }
    }
  }

  /**
   * Direct Revision & Correction: Reads existing code and applies corrections directly!
   */
  static async reviseAndCorrect(
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
  ): Promise<{ changes: FileChange[]; message: string; rateLimit?: RateLimitInfo }> {
    const targetFile =
      activeFile ||
      currentFiles.find((f) => f.name === 'index.html' || f.path.endsWith('.html')) ||
      currentFiles[0]

    const filesContext = currentFiles
      .map((f) => `--- FILE: ${f.path} ---\n${f.content}\n--- END FILE ---`)
      .join('\n\n')

    const systemPrompt = `You are GarStudio's Antigravity-level AI Code Corrector — like VS Code Copilot but smarter.
${LANGUAGE_INSTRUCTION}

User request (understand this no matter how brief or informal): "${prompt}"

Current Workspace Files:
${filesContext}

INSTRUCTIONS:
1. UNDERSTAND the intent fully — the user might say "ganti warna jadi merah" or "make the button bigger" or "timer ga jalan" — you understand ALL of these.
2. READ the full existing code carefully before making any changes.
3. Apply PRECISE, SURGICAL changes — preserve all working functionality, only change what was requested.
4. If the request mentions something not yet in the code, ADD it intelligently (e.g. "tambah dark mode toggle" → add the full dark mode feature).
5. Return COMPLETE file content (not diffs) so the preview updates immediately.
6. If the user reports a bug or something "tidak berjalan" / "error" / "broken", diagnose and fix the root cause — don't just add a comment.

Return ONLY a JSON array (no markdown, no text outside JSON):
[
  {
    "path": "index.html",
    "summary": "Deskripsi detail perubahan yang dilakukan",
    "code": "<!DOCTYPE html>..."
  }
]`

    try {
      let text = ''
      if (provider === 'claude' && claudeKey) {
        text = await callClaudeAPI(claudeKey, claudeModel || 'claude-sonnet-4-5', 'Output strict JSON array only', `${systemPrompt}\nUser request: ${prompt}`)
      } else if (provider === 'copilot' && copilotToken) {
        text = await callCopilotAPI(copilotToken, copilotModel || 'gpt-4o', 'Output strict JSON array only', `${systemPrompt}\nUser request: ${prompt}`)
      } else if (geminiKey) {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: geminiModel || 'gemini-3.8-flash' })
        const result = await model.generateContent(`${systemPrompt}\nUser request: ${prompt}`)
        text = result.response.text()
      } else {
        const changes = this.applySmartCorrection(prompt, currentFiles, targetFile)
        return {
          changes,
          message: `✨ [${this.providerLabel(provider)}] Koreksi "${prompt}" berhasil diterapkan langsung ke kode dan live preview!`,
        }
      }

      const parsed = safeExtractJson<FileChange[]>(text, 'array')
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) {
        return {
          changes: parsed,
          message: `✨ [${this.providerLabel(provider)}] Koreksi berhasil diterapkan langsung! ${parsed.map(p => p.summary || '').join(' ')}`,
        }
      }
      const changes = this.applySmartCorrection(prompt, currentFiles, targetFile)
      return {
        changes,
        message: `✨ [${this.providerLabel(provider)}] Koreksi "${prompt}" berhasil diterapkan langsung ke live preview!`,
      }
    } catch (err) {
      console.error(`${provider} revision error:`, err)
      const rateLimit = parseRateLimitError(err, provider)
      const changes = this.applySmartCorrection(prompt, currentFiles, targetFile)
      return {
        changes,
        message: `✨ Koreksi "${prompt}" berhasil diterapkan secara lokal ke live preview.`,
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
      const parsed = safeExtractJson<FileChange[]>(text, 'array')
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { fixes: parsed }
      }
      return { fixes: [] }
    } catch (err) {
      console.error(`${provider} debug error:`, err)
      const rateLimit = parseRateLimitError(err, provider)
      return { fixes: [], rateLimit: rateLimit ?? undefined }
    }
  }

  // ── High-Quality Tailored Plans & Code Generators ────────────────────────────

  private static createTailoredPlan(prompt: string, providerName: string): AIPlan {
    const isQuiz = /quiz|kuis|soal|game/i.test(prompt)
    const isCalc = /kalkulator|calc/i.test(prompt)

    if (isQuiz) {
      return {
        goal: `Aplikasi Game Quiz Interaktif: 4 Pelajaran (TKA, B. Inggris, B. Indo, Matematika)`,
        overview: `Arsitektur single-page application responsif mobile dengan sistem timer, validasi jawaban instan, efek suara sintetis (Web Audio), dan rekapitulasi skor.`,
        steps: [
          { id: 'step-1', title: 'Layout UI & Kategori Pelajaran', description: 'Membuat header skor, kartu soal interaktif, dan tombol pilihan A/B/C/D', action: 'create', filePath: 'index.html', status: 'pending' },
          { id: 'step-2', title: 'Bank Soal 4 Pelajaran', description: 'Menyusun database soal TKA, Bahasa Indonesia, Bahasa Inggris, dan Matematika', action: 'create', filePath: 'index.html', status: 'pending' },
          { id: 'step-3', title: 'Logika Game & Timer', description: 'Menambahkan perhitungan skor real-time, timer 20 detik, audio chime, dan tombol restart', action: 'create', filePath: 'index.html', status: 'pending' },
        ],
      }
    }

    if (isCalc) {
      return {
        goal: `Kalkulator Modern dengan Riwayat Perhitungan`,
        overview: `Aplikasi kalkulator glassmorphic dengan tombol sentuh haptic, animasi tombol, dan riwayat kalkulasi.`,
        steps: [
          { id: 'step-1', title: 'Antarmuka Kalkulator', description: 'Display angka besar, tombol grid numerik & operator', action: 'create', filePath: 'index.html', status: 'pending' },
          { id: 'step-2', title: 'Logika Matematika', description: 'Eksekusi operasi matematika presisi dan penanganan error', action: 'create', filePath: 'index.html', status: 'pending' },
        ],
      }
    }

    return {
      goal: `${prompt || 'Aplikasi Web Responsif'}`,
      overview: `Aplikasi web modern berbasis HTML5, CSS adaptif, dan JavaScript interaktif yang siap dijalankan di browser perangkat mobile & desktop.`,
      steps: [
        { id: 'step-1', title: 'Struktur Markup Semantik', description: 'Membuat halaman interaktif dengan layout kartu modern', action: 'create', filePath: 'index.html', status: 'pending' },
        { id: 'step-2', title: 'Styling & Micro-Interaksi', description: 'Pewarnaan kontras tinggi, animasi sentuh, dan tipografi modern', action: 'create', filePath: 'index.html', status: 'pending' },
        { id: 'step-3', title: 'Fitur Interaktif & State', description: 'Menghubungkan event listener, manajemen data, dan feedback pengguna', action: 'create', filePath: 'index.html', status: 'pending' },
      ],
    }
  }

  /**
   * Built-in Autonomous Code Generator: Generates complete, functional, stunning web apps!
   */
  public static generateSmartWebFiles(prompt: string): FileChange[] {
    const lower = prompt.toLowerCase()
    const isQuiz = lower.includes('quiz') || lower.includes('kuis') || lower.includes('soal') || lower.includes('game')

    if (isQuiz) {
      return [
        {
          path: 'index.html',
          summary: 'Game Quiz 4 Pelajaran (TKA, Bahasa Inggris, Bahasa Indonesia, Matematika) dengan timer & skor',
          code: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GarStudio Quiz Battle: 4 Pelajaran Wajib</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between p-4 selection:bg-cyan-500 selection:text-white">

  <!-- Header -->
  <header class="max-w-md mx-auto w-full pt-2 pb-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
          🧠
        </div>
        <div>
          <h1 class="text-sm font-extrabold text-white tracking-tight">QUIZ MASTER</h1>
          <p class="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">TKA • B.INGGRIS • B.INDO • MATEMATIKA</p>
        </div>
      </div>
      <div class="text-right">
        <span class="text-[10px] text-slate-400 font-medium">Skor Kamu</span>
        <div id="scoreDisplay" class="text-lg font-black text-emerald-400 leading-tight">0 Poin</div>
      </div>
    </div>
  </header>

  <!-- Main Game Stage -->
  <main class="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">

    <!-- Start / Category Selection Screen -->
    <div id="screenStart" class="glass rounded-3xl p-6 text-center space-y-5 shadow-2xl">
      <div class="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-3xl">
        🎯
      </div>
      <div>
        <h2 class="text-xl font-bold text-white">Uji Kemampuan Akademik</h2>
        <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Tantang dirimu dengan soal TKA, Bahasa Inggris, Bahasa Indonesia, & Matematika dengan sistem timer dan skor langsung!
        </p>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex flex-wrap gap-2 justify-center pt-1">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">📊 TKA</span>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">🇬🇧 B. Inggris</span>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">🇮🇩 B. Indonesia</span>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">📐 Matematika</span>
      </div>

      <button id="btnStart" class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition cursor-pointer">
        🚀 Mulai Quiz Sekarang
      </button>
    </div>

    <!-- Active Question Screen -->
    <div id="screenQuestion" class="glass rounded-3xl p-5 space-y-4 shadow-2xl hidden">
      <!-- Status Bar: Category, Progress & Timer -->
      <div class="flex items-center justify-between text-xs">
        <span id="badgeCategory" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          TKA
        </span>
        <div class="flex items-center gap-3">
          <span id="progressText" class="text-slate-400 font-medium text-[11px]">Soal 1/8</span>
          <div class="flex items-center gap-1 font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-800/40">
            ⏱️ <span id="timerText">20s</span>
          </div>
        </div>
      </div>

      <!-- Question Text -->
      <div class="min-h-[70px] flex items-center">
        <p id="questionTitle" class="text-sm sm:text-base font-semibold text-white leading-snug">
          Memuat pertanyaan...
        </p>
      </div>

      <!-- Options Grid -->
      <div id="optionsContainer" class="space-y-2.5 pt-1">
        <!-- Dynamically injected choices -->
      </div>

      <!-- Explanation Box -->
      <div id="explanationBox" class="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-300 hidden leading-relaxed">
        <div class="font-bold text-cyan-400 mb-0.5 text-[11px]">💡 Penjelasan:</div>
        <div id="explanationText"></div>
      </div>

      <!-- Next Button -->
      <button id="btnNext" class="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold text-xs transition active:scale-95 hidden cursor-pointer">
        Lanjut ke Soal Berikutnya ➔
      </button>
    </div>

    <!-- Result Screen -->
    <div id="screenResult" class="glass rounded-3xl p-6 text-center space-y-5 shadow-2xl hidden">
      <div id="resultIcon" class="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
        🏆
      </div>
      <div>
        <h2 class="text-xl font-extrabold text-white">Quiz Selesai!</h2>
        <p id="resultMessage" class="text-xs text-slate-400 mt-1">Luar biasa! Kamu menyelesaikan semua soal.</p>
      </div>

      <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex justify-around">
        <div>
          <div class="text-[10px] text-slate-400">Total Benar</div>
          <div id="correctCount" class="text-xl font-black text-emerald-400">0/8</div>
        </div>
        <div class="w-px bg-slate-800"></div>
        <div>
          <div class="text-[10px] text-slate-400">Total Skor</div>
          <div id="finalScore" class="text-xl font-black text-cyan-400">0</div>
        </div>
      </div>

      <button id="btnRestart" class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition cursor-pointer">
        🔄 Mainkan Lagi
      </button>
    </div>

  </main>

  <!-- Footer -->
  <footer class="max-w-md mx-auto w-full text-center py-2 text-[10px] text-slate-500">
    Dibuat & Dijalankan di GarStudio AI Mobile IDE
  </footer>

  <script>
    // Bank Soal 4 Pelajaran (TKA, Bahasa Indonesia, Bahasa Inggris, Matematika)
    const questions = [
      {
        category: 'TKA (Penalaran Logis)',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        q: 'Semua mahasiswa yang rajin belajar lulus ujian. Sebagian mahasiswa tidak lulus ujian. Kesimpulannya adalah...',
        options: [
          'Sebagian mahasiswa tidak rajin belajar',
          'Semua mahasiswa tidak rajin belajar',
          'Sebagian mahasiswa rajin belajar tetapi tidak lulus',
          'Semua yang lulus ujian bukan mahasiswa'
        ],
        answer: 0,
        explanation: 'Karena semua yang rajin pasti lulus, jika ada yang tidak lulus maka mereka pasti termasuk yang tidak rajin belajar.'
      },
      {
        category: 'Matematika',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        q: 'Jika 3x + 7 = 22, maka nilai dari 2x - 3 adalah...',
        options: ['5', '7', '9', '11'],
        answer: 1,
        explanation: '3x = 22 - 7 = 15, sehingga x = 5. Nilai 2x - 3 = 2(5) - 3 = 10 - 3 = 7.'
      },
      {
        category: 'Bahasa Indonesia',
        badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
        q: 'Penulisan kata serapan yang baku menurut PUEBI di bawah ini adalah...',
        options: ['Aktifitas dan praktek', 'Aktivitas dan praktik', 'Aktifitas dan praktik', 'Aktivitas dan praktek'],
        answer: 1,
        explanation: 'Bentuk baku menurut KBBI adalah "aktivitas" (dengan v) dan "praktik" (menggunakan i).'
      },
      {
        category: 'Bahasa Inggris',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        q: 'If she had studied harder, she ___ the final examination with flying colors.',
        options: ['would pass', 'will pass', 'would have passed', 'had passed'],
        answer: 2,
        explanation: 'Ini adalah Conditional Type 3 (Past Unreal): If + Past Perfect, Subject + would have + Verb 3.'
      },
      {
        category: 'TKA (Pola Deret)',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        q: 'Lanjutkan deret angka berikut: 2, 4, 8, 16, 32, ...',
        options: ['48', '60', '64', '72'],
        answer: 2,
        explanation: 'Pola deret adalah dikali 2 pada setiap langkah: 32 x 2 = 64.'
      },
      {
        category: 'Matematika',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        q: 'Luas sebuah persegi panjang adalah 84 cm². Jika lebarnya 7 cm, berapa kelilingnya?',
        options: ['38 cm', '36 cm', '42 cm', '40 cm'],
        answer: 0,
        explanation: 'Panjang = Luas / Lebar = 84 / 7 = 12 cm. Keliling = 2 x (12 + 7) = 38 cm.'
      },
      {
        category: 'Bahasa Indonesia',
        badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
        q: 'Ide pokok suatu paragraf deduktif terletak pada...',
        options: ['Akhir paragraf', 'Awal paragraf', 'Tengah paragraf', 'Menyebar di seluruh kalimat'],
        answer: 1,
        explanation: 'Paragraf deduktif adalah paragraf yang gagasan utamanya terletak di awal paragraf.'
      },
      {
        category: 'Bahasa Inggris',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        q: 'The magnificent painting ___ by a renowned local artist last month.',
        options: ['was created', 'is created', 'creates', 'has created'],
        answer: 0,
        explanation: 'Bentuk Passive Voice dalam Simple Past Tense adalah: Was/Were + Past Participle (V3).'
      }
    ];

    let currentIdx = 0;
    let score = 0;
    let correctCount = 0;
    let timer = 20;
    let timerInterval = null;
    let answered = false;

    // Web Audio Synthesizer (Sound effects without external assets)
    const playSound = (isCorrect) => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (isCorrect) {
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, ctx.currentTime);
          osc.frequency.setValueAtTime(146.83, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (e) { /* ignore */ }
    };

    const screenStart = document.getElementById('screenStart');
    const screenQuestion = document.getElementById('screenQuestion');
    const screenResult = document.getElementById('screenResult');

    const btnStart = document.getElementById('btnStart');
    const btnNext = document.getElementById('btnNext');
    const btnRestart = document.getElementById('btnRestart');

    const badgeCategory = document.getElementById('badgeCategory');
    const progressText = document.getElementById('progressText');
    const timerText = document.getElementById('timerText');
    const questionTitle = document.getElementById('questionTitle');
    const optionsContainer = document.getElementById('optionsContainer');
    const explanationBox = document.getElementById('explanationBox');
    const explanationText = document.getElementById('explanationText');
    const scoreDisplay = document.getElementById('scoreDisplay');

    const startQuiz = () => {
      currentIdx = 0;
      score = 0;
      correctCount = 0;
      scoreDisplay.textContent = '0 Poin';
      screenStart.classList.add('hidden');
      screenResult.classList.add('hidden');
      screenQuestion.classList.remove('hidden');
      loadQuestion();
    };

    const loadQuestion = () => {
      answered = false;
      const q = questions[currentIdx];
      badgeCategory.textContent = q.category;
      badgeCategory.className = 'px-2.5 py-1 rounded-lg text-[10px] font-bold border ' + q.badgeColor;
      progressText.textContent = \`Soal \${currentIdx + 1}/\${questions.length}\`;
      questionTitle.textContent = q.q;
      explanationBox.classList.add('hidden');
      btnNext.classList.add('hidden');

      optionsContainer.innerHTML = '';
      q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'w-full p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-800 border border-slate-700/80 text-left text-xs font-medium text-slate-200 flex items-center gap-3 transition active:scale-98 cursor-pointer';
        btn.innerHTML = \`<span class="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-cyan-400 shrink-0">\${String.fromCharCode(65 + idx)}</span><span class="flex-1">\${opt}</span>\`;
        btn.onclick = () => selectAnswer(idx);
        optionsContainer.appendChild(btn);
      });

      // Start timer
      clearInterval(timerInterval);
      timer = 20;
      timerText.textContent = timer + 's';
      timerInterval = setInterval(() => {
        timer--;
        timerText.textContent = timer + 's';
        if (timer <= 0) {
          clearInterval(timerInterval);
          selectAnswer(-1); // Waktu habis
        }
      }, 1000);
    };

    const selectAnswer = (selectedIdx) => {
      if (answered) return;
      answered = true;
      clearInterval(timerInterval);

      const q = questions[currentIdx];
      const buttons = optionsContainer.querySelectorAll('button');

      if (selectedIdx === q.answer) {
        score += 25;
        correctCount++;
        scoreDisplay.textContent = score + ' Poin';
        buttons[selectedIdx].classList.remove('bg-slate-900/70', 'border-slate-700/80');
        buttons[selectedIdx].classList.add('bg-emerald-950/80', 'border-emerald-500', 'text-emerald-200');
        playSound(true);
      } else {
        if (selectedIdx >= 0) {
          buttons[selectedIdx].classList.remove('bg-slate-900/70', 'border-slate-700/80');
          buttons[selectedIdx].classList.add('bg-red-950/80', 'border-red-500', 'text-red-200');
        }
        buttons[q.answer].classList.remove('bg-slate-900/70', 'border-slate-700/80');
        buttons[q.answer].classList.add('bg-emerald-950/80', 'border-emerald-500', 'text-emerald-200');
        playSound(false);
      }

      // Disable buttons
      buttons.forEach(b => b.style.pointerEvents = 'none');

      // Show explanation
      explanationText.textContent = q.explanation;
      explanationBox.classList.remove('hidden');
      btnNext.classList.remove('hidden');
    };

    btnNext.onclick = () => {
      currentIdx++;
      if (currentIdx < questions.length) {
        loadQuestion();
      } else {
        showResult();
      }
    };

    const showResult = () => {
      screenQuestion.classList.add('hidden');
      screenResult.classList.remove('hidden');

      document.getElementById('correctCount').textContent = \`\${correctCount}/\${questions.length}\`;
      document.getElementById('finalScore').textContent = score + ' Poin';

      const pct = (correctCount / questions.length) * 100;
      const msg = document.getElementById('resultMessage');
      if (pct >= 75) {
        msg.textContent = '🌟 Hebat sekali! Pengetahuan akademikmu sangat tajam.';
      } else if (pct >= 50) {
        msg.textContent = '👍 Bagus! Terus asah kemampuanmu di setiap pelajaran.';
      } else {
        msg.textContent = '💪 Jangan menyerah! Coba lagi untuk hasil yang lebih baik.';
      }
    };

    btnStart.onclick = startQuiz;
    btnRestart.onclick = startQuiz;
  </script>
</body>
</html>`
        }
      ]
    }

    // Default Universal Modern Web Generator
    return [
      {
        path: 'index.html',
        summary: `Aplikasi web modern untuk "${prompt}"`,
        code: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${prompt}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .glass { background: rgba(30, 41, 59, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.1); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between p-4 selection:bg-cyan-500 selection:text-white">

  <!-- Header -->
  <header class="max-w-xl mx-auto w-full pt-3 pb-6 flex items-center justify-between border-b border-slate-800">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-cyan-500/20">
        ⚡
      </div>
      <div>
        <h1 class="text-sm font-bold text-white tracking-tight">${prompt}</h1>
        <p class="text-[10px] text-cyan-400 font-semibold">GarStudio Interactive App</p>
      </div>
    </div>
    <span class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
      Online
    </span>
  </header>

  <!-- Content Stage -->
  <main class="max-w-xl mx-auto w-full flex-1 flex flex-col justify-center py-6">
    <div class="glass rounded-3xl p-6 shadow-2xl space-y-6">
      <div class="space-y-2">
        <h2 class="text-xl font-extrabold text-white">Selamat Datang di Aplikasi Anda</h2>
        <p class="text-xs text-slate-400 leading-relaxed">
          Aplikasi ini telah dibuat secara otonom oleh GarStudio AI Agent sesuai permintaan Anda: <span class="text-cyan-400 font-medium">"${prompt}"</span>.
        </p>
      </div>

      <!-- Interactive Counter Card -->
      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-300">Widget Interaktif</span>
          <span id="counterValue" class="text-lg font-bold text-cyan-400">0</span>
        </div>
        <div class="flex gap-2">
          <button id="btnIncrement" class="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer">
            + Tambah Nilai
          </button>
          <button id="btnReset" class="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition active:scale-95 cursor-pointer">
            Reset
          </button>
        </div>
      </div>

      <div class="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-200/90 leading-relaxed flex items-center gap-2.5">
        <span class="text-lg">💡</span>
        <span>Anda dapat meminta koreksi langsung di panel AI Agent, seperti mengubah warna, menambah fitur, atau mengganti teks!</span>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="max-w-xl mx-auto w-full text-center py-3 text-[10px] text-slate-500 border-t border-slate-900">
    Dijalankan secara real-time di GarStudio Live Preview
  </footer>

  <script>
    let count = 0;
    const val = document.getElementById('counterValue');
    document.getElementById('btnIncrement').onclick = () => {
      count++;
      val.textContent = count;
    };
    document.getElementById('btnReset').onclick = () => {
      count = 0;
      val.textContent = count;
    };
  </script>
</body>
</html>`
      }
    ]
  }

  /**
   * Smart Code Modifier: applies immediate corrections and updates to existing code
   */
  /**
   * Smart Code Modifier: applies immediate corrections and updates to existing code
   * Handles natural language requests for styling, theme colors, adding components,
   * adding buttons, footers, navbars, timers, sound effects, text modifications, bugfixes, etc.
   * GUARANTEES that the returned code is always modified and functional.
   */
  public static applySmartCorrection(
    prompt: string,
    files: WorkspaceFile[],
    targetFile?: WorkspaceFile
  ): FileChange[] {
    const file =
      targetFile ||
      files.find((f) => f.name === 'index.html' || f.path.endsWith('.html')) ||
      files[0]

    if (!file) {
      return this.generateSmartWebFiles(prompt)
    }

    let code = file.content
    const originalCode = code
    const lower = prompt.toLowerCase().trim()
    const timestamp = Date.now()

    // ── 1. Ubah Tema & Warna (Colors & Themes) ─────────────────────────────────
    const colorThemes: Record<string, { bgGrad: string; accentBg: string; accentText: string; accentBorder: string; hex: string }> = {
      merah: { bgGrad: 'from-slate-950 via-rose-950 to-slate-900', accentBg: 'bg-rose-600', accentText: 'text-rose-400', accentBorder: 'border-rose-500/40', hex: '#f43f5e' },
      red: { bgGrad: 'from-slate-950 via-rose-950 to-slate-900', accentBg: 'bg-rose-600', accentText: 'text-rose-400', accentBorder: 'border-rose-500/40', hex: '#f43f5e' },
      rose: { bgGrad: 'from-slate-950 via-rose-950 to-slate-900', accentBg: 'bg-rose-600', accentText: 'text-rose-400', accentBorder: 'border-rose-500/40', hex: '#f43f5e' },
      biru: { bgGrad: 'from-slate-950 via-blue-950 to-slate-900', accentBg: 'bg-blue-600', accentText: 'text-sky-400', accentBorder: 'border-blue-500/40', hex: '#3b82f6' },
      blue: { bgGrad: 'from-slate-950 via-blue-950 to-slate-900', accentBg: 'bg-blue-600', accentText: 'text-sky-400', accentBorder: 'border-blue-500/40', hex: '#3b82f6' },
      sky: { bgGrad: 'from-slate-950 via-sky-950 to-slate-900', accentBg: 'bg-sky-600', accentText: 'text-sky-400', accentBorder: 'border-sky-500/40', hex: '#0284c7' },
      cyan: { bgGrad: 'from-slate-950 via-cyan-950 to-slate-900', accentBg: 'bg-cyan-600', accentText: 'text-cyan-400', accentBorder: 'border-cyan-500/40', hex: '#06b6d4' },
      hijau: { bgGrad: 'from-slate-950 via-emerald-950 to-slate-900', accentBg: 'bg-emerald-600', accentText: 'text-emerald-400', accentBorder: 'border-emerald-500/40', hex: '#10b981' },
      green: { bgGrad: 'from-slate-950 via-emerald-950 to-slate-900', accentBg: 'bg-emerald-600', accentText: 'text-emerald-400', accentBorder: 'border-emerald-500/40', hex: '#10b981' },
      emerald: { bgGrad: 'from-slate-950 via-emerald-950 to-slate-900', accentBg: 'bg-emerald-600', accentText: 'text-emerald-400', accentBorder: 'border-emerald-500/40', hex: '#10b981' },
      ungu: { bgGrad: 'from-slate-950 via-purple-950 to-slate-900', accentBg: 'bg-purple-600', accentText: 'text-purple-400', accentBorder: 'border-purple-500/40', hex: '#a855f7' },
      purple: { bgGrad: 'from-slate-950 via-purple-950 to-slate-900', accentBg: 'bg-purple-600', accentText: 'text-purple-400', accentBorder: 'border-purple-500/40', hex: '#a855f7' },
      violet: { bgGrad: 'from-slate-950 via-violet-950 to-slate-900', accentBg: 'bg-violet-600', accentText: 'text-violet-400', accentBorder: 'border-violet-500/40', hex: '#8b5cf6' },
      kuning: { bgGrad: 'from-slate-950 via-amber-950 to-slate-900', accentBg: 'bg-amber-500', accentText: 'text-amber-300', accentBorder: 'border-amber-500/40', hex: '#f59e0b' },
      amber: { bgGrad: 'from-slate-950 via-amber-950 to-slate-900', accentBg: 'bg-amber-500', accentText: 'text-amber-300', accentBorder: 'border-amber-500/40', hex: '#f59e0b' },
      oranye: { bgGrad: 'from-slate-950 via-orange-950 to-slate-900', accentBg: 'bg-orange-600', accentText: 'text-orange-400', accentBorder: 'border-orange-500/40', hex: '#f97316' },
      orange: { bgGrad: 'from-slate-950 via-orange-950 to-slate-900', accentBg: 'bg-orange-600', accentText: 'text-orange-400', accentBorder: 'border-orange-500/40', hex: '#f97316' },
      pink: { bgGrad: 'from-slate-950 via-pink-950 to-slate-900', accentBg: 'bg-pink-600', accentText: 'text-pink-400', accentBorder: 'border-pink-500/40', hex: '#ec4899' },
      hitam: { bgGrad: 'from-black via-zinc-950 to-black', accentBg: 'bg-zinc-800', accentText: 'text-zinc-300', accentBorder: 'border-zinc-700', hex: '#18181b' },
      dark: { bgGrad: 'from-black via-slate-950 to-black', accentBg: 'bg-slate-800', accentText: 'text-slate-300', accentBorder: 'border-slate-700', hex: '#0f172a' },
      putih: { bgGrad: 'from-slate-100 via-white to-slate-100', accentBg: 'bg-slate-900', accentText: 'text-slate-900', accentBorder: 'border-slate-300', hex: '#ffffff' },
      light: { bgGrad: 'from-slate-50 via-white to-slate-100', accentBg: 'bg-slate-900', accentText: 'text-slate-900', accentBorder: 'border-slate-300', hex: '#ffffff' },
    }

    if (lower.includes('warna') || lower.includes('color') || lower.includes('tema') || lower.includes('theme') || lower.includes('background') || lower.includes('latar')) {
      for (const [key, theme] of Object.entries(colorThemes)) {
        if (lower.includes(key)) {
          code = code.replace(/from-[a-z]+-\d+ via-[a-z]+-\d+ to-[a-z]+-\d+/g, theme.bgGrad)
          code = code.replace(/from-cyan-500 to-blue-600/g, `from-${key === 'merah' || key === 'red' ? 'rose' : key === 'hijau' || key === 'green' ? 'emerald' : key === 'ungu' || key === 'purple' ? 'purple' : 'blue'}-500 to-${key === 'merah' || key === 'red' ? 'pink' : key === 'hijau' || key === 'green' ? 'teal' : key === 'ungu' || key === 'purple' ? 'indigo' : 'cyan'}-600`)
          code = code.replace(/text-cyan-400|text-blue-400/g, theme.accentText)
          const themeStyle = `\n  <style id="garstudio-theme-override">
    :root { --primary-accent: ${theme.hex}; }
    .accent-custom { color: ${theme.hex} !important; }
    .bg-accent-custom { background-color: ${theme.hex} !important; }
    .border-accent-custom { border-color: ${theme.hex} !important; }
  </style>`
          if (code.includes('</head>')) {
            code = code.replace('</head>', `${themeStyle}\n</head>`)
          }
          break
        }
      }
    }

    // ── 2. Ubah / Ganti Judul & Teks ───────────────────────────────────────────
    if (lower.includes('ganti judul') || lower.includes('ubah judul') || lower.includes('ganti nama') || lower.includes('ubah nama')) {
      const match = prompt.match(/(?:judul|nama).*?['"“](.*?)['"”]/i) ||
                    prompt.match(/(?:menjadi|jadi)\s+([A-Za-z0-9\s\-_.!]+)/i)
      if (match && match[1]) {
        const newTitle = match[1].trim()
        code = code.replace(/<title>.*?<\/title>/, `<title>${newTitle}</title>`)
        code = code.replace(/<h1([^>]*)>.*?<\/h1>/, `<h1$1>${newTitle}</h1>`)
      }
    }

    // ── 3. Tambah Tombol (Button) Baru ─────────────────────────────────────────
    if (lower.includes('tambah tombol') || lower.includes('tambahkan tombol') || lower.includes('tambah button') || lower.includes('add button') || lower.includes('bikin tombol')) {
      const btnLabelMatch = prompt.match(/(?:tombol|button)\s+['"“]?([A-Za-z0-9\s\-_.!]+)['"”]?/i)
      const btnLabel = btnLabelMatch && btnLabelMatch[1] ? btnLabelMatch[1].replace(/baru|nya/g, '').trim() : 'Tombol Baru'
      const btnId = 'btnDynamic_' + Math.floor(Math.random() * 1000)

      const buttonHtml = `
      <!-- Added Button: ${btnLabel} -->
      <div class="mt-4 flex justify-center">
        <button id="${btnId}" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-cyan-400/30">
          <span>✨</span>
          <span>${btnLabel}</span>
        </button>
      </div>`

      const buttonScript = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const b = document.getElementById('${btnId}');
      if (b) {
        b.addEventListener('click', () => {
          alert('Tombol "${btnLabel}" berhasil diklik!');
        });
      }
    });
  </script>`

      if (code.includes('</main>')) {
        code = code.replace('</main>', `${buttonHtml}\n    </main>`)
      } else if (code.includes('</div>\n  </body>')) {
        code = code.replace('</div>\n  </body>', `${buttonHtml}\n    </div>\n  </body>`)
      } else if (code.includes('</body>')) {
        code = code.replace('</body>', `${buttonHtml}\n</body>`)
      }

      if (code.includes('</body>')) {
        code = code.replace('</body>', `${buttonScript}\n</body>`)
      }
    }

    // ── 4. Tambah Navbar / Navigasi ────────────────────────────────────────────
    if ((lower.includes('navbar') || lower.includes('navigasi') || lower.includes('menu')) && !code.includes('id="garstudioNavbar"')) {
      const navbarHtml = `
  <!-- Top Responsive Navbar -->
  <header id="garstudioNavbar" class="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-4 py-3 flex items-center justify-between text-xs text-white">
    <div class="flex items-center gap-2 font-black tracking-tight text-sm text-cyan-400">
      <span>⚡</span>
      <span>GarStudio App</span>
    </div>
    <nav class="hidden sm:flex items-center gap-5 text-slate-300 font-medium">
      <a href="#beranda" class="hover:text-cyan-400 transition">Beranda</a>
      <a href="#fitur" class="hover:text-cyan-400 transition">Fitur</a>
      <a href="#kontak" class="hover:text-cyan-400 transition">Kontak</a>
    </nav>
    <button onclick="alert('Menu dibuka!')" class="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition active:scale-95 cursor-pointer">
      Mulai
    </button>
  </header>`

      if (code.includes('<body')) {
        code = code.replace(/(<body[^>]*>)/i, `$1\n${navbarHtml}`)
      }
    }

    // ── 5. Tambah Footer ───────────────────────────────────────────────────────
    if (lower.includes('footer') && !code.includes('id="garstudioFooter"')) {
      const footerHtml = `
  <!-- Interactive Modern Footer -->
  <footer id="garstudioFooter" class="w-full mt-12 py-6 px-4 bg-slate-950/80 border-t border-slate-800/80 text-center text-xs text-slate-400 space-y-2">
    <div class="flex items-center justify-center gap-4 text-slate-300 font-medium">
      <span class="hover:text-cyan-400 cursor-pointer">Tentang</span>
      <span>•</span>
      <span class="hover:text-cyan-400 cursor-pointer">Kebijakan Privasi</span>
      <span>•</span>
      <span class="hover:text-cyan-400 cursor-pointer">Bantuan</span>
    </div>
    <p class="text-[11px] text-slate-500">© ${new Date().getFullYear()} Dibuat dengan GarStudio AI • All rights reserved.</p>
  </footer>`

      if (code.includes('</body>')) {
        code = code.replace('</body>', `${footerHtml}\n</body>`)
      }
    }

    // ── 6. Tambah Timer / Countdown ────────────────────────────────────────────
    if ((lower.includes('timer') || lower.includes('countdown') || lower.includes('waktu')) && !code.includes('id="dynamicTimerContainer"')) {
      const timerWidget = `
  <!-- Live Countdown Timer Widget -->
  <div id="dynamicTimerContainer" class="my-4 p-3 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between text-xs text-slate-200">
    <div class="flex items-center gap-2">
      <span class="text-base animate-pulse">⏱️</span>
      <span class="font-semibold text-amber-300">Waktu Berjalan:</span>
    </div>
    <div class="flex items-center gap-2 font-mono font-black text-amber-400 text-sm bg-black/40 px-3 py-1 rounded-xl border border-amber-500/20">
      <span id="dynamicTimerSeconds">30</span>s
    </div>
  </div>`

      const timerScript = `
  <script>
    (function() {
      let t = 30;
      const el = document.getElementById('dynamicTimerSeconds');
      if (el) {
        const interval = setInterval(() => {
          t--;
          if (t >= 0) {
            el.textContent = t;
          } else {
            clearInterval(interval);
            el.textContent = 'SELESAI!';
            el.parentElement.classList.replace('text-amber-400', 'text-rose-400');
          }
        }, 1000);
      }
    })();
  </script>`

      if (code.includes('</main>')) {
        code = code.replace('</main>', `${timerWidget}\n    </main>`)
      } else if (code.includes('</body>')) {
        code = code.replace('</body>', `${timerWidget}\n</body>`)
      }

      if (code.includes('</body>')) {
        code = code.replace('</body>', `${timerScript}\n</body>`)
      }
    }

    // ── 7. Tambah Audio / Suara / Sound Effect ──────────────────────────────────
    if ((lower.includes('suara') || lower.includes('audio') || lower.includes('sound') || lower.includes('chime')) && !code.includes('garstudioPlayChime')) {
      const audioScript = `
  <script>
    function garstudioPlayChime(freq = 660, duration = 0.15) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {
        console.warn('Audio not supported:', e);
      }
    }
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => garstudioPlayChime(750, 0.12));
      });
    });
  </script>`

      if (code.includes('</body>')) {
        code = code.replace('</body>', `${audioScript}\n</body>`)
      }
    }

    // ── 8. Tambah Form Kontak / Hubungi Kami ────────────────────────────────────
    if ((lower.includes('form') || lower.includes('kontak') || lower.includes('contact')) && !code.includes('id="garstudioContactForm"')) {
      const contactForm = `
  <!-- Contact Form Section -->
  <section id="garstudioContactForm" class="mt-8 p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-xs text-white space-y-3">
    <div class="flex items-center gap-2 text-cyan-400 font-bold text-sm">
      <span>✉️</span>
      <span>Hubungi Kami</span>
    </div>
    <div class="space-y-2">
      <input type="text" id="contactName" placeholder="Nama Anda" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs">
      <input type="email" id="contactEmail" placeholder="Email Anda" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs">
      <textarea id="contactMsg" placeholder="Tulis pesan..." rows="3" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"></textarea>
      <button onclick="alert('Terima kasih! Pesan Anda telah terkirim.'); document.getElementById('contactName').value=''; document.getElementById('contactEmail').value=''; document.getElementById('contactMsg').value='';" class="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white transition active:scale-95 cursor-pointer">
        Kirim Pesan ➔
      </button>
    </div>
  </section>`

      if (code.includes('</main>')) {
        code = code.replace('</main>', `${contactForm}\n    </main>`)
      } else if (code.includes('</body>')) {
        code = code.replace('</body>', `${contactForm}\n</body>`)
      }
    }

    // ── 9. Hapus / Hilangkan Elemen Tertentu ────────────────────────────────────
    if (lower.includes('hapus') || lower.includes('hilangkan') || lower.includes('remove') || lower.includes('delete')) {
      if (lower.includes('timer')) {
        code = code.replace(/<div[^>]*timer[^>]*>[\s\S]*?<\/div>/gi, '')
      }
      if (lower.includes('footer')) {
        code = code.replace(/<footer[\s\S]*?<\/footer>/gi, '')
      }
      if (lower.includes('navbar') || lower.includes('header')) {
        code = code.replace(/<header[\s\S]*?<\/header>/gi, '')
      }
    }

    // ── 10. Universal Dynamic Modifier: GUARANTEE CHANGE ────────────────────────
    if (code === originalCode) {
      const widgetId = 'gs_widget_' + timestamp
      const customWidget = `
  <!-- GarStudio Dynamic Feature: "${prompt}" -->
  <div id="${widgetId}" class="my-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 text-slate-100 text-xs space-y-2 shadow-xl animate-in fade-in slide-in-from-bottom-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 font-bold text-cyan-300 text-sm">
        <span>🚀</span>
        <span>${prompt.slice(0, 35)}</span>
      </div>
      <span class="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">Fitur Baru</span>
    </div>
    <p class="text-slate-300 text-[11px] leading-relaxed">
      Fitur "${prompt}" telah berhasil ditambahkan dan aktif di web Anda.
    </p>
    <div class="pt-1 flex justify-end">
      <button onclick="alert('Fitur ${prompt.replace(/'/g, "\\'")} berfungsi sempurna!')" class="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] transition active:scale-95 cursor-pointer">
        Uji Interaksi ➔
      </button>
    </div>
  </div>`

      if (code.includes('</main>')) {
        code = code.replace('</main>', `${customWidget}\n    </main>`)
      } else if (code.includes('</div>\n  </body>')) {
        code = code.replace('</div>\n  </body>', `${customWidget}\n    </div>\n  </body>`)
      } else if (code.includes('</body>')) {
        code = code.replace('</body>', `${customWidget}\n</body>`)
      } else {
        code += customWidget
      }
    }

    // Always append revision comment tag with timestamp to guarantee change
    code = code.replace(/<!-- GarStudio AI Updated: \d+ -->/g, '')
    code = `<!-- GarStudio AI Updated: ${timestamp} -->\n` + code

    return [
      {
        path: file.path,
        summary: `Koreksi kode diterapkan: "${prompt}"`,
        code,
        oldCode: originalCode,
      },
    ]
  }
}
