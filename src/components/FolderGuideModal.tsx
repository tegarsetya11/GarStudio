import React from 'react'
import { FolderOpen, Smartphone, Check, ArrowRight, X, AlertCircle } from 'lucide-react'

interface FolderGuideModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenFolder: () => void
  onContinueWithoutFolder: () => void
}

export const FolderGuideModal: React.FC<FolderGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenFolder,
  onContinueWithoutFolder,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-[#0d1322] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-inner">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Persiapan Sebelum Memulai</h2>
              <p className="text-[11px] text-cyan-400">Hubungkan Folder di Perangkat Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content with User's Exact Instructions */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            Sebelum Anda mulai membuat atau mengedit website, Anda disarankan menghubungkan folder penyimpanan di HP/perangkat Anda agar file tersimpan secara nyata:
          </p>

          {/* Step-by-Step Box with User's Exact Guide */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5 border border-cyan-500/30">
                1
              </span>
              <p className="text-slate-200 leading-snug">
                Klik ikon folder cyan tersebut (<span className="text-cyan-400 font-semibold inline-flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5 inline" /> Buka Folder</span>).
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5 border border-cyan-500/30">
                2
              </span>
              <p className="text-slate-200 leading-snug">
                Browser HP (seperti Google Chrome) akan membuka jendela pemilihan folder (file manager bawaan HP).
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5 border border-cyan-500/30">
                3
              </span>
              <p className="text-slate-200 leading-snug">
                Pilih folder tempat Anda menyimpan proyek website di HP Anda.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5 border border-cyan-500/30">
                4
              </span>
              <p className="text-slate-200 leading-snug">
                Klik <strong className="text-emerald-400">"Gunakan folder ini"</strong> / <strong className="text-emerald-400">"Izinkan"</strong> untuk memberikan izin baca & tulis.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5 border border-emerald-500/30">
                ✓
              </span>
              <p className="text-emerald-300 font-medium leading-snug">
                Seluruh file HTML, CSS, dan JS di dalam folder tersebut akan langsung tampil di editor dan preview GarStudio!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300">
            <Smartphone className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>
              File akan otomatis disinkronkan saat AI merumuskan kode atau saat Anda menekan <strong>Save Files</strong>.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-[#0a0f1d] flex flex-col gap-2">
          {/* Main Action: Open Physical Folder */}
          <button
            onClick={() => {
              onClose()
              onOpenFolder()
            }}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-98 transition"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Pilih Folder di HP Sekarang</span>
          </button>

          {/* Fallback / Virtual Workspace */}
          <button
            onClick={() => {
              onClose()
              onContinueWithoutFolder()
            }}
            className="w-full py-2 px-3 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <span>Lanjut dengan Ruang Kerja Virtual (Mulai Coding Langsung)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
