import React, { useState } from 'react'
import { UploadCloud, CheckCircle, ExternalLink, X, Lock, Globe, AlertCircle, Info } from 'lucide-react'
import { GithubIcon } from './GithubIcon'
import type { GitHubConfig, WorkspaceFile } from '../types'
import { GitHubService } from '../services/githubService'

interface GitHubModalProps {
  isOpen: boolean
  onClose: () => void
  files: WorkspaceFile[]
  initialToken?: string
  onSaveToken?: (token: string) => void
}

type ModalLang = 'id' | 'en'

const translations = {
  id: {
    title: 'Unggah ke GitHub',
    tokenLabel: 'Personal Access Token (klasik dengan izin repo)',
    tokenNote: 'Token hanya disimpan secara lokal di memori browser perangkat Anda.',
    repoLabel: 'Nama Repositori',
    descLabel: 'Deskripsi',
    descDefault: 'Aplikasi web mobile dibuat dengan GarStudio AI IDE',
    public: 'Publik',
    private: 'Pribadi',
    btnUpload: 'Buat & Unggah ke GitHub',
    btnUploading: 'Sedang Mengunggah ke GitHub...',
    syncInit: 'Memulai sinkronisasi ke GitHub...',
    pushingChanges: 'Mengunggah file...',
    errMissing: 'Harap masukkan Personal Access Token dan Nama Repositori.',
    errFailed: 'Gagal mengunggah ke GitHub. Harap periksa izin token Anda (scope repo).',
    successTitle: 'Berhasil Diunggah ke GitHub!',
    viewOnGithub: 'Buka di GitHub',
  },
  en: {
    title: 'Upload to GitHub',
    tokenLabel: 'Personal Access Token (classic with repo scope)',
    tokenNote: 'Token is kept strictly local in your device browser storage.',
    repoLabel: 'Repository Name',
    descLabel: 'Description',
    descDefault: 'Mobile web application built with GarStudio AI IDE',
    public: 'Public',
    private: 'Private',
    btnUpload: 'Create & Push to GitHub',
    btnUploading: 'Syncing to GitHub...',
    syncInit: 'Initiating GitHub sync...',
    pushingChanges: 'Pushing changes...',
    errMissing: 'Please provide both GitHub Personal Access Token and Repository Name.',
    errFailed: 'Failed to upload to GitHub. Please check your token permissions (repo scope).',
    successTitle: 'Uploaded Successfully!',
    viewOnGithub: 'View on GitHub',
  },
}

export const GitHubModal: React.FC<GitHubModalProps> = ({
  isOpen,
  onClose,
  files,
  initialToken = '',
  onSaveToken,
}) => {
  const [lang, setLang] = useState<ModalLang>(() => {
    const saved = localStorage.getItem('garstudio_modal_lang')
    return (saved === 'id' || saved === 'en') ? saved : 'id'
  })

  const t = translations[lang]

  const [token, setToken] = useState(initialToken)
  const [repo, setRepo] = useState('garstudio-app')
  const [description, setDescription] = useState(t.descDefault)
  const [isPrivate, setIsPrivate] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<{ repoUrl: string; commitSha: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  if (!isOpen) return null

  const handleSwitchLanguage = (newLang: ModalLang) => {
    setLang(newLang)
    localStorage.setItem('garstudio_modal_lang', newLang)
    if (description === translations.id.descDefault || description === translations.en.descDefault) {
      setDescription(translations[newLang].descDefault)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim() || !repo.trim()) {
      setError(t.errMissing)
      return
    }

    setError(null)
    setResult(null)
    setIsUploading(true)
    setStatusMessage(t.syncInit)

    if (onSaveToken) {
      onSaveToken(token.trim())
    }

    try {
      const config: GitHubConfig = {
        token: token.trim(),
        repo: repo.trim(),
        description: description.trim(),
        isPrivate,
        branch: 'main',
      }

      const res = await GitHubService.uploadWorkspace(config, files, (msg) => {
        setStatusMessage(msg)
      })

      setResult(res)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(t.errFailed)
      }
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#0d1322] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0f172a]">
          <div className="flex items-center gap-2">
            <GithubIcon className="w-5 h-5 text-white" />
            <h2 className="text-sm font-bold text-slate-100">{t.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher: Flag buttons only */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/60 shadow-inner">
              {/* Indonesian Flag */}
              <button
                type="button"
                onClick={() => handleSwitchLanguage('id')}
                title="Bahasa Indonesia"
                className={`p-1 rounded-md transition-all flex items-center justify-center ${
                  lang === 'id'
                    ? 'bg-rose-500/25 ring-1.5 ring-rose-500 shadow-sm scale-105'
                    : 'opacity-50 hover:opacity-100 grayscale-[40%] hover:grayscale-0'
                }`}
              >
                <span className="sr-only">Bahasa Indonesia</span>
                {/* ID Flag SVG */}
                <svg className="w-5 h-3.5 rounded-sm shadow overflow-hidden" viewBox="0 0 3 2">
                  <rect width="3" height="1" fill="#e11d48" />
                  <rect y="1" width="3" height="1" fill="#ffffff" />
                </svg>
              </button>

              {/* British Flag */}
              <button
                type="button"
                onClick={() => handleSwitchLanguage('en')}
                title="English"
                className={`p-1 rounded-md transition-all flex items-center justify-center ${
                  lang === 'en'
                    ? 'bg-blue-500/25 ring-1.5 ring-blue-500 shadow-sm scale-105'
                    : 'opacity-50 hover:opacity-100 grayscale-[40%] hover:grayscale-0'
                }`}
              >
                <span className="sr-only">English</span>
                {/* UK Flag SVG */}
                <svg className="w-5 h-3.5 rounded-sm shadow overflow-hidden" viewBox="0 0 60 30">
                  <clipPath id="gh-uk-s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
                  <clipPath id="gh-uk-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
                  <g clipPath="url(#gh-uk-s)">
                    <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#gh-uk-t)" stroke="#C8102E" strokeWidth="4"/>
                    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                  </g>
                </svg>
              </button>
            </div>

            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleUpload} className="p-4 space-y-3.5 text-xs overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{t.successTitle}</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-mono">
                Commit: {result.commitSha}
              </div>
              <a
                href={result.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs mt-1 transition"
              >
                <span>{t.viewOnGithub}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* GitHub Token */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium">
                {t.tokenLabel}
              </label>
              <button
                type="button"
                onClick={() => setShowHelp((prev) => !prev)}
                className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg transition font-medium ${
                  showHelp
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                }`}
                title={lang === 'id' ? 'Bantuan cara mendapatkan token' : 'Help on getting token'}
              >
                <span className="w-4 h-4 rounded-full bg-cyan-500/30 border border-cyan-400/60 flex items-center justify-center font-bold text-[10px] text-cyan-300">
                  i
                </span>
                <span className="font-semibold">{lang === 'id' ? 'Cara Dapat Token' : 'Get Token'}</span>
              </button>
            </div>

            {/* Beginner-friendly Help Guide Card */}
            {showHelp && (
              <div className="p-3 mb-2.5 rounded-xl bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-950 border border-cyan-500/40 text-slate-200 space-y-2.5 text-[11px] animate-in fade-in slide-in-from-top-1 shadow-xl">
                <div className="flex items-center justify-between font-semibold text-cyan-300 border-b border-cyan-900/60 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center font-bold text-[10px] text-cyan-300">
                      i
                    </span>
                    <span>{lang === 'id' ? 'Langkah Mudah Mendapatkan Token (1 Menit):' : 'Easy Steps to Get Token (1 Minute):'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHelp(false)}
                    className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                  {lang === 'id' ? (
                    <>
                      <li>
                        <strong>Buka Halaman Pembuatan Token:</strong>
                        <div className="mt-1 ml-4">
                          <a
                            href="https://github.com/settings/tokens/new?scopes=repo&description=GarStudio"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-cyan-300 hover:text-white bg-cyan-900/50 hover:bg-cyan-700/60 border border-cyan-500/40 px-2 py-1 rounded-lg font-bold transition shadow-sm"
                          >
                            <span>Klik di Sini untuk Buat Token Otomatis</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </li>
                      <li>
                        <strong>Centang Izin Repositori:</strong> Pastikan kotak <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 rounded font-mono font-bold border border-cyan-800">repo</span> (Full control of private repositories) sudah tercentang.
                      </li>
                      <li>
                        <strong>Generate Token:</strong> Gulir ke halaman paling bawah, lalu klik tombol hijau <span className="text-emerald-400 font-bold">"Generate token"</span>.
                      </li>
                      <li>
                        <strong>Salin & Tempel:</strong> Salin kode yang diawali <span className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-mono font-bold">ghp_...</span>, lalu tempelkan ke kolom input di bawah ini.
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <strong>Open Token Creation Page:</strong>
                        <div className="mt-1 ml-4">
                          <a
                            href="https://github.com/settings/tokens/new?scopes=repo&description=GarStudio"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-cyan-300 hover:text-white bg-cyan-900/50 hover:bg-cyan-700/60 border border-cyan-500/40 px-2 py-1 rounded-lg font-bold transition shadow-sm"
                          >
                            <span>Click Here to Auto-Create Token</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </li>
                      <li>
                        <strong>Check Repo Permission:</strong> Make sure the <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 rounded font-mono font-bold border border-cyan-800">repo</span> permission checkbox is selected.
                      </li>
                      <li>
                        <strong>Generate Token:</strong> Scroll down to the bottom and click the green button <span className="text-emerald-400 font-bold">"Generate token"</span>.
                      </li>
                      <li>
                        <strong>Copy & Paste:</strong> Copy the code starting with <span className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-mono font-bold">ghp_...</span>, and paste it into the field below.
                      </li>
                    </>
                  )}
                </ol>

                <div className="p-2 rounded-lg bg-black/40 border border-cyan-900/40 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>
                    {lang === 'id'
                      ? '💡 Token ini disimpan aman di perangkat Anda untuk upload otomatis.'
                      : '💡 Token is safely stored in your browser device for auto uploads.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHelp(false)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold text-[10px] hover:underline"
                  >
                    {lang === 'id' ? 'Tutup Panduan' : 'Close Guide'}
                  </button>
                </div>
              </div>
            )}

            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] mt-1.5">
              <span className="text-slate-400">{t.tokenNote}</span>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=GarStudio"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 shrink-0 hover:underline"
              >
                <span>{lang === 'id' ? 'Buat Token di GitHub ↗' : 'Generate Token on GitHub ↗'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Repo Name */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">{t.repoLabel}</label>
            <input
              type="text"
              placeholder="garstudio-app"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">{t.descLabel}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-4 py-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                checked={!isPrivate}
                onChange={() => setIsPrivate(false)}
                className="text-cyan-500"
              />
              <span className="flex items-center gap-1 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-cyan-400" /> {t.public}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                checked={isPrivate}
                onChange={() => setIsPrivate(true)}
                className="text-cyan-500"
              />
              <span className="flex items-center gap-1 text-slate-300">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> {t.private}
              </span>
            </label>
          </div>

          {/* Live Progress Status */}
          {isUploading && (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] animate-pulse">
              {statusMessage || t.pushingChanges}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-98 transition text-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? t.btnUploading : t.btnUpload}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
