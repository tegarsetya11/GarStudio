import React from 'react'
import {
  GitBranch,
  AlertCircle,
  CheckCircle,
  Split,
  Eye,
  Code2,
  Sparkles,
  Smartphone,
} from 'lucide-react'
import type { AIProvider, PreviewError, ViewMode, WorkspaceFile } from '../types'

interface VSCodeStatusBarProps {
  activeFile: WorkspaceFile | null
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  aiProvider: AIProvider
  error: PreviewError | null
  onOpenSettings: () => void
  onOpenAI: () => void
  folderName: string | null
}

export const VSCodeStatusBar: React.FC<VSCodeStatusBarProps> = ({
  activeFile,
  viewMode,
  setViewMode,
  aiProvider,
  error,
  onOpenAI,
  folderName,
}) => {
  const getLanguageMode = (name: string) => {
    if (name.endsWith('.html')) return 'HTML'
    if (name.endsWith('.css')) return 'CSS'
    if (name.endsWith('.js')) return 'JavaScript'
    if (name.endsWith('.ts')) return 'TypeScript'
    if (name.endsWith('.json')) return 'JSON'
    if (name.endsWith('.md')) return 'Markdown'
    return 'Plain Text'
  }

  return (
    <footer className="h-6 bg-[#131314] text-slate-300 border-t border-[#282a2c] flex items-center justify-between px-3 text-[11px] select-none shrink-0 z-40 overflow-hidden font-mono">
      {/* Left Items */}
      <div className="flex items-center gap-2.5 truncate">
        {/* Remote indicator */}
        <div className="flex items-center gap-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded cursor-pointer font-sans font-semibold text-[10px]">
          <Smartphone className="w-3 h-3" />
          <span className="hidden sm:inline">Workspace:</span>
          <span>{folderName ? folderName : 'Local'}</span>
        </div>

        {/* Git Branch */}
        <div className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
          <GitBranch className="w-3 h-3 text-purple-400" />
          <span>main</span>
        </div>

        {/* Error / Diagnostics */}
        {error ? (
          <div
            onClick={onOpenAI}
            className="flex items-center gap-1 bg-rose-600/90 hover:bg-rose-600 px-1.5 py-0.5 rounded cursor-pointer animate-pulse font-sans font-semibold text-[10px]"
            title="Click to auto-fix bug with AI"
          >
            <AlertCircle className="w-3 h-3" />
            <span>1 Bug (Click to Fix)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer opacity-90 hidden sm:flex">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>0</span>
          </div>
        )}
      </div>

      {/* Right Items */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* View Mode Toggle: Tri-View | Code | Split | Preview */}
        <div className="flex items-center bg-[#1e1f20] border border-[#282a2c] rounded-lg p-0.5 mr-1 gap-0.5">
          <button
            onClick={() => setViewMode('tri')}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] transition cursor-pointer ${
              viewMode === 'tri' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="3 Penampil Sekaligus (Code + Preview + AI Agent)"
          >
            <span>✨ 3-Panel</span>
          </button>
          <button
            onClick={() => setViewMode('editor')}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] transition cursor-pointer ${
              viewMode === 'editor' ? 'bg-[#282a2c] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Code Editor Only"
          >
            <Code2 className="w-3 h-3" />
            <span className="hidden md:inline">Code</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] transition cursor-pointer ${
              viewMode === 'split' ? 'bg-[#282a2c] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Split: Code on left, Live Web on right"
          >
            <Split className="w-3 h-3" />
            <span className="font-bold">Split</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] transition cursor-pointer ${
              viewMode === 'preview' ? 'bg-[#282a2c] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Live Web Preview Only"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden md:inline">Preview</span>
          </button>
        </div>

        {/* Encoding & Language */}
        <span className="hidden sm:inline hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer opacity-90">
          UTF-8
        </span>
        <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer font-sans font-medium">
          {activeFile ? getLanguageMode(activeFile.name) : 'HTML'}
        </span>

        {/* Active AI Agent Indicator */}
        <div
          onClick={onOpenAI}
          className="flex items-center gap-1 hover:bg-white/15 px-1.5 py-0.5 rounded cursor-pointer bg-black/20 font-sans"
        >
          <Sparkles className="w-3 h-3 text-cyan-200" />
          <span className="hidden sm:inline font-semibold">
            {aiProvider === 'claude' ? 'Claude 3.5' : 'Gemini 1.5'}
          </span>
        </div>
      </div>
    </footer>
  )
}
