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
    <aside className="w-12 bg-[#131314] border-r border-[#282a2c] flex flex-col justify-between items-center py-3 shrink-0 select-none z-30">
      {/* Top Activity Icons */}
      <div className="flex flex-col items-center gap-2 w-full px-1">
        {/* Explorer */}
        <button
          onClick={() => setActivePanel(activePanel === 'explorer' ? 'editor' : 'explorer')}
          className={`w-9 h-9 rounded-xl flex items-center justify-center relative transition active:scale-95 cursor-pointer ${
            activePanel === 'explorer'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e1f20]'
          }`}
          title="File Explorer"
        >
          <Files className="w-4 h-4" />
        </button>

        {/* Source Control (GitHub) */}
        <button
          onClick={() => setActivePanel(activePanel === 'git' ? 'editor' : 'git')}
          className={`w-9 h-9 rounded-xl flex items-center justify-center relative transition active:scale-95 cursor-pointer ${
            activePanel === 'git'
              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-sm shadow-purple-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e1f20]'
          }`}
          title="GitHub Sync & Version Control"
        >
          <GitBranch className="w-4 h-4" />
        </button>

        {/* Live Preview */}
        <button
          onClick={() => setActivePanel(activePanel === 'preview' ? 'editor' : 'preview')}
          className={`w-9 h-9 rounded-xl flex items-center justify-center relative transition active:scale-95 cursor-pointer ${
            activePanel === 'preview'
              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e1f20]'
          }`}
          title="Live Preview Sandbox"
        >
          <Eye className="w-4 h-4" />
          {hasError && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        {/* AI Agent */}
        <button
          onClick={() => setActivePanel(activePanel === 'agent' ? 'editor' : 'agent')}
          className={`w-9 h-9 rounded-xl flex items-center justify-center relative transition active:scale-95 cursor-pointer ${
            activePanel === 'agent'
              ? 'bg-gradient-to-tr from-blue-600/30 to-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/25'
              : 'text-slate-400 hover:text-purple-300 hover:bg-[#1e1f20]'
          }`}
          title="Google Gemini AI Agent Panel"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Android Device Folder */}
        <button
          onClick={onOpenFolder}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-[#1e1f20] transition active:scale-95 cursor-pointer"
          title="Hubungkan Folder Kerja"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center gap-1 w-full px-1">
        <button
          onClick={onOpenSettings}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-[#1e1f20] transition active:scale-95 cursor-pointer"
          title="Pengaturan GarStudio"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
