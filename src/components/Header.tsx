import React from 'react'
import {
  FolderOpen,
  Settings,
  Sparkles,
  Download,
  LogOut,
  BookOpen,
} from 'lucide-react'
import { GithubIcon } from './GithubIcon'
import type { UserSession, WorkspaceFile } from '../types'

interface HeaderProps {
  folderName: string | null
  activeFile: WorkspaceFile | null
  onOpenFolder?: () => void
  onOpenSettings: () => void
  onOpenGitHub: () => void
  onExport: () => void
  currentUser?: UserSession | null
  onLogout?: () => void
  onOpenTutorial?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  folderName,
  activeFile,
  onOpenFolder,
  onOpenSettings,
  onOpenGitHub,
  onExport,
  currentUser,
  onLogout,
  onOpenTutorial,
}) => {
  return (
    <header className="h-9 bg-[#181818] border-b border-[#2b2b2b] px-2 flex items-center justify-between shrink-0 select-none z-20 text-slate-300 text-xs">
      {/* Left: VS Code Brand & Pseudo-Menus */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 font-bold text-xs text-white">
          <img src="/garstudio-icon.png" alt="GarStudio" className="w-5 h-5 object-contain" />
          <span className="hidden sm:inline font-extrabold bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent tracking-tight">
            GarStudio
          </span>
        </div>

        {/* VS Code Classic Menus */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-400 pl-2">
          <span className="px-1.5 py-0.5 rounded hover:bg-[#2a2d2e] cursor-pointer">File</span>
          <span className="px-1.5 py-0.5 rounded hover:bg-[#2a2d2e] cursor-pointer">Edit</span>
          <span className="px-1.5 py-0.5 rounded hover:bg-[#2a2d2e] cursor-pointer">Selection</span>
          <span className="px-1.5 py-0.5 rounded hover:bg-[#2a2d2e] cursor-pointer">View</span>
          <span className="px-1.5 py-0.5 rounded hover:bg-[#2a2d2e] cursor-pointer">Run</span>
        </div>
      </div>

      {/* Center: Command Palette / Title Bar */}
      <div className="flex-1 max-w-sm mx-2">
        <div className="flex items-center justify-center gap-1 px-3 py-0.5 bg-[#252526] hover:bg-[#2a2d2e] border border-[#333333] rounded text-[11px] text-slate-300 cursor-pointer truncate">
          <span className="text-cyan-400 font-mono font-medium truncate">
            {activeFile ? activeFile.name : 'index.html'}
          </span>
          <span className="text-slate-500 font-normal">—</span>
          <span className="text-slate-400 truncate">{folderName ? folderName : 'GarStudio Workspace'}</span>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-1 shrink-0">





        {/* GitHub Sync */}
        <button
          onClick={onOpenGitHub}
          title="Push to GitHub"
          className="p-1 rounded hover:bg-[#2a2d2e] text-slate-300 transition"
        >
          <GithubIcon className="w-3.5 h-3.5 text-slate-300" />
        </button>

        {/* Export Files */}
        <button
          onClick={onExport}
          title="Download Project"
          className="p-1 rounded hover:bg-[#2a2d2e] text-slate-300 transition hidden sm:flex"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1 rounded hover:bg-[#2a2d2e] text-slate-300 transition"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Tutorial Shortcut */}
        {onOpenTutorial && (
          <button
            onClick={onOpenTutorial}
            title="Buka Panduan Tutorial"
            className="p-1 rounded hover:bg-[#2a2d2e] text-cyan-400 hover:text-cyan-300 transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        )}

        {/* User Session & Logout */}
        {currentUser && (
          <div className="flex items-center gap-1 pl-1 ml-1 border-l border-slate-700/60">
            <div className="flex items-center gap-1 text-[11px] text-slate-300 px-1.5 py-0.5 rounded bg-slate-800/80 max-w-[100px] truncate" title={`Masuk sebagai: ${currentUser.name} (${currentUser.provider})`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">{currentUser.name}</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Keluar / Kembali ke Beranda"
                className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
