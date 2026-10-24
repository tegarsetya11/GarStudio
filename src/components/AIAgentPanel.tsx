import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  FileCode,
  Check,
  Bot,
  User,
  Zap,
  Cpu,
  ClipboardList,
  MessageSquareCode,
  X,
  UploadCloud,
  GitBranch,
} from 'lucide-react'
import type { AIMessage, AIMode, AIProvider, AIStage, FileChange, WorkspaceFile } from '../types'
import { AIAgentService } from '../services/aiAgentService'
import { GitHubService } from '../services/githubService'
import { GithubIcon } from './GithubIcon'

interface AIAgentPanelProps {
  messages: AIMessage[]
  aiStage: AIStage
  aiProvider: AIProvider
  aiMode: AIMode
  onSwitchProvider: (provider: AIProvider) => void
  onSwitchMode: (mode: AIMode) => void
  onSendPrompt: (prompt: string, mode: AIMode) => void
  onApplyChanges: (changes: FileChange[]) => void
  activeFile: WorkspaceFile | null
  files?: WorkspaceFile[]
  onClose?: () => void
  onGitHubUpload?: (repoName: string, isPrivate: boolean) => Promise<void>
  githubToken?: string
}

export const AIAgentPanel: React.FC<AIAgentPanelProps> = ({
  messages,
  aiStage,
  aiProvider,
  aiMode,
  onSwitchProvider,
  onSwitchMode,
  onSendPrompt,
  onApplyChanges,
  activeFile,
  files: _files,
  onClose,
  onGitHubUpload,
  githubToken = '',
}) => {
  const [inputPrompt, setInputPrompt] = useState('')
  const [ghRepoName, setGhRepoName] = useState('garstudio-app')
  const [ghIsPrivate, setGhIsPrivate] = useState(false)
  const [ghUploading, setGhUploading] = useState(false)
  const [ghProgress, setGhProgress] = useState('')
  const [ghResult, setGhResult] = useState<{ repoUrl: string; commitSha: string } | null>(null)
  const [ghError, setGhError] = useState<string | null>(null)
  const [showGhCard, setShowGhCard] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputPrompt.trim() || aiStage === 'planning' || aiStage === 'generating') return
    const prompt = inputPrompt.trim()

    // — GitHub Intent Detection —
    if (AIAgentService.detectGitHubIntent(prompt)) {
      setShowGhCard(true)
      setGhResult(null)
      setGhError(null)
      setGhProgress('')
      setInputPrompt('')
      return
    }

    onSendPrompt(prompt, aiMode)
    setInputPrompt('')
  }

  // Inline GitHub upload — runs directly from chat panel
  const handleGitHubUploadInline = async () => {
    if (!githubToken) {
      setGhError('❌ GitHub Token belum diatur. Buka Settings → GitHub PAT dan isi token kamu.')
      return
    }
    setGhUploading(true)
    setGhResult(null)
    setGhError(null)
    try {
      const result = await GitHubService.uploadWorkspace(
        { token: githubToken, repo: ghRepoName, description: 'Dibuat dengan GarStudio Mobile AI IDE', isPrivate: ghIsPrivate, branch: 'main' },
        _files ?? [],
        (msg) => setGhProgress(msg)
      )
      setGhResult(result)
      if (onGitHubUpload) await onGitHubUpload(ghRepoName, ghIsPrivate)
    } catch (err) {
      setGhError(err instanceof Error ? err.message : 'Upload gagal. Periksa token dan koneksi.')
    } finally {
      setGhUploading(false)
    }
  }

  // Quick suggestions based on active mode
  const planPrompts = [
    '📋 Buat dark mode dengan local storage',
    '📋 Tambahkan navigasi multi-halaman',
    '📋 Buat kalkulator modern dengan animasi',
    '📋 Tambahkan kartu cuaca dengan API',
  ]

  const interactivePrompts = [
    '💬 Jelaskan cara app.js terhubung ke index.html',
    '💬 Bagaimana mengubah warna tombol?',
    '💬 Tambahkan efek ripple ke tombol Click Me',
    '💬 Berikan 3 saran UX mobile untuk halaman ini',
  ]

  const activePrompts = aiMode === 'plan' ? planPrompts : interactivePrompts

  return (
    <div className="flex flex-col h-full bg-[#181818] text-[#cccccc] font-sans select-none">
      {/* 1. Header with Triple AI Engine Switcher */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1f1f1f] border-b border-[#2b2b2b] text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg p-1 flex items-center justify-center transition border ${
              aiProvider === 'claude'
                ? 'bg-amber-950/50 border-amber-800/60'
                : aiProvider === 'copilot'
                ? 'bg-purple-950/50 border-purple-800/60'
                : 'bg-blue-950/50 border-blue-800/60'
            }`}
          >
            {aiProvider === 'claude' ? (
              <img src="/icons/claude.png" alt="Claude" className="w-5 h-5 object-contain" />
            ) : aiProvider === 'copilot' ? (
              <img src="/icons/copilot.png" alt="Copilot" className="w-5 h-5 object-contain" />
            ) : (
              <img src="/icons/gemini.png" alt="Gemini" className="w-5 h-5 object-contain" />
            )}
          </div>
          <div>
            <div className="font-bold text-white text-[11px]">
              {aiProvider === 'claude'
                ? 'Claude Sonnet 4.5'
                : aiProvider === 'copilot'
                ? 'GitHub Copilot'
                : 'Gemini 3.8 Flash'}
            </div>
            <div
              className={`text-[10px] font-mono ${
                aiProvider === 'claude'
                  ? 'text-amber-400'
                  : aiProvider === 'copilot'
                  ? 'text-purple-400'
                  : 'text-cyan-400'
              }`}
            >
              {aiProvider === 'claude'
                ? 'Anthropic AI'
                : aiProvider === 'copilot'
                ? 'Microsoft / GitHub'
                : 'Google AI'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Engine Switcher — 3 providers */}
          <div className="flex items-center gap-0.5 bg-[#121212] p-0.5 rounded-lg border border-[#333333]">
            <button
              type="button"
              onClick={() => onSwitchProvider('gemini')}
              title="Google Gemini 3.8 Flash"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1.5 ${
                aiProvider === 'gemini'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <img src="/icons/gemini.png" alt="" className="w-3.5 h-3.5 object-contain" />
              <span>Gemini</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchProvider('claude')}
              title="Claude Sonnet 4.5"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1.5 ${
                aiProvider === 'claude'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <img src="/icons/claude.png" alt="" className="w-3.5 h-3.5 object-contain" />
              <span>Claude</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchProvider('copilot')}
              title="GitHub Copilot"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1.5 ${
                aiProvider === 'copilot'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <img src="/icons/copilot.png" alt="" className="w-3.5 h-3.5 object-contain" />
              <span>Copilot</span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#2a2d2e] rounded text-slate-400 hover:text-white transition"
              title="Close AI Panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Mode Selector: Buat Plan vs Interaktif */}
      <div className="px-3 py-1.5 bg-[#141414] border-b border-[#2b2b2b] flex items-center justify-between text-xs">
        <div className="flex items-center w-full gap-1 bg-[#1e1e1e] p-0.5 rounded border border-[#2e2e2e]">
          <button
            type="button"
            onClick={() => onSwitchMode('plan')}
            className={`flex-1 py-1 px-2 rounded flex items-center justify-center gap-1.5 text-[11px] font-semibold transition ${
              aiMode === 'plan'
                ? 'bg-[#2a2d2e] text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Buat Plan</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchMode('interactive')}
            className={`flex-1 py-1 px-2 rounded flex items-center justify-center gap-1.5 text-[11px] font-semibold transition ${
              aiMode === 'interactive'
                ? 'bg-[#2a2d2e] text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquareCode className="w-3.5 h-3.5" />
            <span>Interaktif</span>
          </button>
        </div>
      </div>

      {/* Mode Sub-banner / Guidance */}
      <div className="px-3 py-1 bg-[#1a1a1a] border-b border-[#262626] flex items-center justify-between text-[10px] text-slate-400">
        <span>
          {aiMode === 'plan'
            ? '📋 Mode Plan: Merumuskan arsitektur & file tree sebelum generate kode'
            : '💬 Mode Interaktif: Tanya jawab cepat & bantuan kode langsung'}
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            aiMode === 'plan' ? 'bg-cyan-400' : 'bg-amber-400'
          }`}
        />
      </div>

      {/* 3. Messages / Step Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs select-text">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1.5 ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Sender Label */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              {msg.role === 'user' ? (
                <>
                  <span>Kamu</span>
                  <User className="w-3 h-3 text-cyan-400" />
                </>
              ) : (
                <>
                  <img
                    src={
                      aiProvider === 'claude'
                        ? '/icons/claude.png'
                        : aiProvider === 'copilot'
                        ? '/icons/copilot.png'
                        : '/icons/gemini.png'
                    }
                    alt=""
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span>
                    GarStudio AI ({aiProvider === 'claude' ? 'Claude Sonnet 4.5' : aiProvider === 'copilot' ? 'Copilot' : 'Gemini 3.8 Flash'})
                  </span>
                </>
              )}
            </div>

            {/* Bubble Content */}
            <div
              className={`p-3 rounded-xl max-w-[92%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#007acc] text-white rounded-br-none shadow-md'
                  : 'bg-[#252526] border border-[#333333] text-[#cccccc] rounded-bl-none shadow'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Step 1: Architectural Plan Card */}
              {msg.plan && (
                <div className="mt-3 pt-3 border-t border-[#333333] space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold text-[11px] uppercase tracking-wider ${
                        aiProvider === 'claude' ? 'text-amber-300' : 'text-cyan-300'
                      }`}
                    >
                      🎯 Step 1: Architectural Plan
                    </span>
                    <span className="text-[10px] text-slate-400">{msg.plan.steps.length} Steps</span>
                  </div>

                  <p className="text-[11px] text-slate-300 italic">{msg.plan.overview}</p>

                  <div className="space-y-1.5 mt-2">
                    {msg.plan.steps.map((step, idx) => (
                      <div
                        key={step.id || idx}
                        className="flex items-start gap-2 p-2 rounded bg-[#1e1e1e] border border-[#333333]"
                      >
                        <div className="mt-0.5 text-cyan-400">
                          {step.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-200">{step.title}</div>
                          <div className="text-[10px] text-slate-400">{step.description}</div>
                          <div
                            className={`text-[9px] font-mono mt-0.5 ${
                              aiProvider === 'claude' ? 'text-amber-400' : 'text-cyan-400'
                            }`}
                          >
                            [{step.action}] {step.filePath}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2 & 3: Generated Code Changes & Diff Action */}
              {msg.changes && msg.changes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#333333] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-400 text-[11px] uppercase tracking-wider">
                      ⚡ Generated Code Changes
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {msg.changes.length} File{msg.changes.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {msg.changes.map((change, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-[#1e1e1e] border border-[#333333] text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{change.path}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{change.summary}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onApplyChanges(msg.changes!)}
                    className="w-full mt-2 py-2 px-3 bg-[#0e639c] hover:bg-[#1177bb] text-white font-medium rounded text-xs flex items-center justify-center gap-1.5 shadow active:scale-98 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Changes to Workspace</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {(aiStage === 'planning' || aiStage === 'generating' || aiStage === 'reviewing') && (
          <div
            className={`flex items-center gap-2 text-xs p-3 rounded-xl bg-[#252526] border max-w-[85%] ${
              aiProvider === 'claude'
                ? 'border-amber-500/30 text-amber-300'
                : 'border-cyan-500/30 text-cyan-300'
            }`}
          >
            <Zap className={`w-4 h-4 animate-spin ${aiProvider === 'claude' ? 'text-amber-400' : 'text-cyan-400'}`} />
            <span>
              {aiStage === 'planning'
                ? `Merancang arsitektur dengan ${aiProvider === 'claude' ? 'Claude AI' : 'Gemini'}...`
                : aiStage === 'generating'
                ? `Menulis kode fungsional dengan ${aiProvider === 'claude' ? 'Claude AI' : 'Gemini'}...`
                : 'Memproses respons interaktif...'}
            </span>
          </div>
        )}

        {/* ── INLINE GITHUB UPLOAD CARD ── */}
        {showGhCard && (
          <div className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 to-[#0d1117] shadow-xl overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-slate-800">
              <div className="flex items-center gap-2">
                <GithubIcon className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white">Push ke GitHub</span>
              </div>
              <button onClick={() => { setShowGhCard(false); setGhResult(null); setGhError(null) }}
                className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              {/* Repo Name */}
              <div>
                <label className="text-slate-400 font-medium mb-1 block">Nama Repository</label>
                <div className="flex items-center gap-1.5 bg-[#0d1117] border border-slate-700 rounded-lg px-2.5 py-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={ghRepoName}
                    onChange={(e) => setGhRepoName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                    className="flex-1 bg-transparent text-slate-100 outline-none font-mono"
                    placeholder="nama-repo-kamu"
                  />
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setGhIsPrivate(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[11px] font-medium transition ${
                    !ghIsPrivate ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}>
                  🌐 <span>Public</span>
                </button>
                <button type="button" onClick={() => setGhIsPrivate(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[11px] font-medium transition ${
                    ghIsPrivate ? 'border-amber-500/60 bg-amber-500/15 text-amber-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}>
                  🔒 <span>Private</span>
                </button>
              </div>

              {/* No Token Warning */}
              {!githubToken && (
                <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-700/40 text-amber-300 text-[11px] leading-relaxed">
                  ⚠️ GitHub Token belum diatur. Buka <strong>Settings</strong> → <em>GitHub PAT</em> untuk mengisi token kamu.
                </div>
              )}

              {/* Progress */}
              {ghUploading && ghProgress && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-cyan-500/20 text-cyan-300 font-mono text-[10px] animate-pulse leading-relaxed">
                  ⏳ {ghProgress}
                </div>
              )}

              {/* Error */}
              {ghError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-700/40 text-rose-300 text-[11px] leading-relaxed">
                  {ghError}
                </div>
              )}

              {/* Success */}
              {ghResult && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/40 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Berhasil di-push ke GitHub!</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">Commit: {ghResult.commitSha}</div>
                  <a href={ghResult.repoUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition">
                    <GithubIcon className="w-3.5 h-3.5" />
                    <span>Lihat di GitHub</span>
                  </a>
                </div>
              )}

              {/* Upload Button */}
              {!ghResult && (
                <button
                  type="button"
                  disabled={ghUploading || !githubToken}
                  onClick={handleGitHubUploadInline}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow border border-slate-600"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{ghUploading ? 'Mengupload...' : '🚀 Push Semua File ke GitHub'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-3 py-1.5 bg-[#1f1f1f] border-t border-[#2b2b2b] overflow-x-auto no-scrollbar flex items-center gap-1.5">
        {activePrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => onSendPrompt(qp, aiMode)}
            className="px-2.5 py-1 text-[11px] rounded bg-[#252526] hover:bg-[#2a2d2e] text-slate-300 border border-[#333333] whitespace-nowrap active:scale-95 transition"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-2.5 bg-[#181818] border-t border-[#2b2b2b] flex items-center gap-2"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder={
            aiMode === 'plan'
              ? `[Mode Plan] Minta ${aiProvider === 'claude' ? 'Claude' : 'Gemini'} merencanakan fitur...`
              : `[Interaktif] Tanya ${aiProvider === 'claude' ? 'Claude' : 'Gemini'} tentang ${activeFile?.name || 'project'}...`
          }
          disabled={aiStage === 'planning' || aiStage === 'generating'}
          className="flex-1 bg-[#252526] border border-[#3c3c3c] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#007acc]"
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim() || aiStage === 'planning' || aiStage === 'generating'}
          className={`p-2 rounded text-white disabled:opacity-40 transition active:scale-95 shadow ${
            aiProvider === 'claude'
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-[#007acc] hover:bg-[#1177bb]'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
