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
  X,
  UploadCloud,
  GitBranch,
  FolderOpen,
} from 'lucide-react'
import type { AIMessage, AIMode, AIProvider, AIStage, FileChange, WorkspaceFile } from '../types'
import { AIAgentService } from '../services/aiAgentService'
import { GitHubService } from '../services/githubService'
import { GithubIcon } from './GithubIcon'

interface AIAgentPanelProps {
  messages: AIMessage[]
  aiStage: AIStage
  aiProvider: AIProvider
  aiMode?: AIMode
  onSwitchProvider: (provider: AIProvider) => void
  onSwitchMode?: (mode: AIMode) => void
  onSendPrompt: (prompt: string, mode?: AIMode) => void
  onApplyChanges: (changes: FileChange[]) => void
  activeFile: WorkspaceFile | null
  files?: WorkspaceFile[]
  onClose?: () => void
  onGitHubUpload?: (repoName: string, isPrivate: boolean) => Promise<void>
  githubToken?: string
  folderLinked?: boolean
  onOpenFolder?: () => void
}

export const AIAgentPanel: React.FC<AIAgentPanelProps> = ({
  messages,
  aiStage,
  aiProvider,
  onSwitchProvider,
  onSendPrompt,
  onApplyChanges,
  activeFile,
  files: _files,
  onClose,
  onGitHubUpload,
  githubToken = '',
  folderLinked = false,
  onOpenFolder,
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

    onSendPrompt(prompt)
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

  // Quick suggestions for autonomous creation and direct corrections
  const quickPrompts = [
    '🚀 Buat game quiz (TKA, B. Inggris, B. Indo, Matematika)',
    '🎨 Ubah tema dark mode & gradient neon',
    '⏱️ Tambahkan timer 30 detik & hitung skor',
    '📱 Buat landing page toko online responsif',
    '🔄 Tambahkan sound efek & animasi transisi',
  ]

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
                ? 'GitHub Copilot GPT-4o'
                : 'Gemini 3.8 Flash'}
            </div>
            <div className="text-[10px] text-slate-400">
              {aiProvider === 'claude'
                ? 'Anthropic AI'
                : aiProvider === 'copilot'
                ? 'Microsoft / OpenAI'
                : 'Google AI'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Engine Switcher */}
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

      {/* 2. Unified Auto-Detect Banner */}
      <div className="px-3 py-1.5 bg-[#141414] border-b border-[#2b2b2b] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Auto-Detect AI Agent</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Auto-Plan, Generate & Koreksi Langsung</span>
        </div>
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
                  <Bot className="w-3 h-3 text-amber-400" />
                  <span>
                    GarStudio AI (
                    {aiProvider === 'claude'
                      ? 'Claude'
                      : aiProvider === 'copilot'
                      ? 'Copilot'
                      : 'Gemini 3.8 Flash'}
                    )
                  </span>
                </>
              )}
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Content Bubble */}
            <div
              className={`p-3 rounded-2xl max-w-[92%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md'
                  : 'bg-[#252526] border border-[#333333] text-slate-200 rounded-tl-none shadow-lg'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Render Structured Plan if available */}
              {msg.plan && (
                <div className="mt-3 p-3 bg-[#1e1e1e] border border-cyan-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-1.5">
                    <span className="font-bold text-cyan-400 flex items-center gap-1 text-[11px]">
                      🎯 RENCANA ARSITEKTUR
                    </span>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
                      {msg.plan.steps.length} Langkah
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 italic">{msg.plan.overview}</p>
                  <div className="space-y-1.5 pt-1">
                    {msg.plan.steps.map((s, idx) => (
                      <div key={s.id || idx} className="flex items-start gap-2 text-[11px]">
                        <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-200">{s.title}</div>
                          <div className="text-[10px] text-slate-400">{s.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Changes if available (Auto-applied indicator) */}
              {msg.changes && msg.changes.length > 0 && (
                <div className="mt-3 p-3 bg-[#181818] border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-1.5">
                    <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Kode Diterapkan Otomatis
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {msg.changes.length} File
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {msg.changes.map((change, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-[#222225] border border-[#333333] text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{change.path}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{change.summary}</div>
                      </div>
                    ))}
                  </div>

                  <div className="w-full mt-2 py-1.5 px-3 bg-emerald-950/70 border border-emerald-600/40 text-emerald-300 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Langsung Aktif & Berjalan di Live Preview</span>
                  </div>
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
                ? `Merumuskan arsitektur dengan ${aiProvider === 'claude' ? 'Claude AI' : 'Gemini'}...`
                : aiStage === 'generating'
                ? `Menghasilkan kode & langsung menerapkan ke Live Preview...`
                : 'Menganalisis & menerapkan koreksi kode...'}
            </span>
          </div>
        )}

        {/* ── INLINE GITHUB UPLOAD CARD ── */}
        {showGhCard && (
          <div className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 to-[#0d1117] shadow-xl overflow-hidden">
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

              {!githubToken && (
                <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-700/40 text-amber-300 text-[11px] leading-relaxed">
                  ⚠️ GitHub Token belum diatur. Buka <strong>Settings</strong> → <em>GitHub PAT</em> untuk mengisi token kamu.
                </div>
              )}

              {ghUploading && ghProgress && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-cyan-500/20 text-cyan-300 font-mono text-[10px] animate-pulse leading-relaxed">
                  ⏳ {ghProgress}
                </div>
              )}

              {ghError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-700/40 text-rose-300 text-[11px] leading-relaxed">
                  {ghError}
                </div>
              )}

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

              {!ghResult && (
                <button
                  type="button"
                  disabled={ghUploading || !githubToken}
                  onClick={handleGitHubUploadInline}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow border border-slate-600 cursor-pointer"
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
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => folderLinked && onSendPrompt(qp)}
            disabled={!folderLinked}
            className={`px-2.5 py-1 text-[11px] rounded bg-[#252526] border border-[#333333] whitespace-nowrap transition ${
              folderLinked
                ? 'text-slate-300 hover:bg-[#2a2d2e] active:scale-95 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            {qp}
          </button>
        ))}
      </div>

      {/* ⚠️ Folder Warning Banner — tampil ketika belum ada folder */}
      {!folderLinked && (
        <div className="mx-2.5 mb-2 mt-1 p-3 rounded-xl bg-amber-950/70 border border-amber-600/40 flex flex-col gap-2 shadow-inner">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-[11px]">
            <span className="text-base leading-none">📁</span>
            <span>Folder belum terhubung</span>
          </div>
          <p className="text-[10px] text-amber-200/80 leading-relaxed">
            Hubungkan atau buat folder terlebih dahulu agar AI dapat menyimpan file ke perangkat Anda.
          </p>
          {onOpenFolder && (
            <button
              type="button"
              onClick={onOpenFolder}
              className="mt-0.5 w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 shadow cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Buka / Hubungkan Folder</span>
            </button>
          )}
        </div>
      )}

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
            !folderLinked
              ? '⚠️ Hubungkan folder dulu sebelum menggunakan AI...'
              : 'Tulis web impian atau koreksi kode (contoh: buat web quiz, ubah warna background, tambah timer)...'
          }
          disabled={!folderLinked || aiStage === 'planning' || aiStage === 'generating'}
          className={`flex-1 bg-[#252526] border rounded-xl px-3 py-2 text-xs placeholder-slate-500 focus:outline-none transition ${
            !folderLinked
              ? 'border-amber-700/40 text-slate-500 cursor-not-allowed'
              : 'border-[#3c3c3c] text-slate-100 focus:border-[#007acc]'
          }`}
        />
        <button
          type="submit"
          disabled={!folderLinked || !inputPrompt.trim() || aiStage === 'planning' || aiStage === 'generating'}
          className={`p-2.5 rounded-xl text-white disabled:opacity-40 transition active:scale-95 shadow cursor-pointer ${
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
