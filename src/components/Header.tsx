import React, { useState, useRef, useEffect } from 'react'
import {
  Settings,
  Download,
  LogOut,
  BookOpen,
  AlertTriangle,
  X,
  ChevronDown,
  User,
  FolderOpen,
  Cpu,
  ShieldCheck,
} from 'lucide-react'
import { GithubIcon } from './GithubIcon'
import { GoogleIcon } from './GoogleIcon'
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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isGoogle = currentUser?.provider === 'google'

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

        {/* Push to GitHub */}
        <button
          onClick={onOpenGitHub}
          title="Push to GitHub"
          className="p-1 rounded hover:bg-[#2a2d2e] text-slate-300 transition"
        >
          <GithubIcon className="w-3.5 h-3.5 text-slate-300" />
        </button>

        {/* Google / User Account Button with Antigravity-Style Dropdown */}
        {currentUser && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              title={`Akun: ${currentUser.name} (${isGoogle ? 'Google Account' : 'GitHub Account'})`}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#252526]/80 hover:bg-[#2e2e30] border border-[#3a3a3a] transition cursor-pointer active:scale-98"
            >
              {/* Avatar with Google badge */}
              <div className="relative shrink-0">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full border border-slate-600 object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 border border-cyan-400/50 flex items-center justify-center text-white font-bold text-[10px]">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                  </div>
                )}
                {/* Badge Icon on avatar */}
                <div className="absolute -bottom-1 -right-1 bg-[#1e1e1e] rounded-full p-0.5 border border-slate-700">
                  {isGoogle ? (
                    <GoogleIcon className="w-2.5 h-2.5" />
                  ) : (
                    <GithubIcon className="w-2.5 h-2.5 text-slate-300" />
                  )}
                </div>
              </div>

              {/* User Name preview (compact) */}
              <span className="hidden sm:inline-block max-w-[85px] truncate font-medium text-[11px] text-slate-200">
                {currentUser.name}
              </span>

              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Antigravity Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#1b1b1e] border border-[#333338] rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">

                {/* Profile Header (Antigravity Style) */}
                <div className="p-3.5 bg-gradient-to-b from-[#25252b] to-[#1e1e24] border-b border-[#2d2d34]">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {currentUser.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.name}
                          className="w-11 h-11 rounded-full border-2 border-slate-600 object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 border-2 border-cyan-400/50 flex items-center justify-center text-white font-bold text-base shadow-md">
                          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-[#1e1e1e] rounded-full p-1 border border-slate-700 shadow">
                        {isGoogle ? (
                          <GoogleIcon className="w-3.5 h-3.5" />
                        ) : (
                          <GithubIcon className="w-3.5 h-3.5 text-slate-300" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{currentUser.name}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                          {isGoogle ? <GoogleIcon className="w-2.5 h-2.5" /> : <GithubIcon className="w-2.5 h-2.5" />}
                          {isGoogle ? 'Google Account' : 'GitHub Account'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Aktif
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Antigravity AI Engine status bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Cpu className="w-3 h-3 text-cyan-400" />
                      <span>Engine: <span className="text-slate-200 font-medium">Gemini 3.8 Flash</span></span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px]">
                      Antigravity AI
                    </span>
                  </div>
                </div>

                {/* Antigravity Options List */}
                <div className="p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); onOpenSettings() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-slate-300 hover:bg-[#282830] hover:text-white transition text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <div className="font-medium text-slate-200">Pengaturan Antigravity</div>
                      <div className="text-[10px] text-slate-500">Kunci API, model AI, dan preferensi</div>
                    </div>
                  </button>

                  {onOpenTutorial && (
                    <button
                      type="button"
                      onClick={() => { setShowUserMenu(false); onOpenTutorial() }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-slate-300 hover:bg-[#282830] hover:text-white transition text-left cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-200">Panduan & Tutorial</div>
                        <div className="text-[10px] text-slate-500">Cara kerja IDE, AI Agent, & folder Android</div>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); onOpenGitHub() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-slate-300 hover:bg-[#282830] hover:text-white transition text-left cursor-pointer"
                  >
                    <GithubIcon className="w-4 h-4 text-slate-300" />
                    <div className="flex-1">
                      <div className="font-medium text-slate-200">Push ke GitHub</div>
                      <div className="text-[10px] text-slate-500">Sinkronisasi repositori dan commit kode</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); onExport() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-slate-300 hover:bg-[#282830] hover:text-white transition text-left cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <div className="flex-1">
                      <div className="font-medium text-slate-200">Download Proyek</div>
                      <div className="text-[10px] text-slate-500">Ekspor semua file kode ke format ZIP</div>
                    </div>
                  </button>

                  {onOpenFolder && (
                    <button
                      type="button"
                      onClick={() => { setShowUserMenu(false); onOpenFolder() }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-slate-300 hover:bg-[#282830] hover:text-white transition text-left cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4 text-blue-400" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-200">
                          {folderName ? `Folder: ${folderName}` : 'Hubungkan Folder Fisik'}
                        </div>
                        <div className="text-[10px] text-slate-500">Buka atau ganti folder kerja di perangkat</div>
                      </div>
                    </button>
                  )}

                  <div className="my-1 border-t border-[#2d2d34]" />

                  {/* Sign out */}
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); setShowExitModal(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-red-400 hover:bg-red-950/40 hover:text-red-300 transition text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <div className="flex-1">
                      <div className="font-medium">Keluar Akun / Kembali ke Beranda</div>
                      <div className="text-[10px] text-red-400/70">Keluar dari sesi dan simpan perubahan</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export Files (hidden on mobile — now also in dropdown) */}
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

        {/* Tombol Beranda (Panel Kotak Merah Jelas) */}
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
