import React from 'react'
import {
  Files,
  GitBranch,
  Eye,
  Sparkles,
  Settings,
  FolderOpen,
} from 'lucide-react'
import type { ActivePanel } from '../types'

interface VSCodeActivityBarProps {
  activePanel: ActivePanel
  setActivePanel: (panel: ActivePanel) => void
  onOpenSettings: () => void
  onOpenFolder: () => void
  hasError: boolean
}

export const VSCodeActivityBar: React.FC<VSCodeActivityBarProps> = ({
  activePanel,
  setActivePanel,
  onOpenSettings,
  onOpenFolder,
  hasError,
}) => {
  return (
    <aside className="w-12 bg-[#181818] border-r border-[#2b2b2b] flex flex-col justify-between items-center py-2 shrink-0 select-none z-30">
      {/* Top Activity Icons */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Explorer */}
        <button
          onClick={() => setActivePanel(activePanel === 'explorer' ? 'editor' : 'explorer')}
          className={`w-full py-2.5 flex items-center justify-center relative transition ${
            activePanel === 'explorer' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Explorer (Files)"
        >
          {activePanel === 'explorer' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#007acc]" />
          )}
          <Files className="w-5 h-5" />
        </button>

        {/* Source Control (GitHub) */}
        <button
          onClick={() => setActivePanel(activePanel === 'git' ? 'editor' : 'git')}
          className={`w-full py-2.5 flex items-center justify-center relative transition ${
            activePanel === 'git' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Source Control (GitHub)"
        >
          {activePanel === 'git' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#007acc]" />
          )}
          <GitBranch className="w-5 h-5" />
        </button>

        {/* Live Preview */}
        <button
          onClick={() => setActivePanel(activePanel === 'preview' ? 'editor' : 'preview')}
          className={`w-full py-2.5 flex items-center justify-center relative transition ${
            activePanel === 'preview' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Live Preview"
        >
          {activePanel === 'preview' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#007acc]" />
          )}
          <Eye className="w-5 h-5" />
          {hasError && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        {/* AI Agent */}
        <button
          onClick={() => setActivePanel(activePanel === 'agent' ? 'editor' : 'agent')}
          className={`w-full py-2.5 flex items-center justify-center relative transition ${
            activePanel === 'agent' ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-300'
          }`}
          title="AI Engineering Agent (Gemini & Claude)"
        >
          {activePanel === 'agent' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-cyan-400" />
          )}
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Android Device Folder */}
        <button
          onClick={onOpenFolder}
          className="w-full py-2.5 flex items-center justify-center text-emerald-400/80 hover:text-emerald-300 transition"
          title="Open Android Device Folder"
        >
          <FolderOpen className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        <button
          onClick={onOpenSettings}
          className="w-full py-2.5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
          title="Settings (API Keys, Themes, Models)"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </aside>
  )
}
