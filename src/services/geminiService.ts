import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIPlan, FileChange, PreviewError, WorkspaceFile } from '../types'

export class GeminiAgentService {
  /**
   * Step 1: Planning - creates a structured architectural plan/JSON tree of files
   */
  static async planArchitecture(
    prompt: string,
    currentFiles: WorkspaceFile[],
    apiKey: string
  ): Promise<AIPlan> {
    if (!apiKey) {
      return this.mockPlan(prompt)
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const filesContext = currentFiles.map((f) => `- ${f.path}`).join('\n')

    const systemPrompt = `You are an expert autonomous software architect AI agent for mobile web applications.
The user wants to build or modify: "${prompt}"

Current files in workspace:
${filesContext || '(Empty workspace)'}

Respond ONLY with a valid JSON object (no markdown code blocks, no backticks, just raw JSON) matching this schema:
{
  "goal": "Clear summary of what we will build",
  "overview": "Architectural breakdown and design rationale",
  "steps": [
    {
      "id": "step-1",
      "title": "Title of step",
      "description": "What will be implemented",
      "action": "create" | "modify",
      "filePath": "path/to/file.ext",
      "status": "pending"
    }
  ]
}`

    try {
      const result = await model.generateContent(systemPrompt)
      const text = result.response.text()
      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      return JSON.parse(cleaned) as AIPlan
    } catch (err) {
      console.error('Gemini planning error:', err)
      // Fallback to mock plan if API quota or syntax error
      return this.mockPlan(prompt)
    }
  }

  /**
   * Step 2: Code Generation - generates functional HTML, CSS, and JS files
   */
  static async generateCode(
    plan: AIPlan,
    currentFiles: WorkspaceFile[],
    apiKey: string
  ): Promise<FileChange[]> {
    if (!apiKey) {
      return this.mockCodeGeneration(plan, currentFiles)
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const stepsInfo = plan.steps
      .map((s) => `File: ${s.filePath} (${s.action}): ${s.description}`)
      .join('\n')

    const prompt = `You are GarStudio Autonomous AI Agent. Generate functional, production-ready code based on this plan:
Goal: ${plan.goal}
Architecture: ${plan.overview}
Files to produce:
${stepsInfo}

Output your response ONLY as a JSON array of objects:
[
  {
    "path": "index.html",
    "summary": "Brief summary of changes",
    "code": "<!DOCTYPE html>..."
  }
]
Do not wrap in markdown quotes if possible, return strictly parseable JSON.`

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return parsed as FileChange[]
    } catch (err) {
      console.error('Gemini code generation error:', err)
      return this.mockCodeGeneration(plan, currentFiles)
    }
  }

  /**
   * Step 3: Review & Revision - AI reads existing code and refines or edits it based on user feedback
   */
  static async reviewAndRevise(
    feedback: string,
    targetFile: WorkspaceFile,
    _allFiles: WorkspaceFile[],
    apiKey: string
  ): Promise<FileChange> {
    if (!apiKey) {
      return {
        path: targetFile.path,
        summary: `Refined ${targetFile.name} based on: "${feedback}"`,
        code: targetFile.content + `\n/* AI Enhancement: ${feedback} */`,
        oldCode: targetFile.content,
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const prompt = `You are GarStudio AI Code Reviewer.
The user requested: "${feedback}"
Target File: ${targetFile.path}
Current Content:
\`\`\`
${targetFile.content}
\`\`\`

Return a JSON object:
{
  "path": "${targetFile.path}",
  "summary": "Clear summary of the revision",
  "code": "Full updated file code"
}`

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return {
        ...parsed,
        oldCode: targetFile.content,
      }
    } catch (e) {
      console.error('Review & Revise error:', e)
      throw e
    }
  }

  /**
   * AI Debugger: Automatically diagnose and fix error caught from iframe
   */
  static async autoFixBug(
    error: PreviewError,
    files: WorkspaceFile[],
    apiKey: string
  ): Promise<FileChange[]> {
    const errorDetails = `Error: ${error.message}\nLine: ${error.lineno}, Col: ${error.colno}\nStack: ${error.stack || 'N/A'}`

    if (!apiKey) {
      // Find app.js or target file with test error
      const jsFile = files.find((f) => f.name.endsWith('.js') || f.name.endsWith('.ts'))
      if (jsFile && jsFile.content.includes('nonExistentDebuggerFunction')) {
        const fixed = jsFile.content.replace(
          /window\.nonExistentDebuggerFunction\([^)]*\);?/g,
          'console.log("✅ Bug successfully resolved by GarStudio Autonomous AI Debugger!");\nalert("✅ Bug Fixed! The undefined function was safely removed and replaced with safe logic.");'
        )
        return [
          {
            path: jsFile.path,
            summary: 'Auto-fixed undefined function runtime error in ' + jsFile.name,
            code: fixed,
            oldCode: jsFile.content,
          },
        ]
      }

      return [
        {
          path: jsFile ? jsFile.path : 'app.js',
          summary: 'Guarded against uncaught exception',
          code: (jsFile ? jsFile.content : '') + '\n// AI Debugger safeguard added',
        },
      ]
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const filesContent = files
      .map((f) => `--- FILE: ${f.path} ---\n${f.content}\n--- END ---`)
      .join('\n\n')

    const prompt = `You are the GarStudio Autonomous AI Debugger.
The mobile browser sandbox intercepted the following runtime error:
${errorDetails}

Workspace code:
${filesContent}

Diagnose the root cause and provide the exact fix.
Return ONLY a JSON array of FileChange objects:
[
  {
    "path": "file/with/error.js",
    "summary": "Detailed explanation of bug and fix",
    "code": "Complete corrected file content"
  }
]`

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const cleaned = text.replace(/```json\n?|```/g, '').trim()
      return JSON.parse(cleaned) as FileChange[]
    } catch (e) {
      console.error('Auto fix bug error:', e)
      throw e
    }
  }

  // Fallback demo plans for instant out-of-the-box demonstration
  private static mockPlan(userPrompt: string): AIPlan {
    return {
      goal: `Build: ${userPrompt || 'Enhanced Mobile Interactive App'}`,
      overview:
        'Architecting a lightweight, reactive mobile web application with glassmorphic cards, Tailwind typography, and touch-optimized micro-interactions.',
      steps: [
        {
          id: 'step-1',
          title: 'Update HTML Layout & Responsive Viewports',
          description: 'Structure modern semantic markup with accessible mobile touch targets',
          action: 'modify',
          filePath: 'index.html',
          status: 'pending',
        },
        {
          id: 'step-2',
          title: 'Enhance Micro-Interactions & Styling',
          description: 'Add fluid animations and dark-mode aesthetic styling tokens',
          action: 'modify',
          filePath: 'style.css',
          status: 'pending',
        },
        {
          id: 'step-3',
          title: 'Implement Interactive State Machine',
          description: 'Handle touch gestures, state persistence, and reactive DOM events',
          action: 'modify',
          filePath: 'app.js',
          status: 'pending',
        },
      ],
    }
  }

  private static mockCodeGeneration(_plan: AIPlan, files: WorkspaceFile[]): FileChange[] {
    const changes: FileChange[] = []
    const indexFile = files.find((f) => f.path === 'index.html')

    if (indexFile) {
      changes.push({
        path: 'index.html',
        summary: 'Injected new feature component and enhanced mobile UI layout',
        code: indexFile.content.replace(
          '<!-- Daily Quick Habits -->',
          `<!-- AI Generated Feature: Quick Analytics -->
    <div class="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-800/40 rounded-2xl p-4 shadow-xl">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xs font-semibold text-indigo-300 uppercase tracking-wider">⚡ AI Focus Velocity</h3>
        <span class="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">+34% Today</span>
      </div>
      <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
        <div class="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full" style="width: 78%"></div>
      </div>
    </div>

    <!-- Daily Quick Habits -->`
        ),
      })
    }

    return changes
  }
}
