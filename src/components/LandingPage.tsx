import React, { useState } from 'react'
import { Sparkles, BookOpen, LogIn, ArrowRight, Smartphone, Code2, Globe, Bot, CheckCircle2, Shield, X } from 'lucide-react'
import { GithubIcon } from './GithubIcon'
import { TutorialModal } from './TutorialModal'
import type { UserSession } from '../types'

interface LandingPageProps {
  onLoginSuccess: (session: UserSession) => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [customUsername, setCustomUsername] = useState('')

  const handleLogin = (provider: 'github' | 'google') => {
    const name = customUsername.trim() || (provider === 'github' ? 'GitHub Developer' : 'Google Developer')
    const session: UserSession = {
      id: 'user-' + Date.now(),
      name,
      email: provider === 'github' ? `${name.toLowerCase().replace(/\s+/g, '')}@github.com` : `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      provider,
      avatarUrl: provider === 'github' ? 'https://github.com/identicons/user.png' : '',
    }
    localStorage.setItem('garstudio_user_session', JSON.stringify(session))
    setIsLoginModalOpen(false)
    onLoginSuccess(session)
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#0a0f1d] text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Decorative Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-[130px]" />
      </div>

      {/* Top Navbar */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-slate-800/60 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
            GarStudio
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTutorialOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 border border-slate-700/50 transition font-medium"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Tutorial</span>
          </button>

          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 active:scale-95 transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto px-5 py-10 sm:py-16 flex flex-col items-center text-center justify-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium animate-pulse">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile AI IDE for Android & Desktop</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Coding & Bangun Website Impian Langsung dari{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              HP Anda
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl mx-auto">
            IDE modern dengan AI Agent pintar berbahasa Indonesia (Gemini 3.8 Flash, Claude, Copilot), penampil 3 tingkat responsif, dan integrasi folder fisik Android.
          </p>
        </div>

        {/* ── 2 TOMBOL UTAMA (Sesuai Permintaan User) ── */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2">
          {/* Tombol 1: Login ke GitHub atau Google */}
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-cyan-500/25 active:scale-95 transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk dengan GitHub atau Google</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Tombol 2: Ke Halaman Tutorial */}
          <button
            onClick={() => setIsTutorialOpen(true)}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#141b2d] hover:bg-[#1a233b] border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 transition active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Panduan & Tutorial</span>
          </button>
        </div>

        {/* Feature Grid Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full pt-8 text-left">
          <div className="p-4 rounded-2xl bg-[#0f172a]/70 border border-slate-800 hover:border-cyan-500/30 transition">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-2.5 text-cyan-400">
              <Code2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-white">3-Tier Mobile Layout</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Atas untuk HTML Code Editor, Tengah untuk Web Preview, Bawah untuk AI Agent.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f172a]/70 border border-slate-800 hover:border-cyan-500/30 transition">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2.5 text-blue-400">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-white">AI Berbahasa Indonesia</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Paham perintah Bahasa Indonesia dengan Gemini 3.8 Flash, Claude 3.5, & Copilot.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f172a]/70 border border-slate-800 hover:border-cyan-500/30 transition">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2.5 text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-white">Folder Lokal & GitHub</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Buka folder asli di Android dan upload proyek ke GitHub hanya dengan sekali klik.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-5 py-4 border-t border-slate-800/60 bg-[#0a0f1d] text-center text-xs text-slate-500">
        GarStudio AI IDE © 2026 — Mobile Web Development Made Effortless
      </footer>

      {/* ── MODAL PILIHAN LOGIN (GitHub & Google) ── */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0d1322] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0f172a]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <LogIn className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white">Pilih Metode Masuk</h2>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-400">
                Pilih akun untuk masuk ke ruang kerja GarStudio dan mulai membuat aplikasi:
              </p>

              {/* Optional Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 text-[11px]">
                  Nama Panggilan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tegar / Developer"
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
                />
              </div>

              {/* Option 1: Login with GitHub */}
              <button
                onClick={() => handleLogin('github')}
                className="w-full py-3 px-4 rounded-2xl bg-[#1e293b] hover:bg-[#283548] border border-slate-700 hover:border-slate-500 text-white font-semibold flex items-center justify-center gap-3 transition shadow-md active:scale-98"
              >
                <GithubIcon className="w-5 h-5" />
                <span>Masuk dengan GitHub</span>
              </button>

              {/* Option 2: Login with Google */}
              <button
                onClick={() => handleLogin('google')}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-semibold flex items-center justify-center gap-3 transition shadow-md active:scale-98"
              >
                {/* Google Colored Logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Google</span>
              </button>

              <div className="pt-2 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span>Sesi disimpan aman di browser perangkat Anda</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onStartCoding={() => setIsLoginModalOpen(true)}
      />
    </div>
  )
}
