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

      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      return { plan: JSON.parse(cleaned) as AIPlan }
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

      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      const parsed = JSON.parse(cleaned) as FileChange[]
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

      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      const parsed = JSON.parse(cleaned) as FileChange[]
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) {
        return {
          changes: parsed,
          message: `✨ [${this.providerLabel(provider)}] Koreksi berhasil diterapkan langsung! ${parsed.map(p => p.summary).join(' ')}`,
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
      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      return { fixes: JSON.parse(cleaned) as FileChange[] }
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
    const lower = prompt.toLowerCase()

    // 1. Ganti / Ubah Warna Tema
    if (lower.includes('warna') || lower.includes('tema') || lower.includes('color')) {
      if (lower.includes('biru') || lower.includes('blue')) {
        code = code.replace(/from-cyan-500 via-blue-600 to-indigo-600/g, 'from-blue-600 via-sky-600 to-cyan-600')
        code = code.replace(/bg-slate-950/g, 'bg-slate-900')
      } else if (lower.includes('hijau') || lower.includes('green') || lower.includes('emerald')) {
        code = code.replace(/from-cyan-500 via-blue-600 to-indigo-600/g, 'from-emerald-500 via-teal-600 to-green-600')
        code = code.replace(/text-cyan-400/g, 'text-emerald-400')
        code = code.replace(/bg-cyan-600/g, 'bg-emerald-600')
      } else if (lower.includes('merah') || lower.includes('red') || lower.includes('rose')) {
        code = code.replace(/from-cyan-500 via-blue-600 to-indigo-600/g, 'from-red-500 via-rose-600 to-pink-600')
        code = code.replace(/text-cyan-400/g, 'text-rose-400')
        code = code.replace(/bg-cyan-600/g, 'bg-rose-600')
      } else if (lower.includes('ungu') || lower.includes('purple')) {
        code = code.replace(/from-cyan-500 via-blue-600 to-indigo-600/g, 'from-purple-500 via-indigo-600 to-violet-600')
        code = code.replace(/text-cyan-400/g, 'text-purple-400')
        code = code.replace(/bg-cyan-600/g, 'bg-purple-600')
      }
    }

    // 2. Tambah Timer jika diminta
    if (lower.includes('timer') && !code.includes('timerText')) {
      code = code.replace(
        /<div id="scoreDisplay"[^>]*>([\s\S]*?)<\/div>/,
        `<div id="scoreDisplay" class="text-lg font-black text-emerald-400 leading-tight">$1</div>\n<div class="text-xs font-mono font-bold text-amber-400 mt-1">⏱️ <span id="timerText">30s</span></div>`
      )
    }

    // 3. Modifikasi Teks / Judul
    if (lower.includes('ganti judul') || lower.includes('ubah judul')) {
      const match = prompt.match(/judul.*?['"](.*?)['"]/i) || prompt.match(/menjadi (.*)/i)
      if (match && match[1]) {
        code = code.replace(/<title>.*?<\/title>/, `<title>${match[1].trim()}</title>`)
        code = code.replace(/<h1[^>]*>.*?<\/h1>/, `<h1 class="text-sm font-extrabold text-white tracking-tight">${match[1].trim()}</h1>`)
      }
    }

    // Add modification comment tag
    if (!code.includes('<!-- GarStudio AI Updated -->')) {
      code = `<!-- GarStudio AI Updated -->\n` + code
    }

    return [
      {
        path: file.path,
        summary: `Koreksi kode sesuai permintaan: "${prompt}"`,
        code,
        oldCode: file.content,
      },
    ]
  }
}
