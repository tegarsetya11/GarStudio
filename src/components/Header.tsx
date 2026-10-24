import React, { useState } from 'react'
import {
  FolderOpen,
  Settings,
  Sparkles,
  Download,
  LogOut,
  BookOpen,
  AlertTriangle,
  X,
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
  const [showExitModal, setShowExitModal] = useState(false)
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

        {/* User Session Info */}
        {currentUser && (
          <div
            className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-300 px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700/50 max-w-[120px] truncate"
            title={`Masuk sebagai: ${currentUser.name} (${currentUser.provider})`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate font-medium">{currentUser.name}</span>
          </div>
        )}

        {/* Tombol Keluar / Kembali ke Beranda (Panel Kotak Merah Jelas) */}
        {onLogout && (
          <button
            type="button"
            onClick={() => setShowExitModal(true)}
            title="Kembali ke Beranda"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-[11px] shadow-sm shadow-red-950/40 border border-red-500/50 transition active:scale-95 cursor-pointer ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </button>
        )}
      </div>

      {/* Modal Konfirmasi: Kembali ke Beranda */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#18181b] border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-slate-200 space-y-4 relative">
            <button
              onClick={() => setShowExitModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Kembali ke Beranda?</h3>
                <p className="text-[11px] text-slate-400">Konfirmasi keluar dari editor</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              Apakah Anda yakin ingin keluar dari editor? Pastikan kode sudah tersimpan agar progres Anda tetap aman.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs font-semibold transition border border-slate-700/60 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Batal / Lanjutkan Proyek
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false)
                  onLogout?.()
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:from-red-700 active:to-rose-700 text-white text-xs font-semibold shadow-lg shadow-red-950/50 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Kembali ke Beranda</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
