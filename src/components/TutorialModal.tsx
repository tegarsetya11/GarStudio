import React from 'react'
import { X, Smartphone, FolderOpen, Sparkles, Play, ArrowRight, CheckCircle2 } from 'lucide-react'
import { GithubIcon } from './GithubIcon'

interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
  onStartCoding?: () => void
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onStartCoding,
}) => {
  if (!isOpen) return null

  const steps = [
    {
      step: '01',
      title: 'Hubungkan Folder di HP Anda',
      icon: <FolderOpen className="w-5 h-5 text-cyan-400" />,
      desc: 'Klik ikon folder cyan di header untuk menghubungkan folder lokal HP Android Anda (misal di folder Documents/WebProjek). Kode yang diedit otomatis tersimpan langsung ke memori HP.',
      tag: 'Penyimpanan Nyata',
    },
    {
      step: '02',
      title: 'Editor HTML & Tombol Cepat Khusus HP',
      icon: <Smartphone className="w-5 h-5 text-indigo-400" />,
      desc: 'Editor dilengkapi keyboard accessory bar dengan simbol kurung kurawal {}, tag <>, petik "", tab, dan tombol Save Files berbingkai yang mudah ditekan dengan jempol.',
      tag: 'Mobile Friendly',
    },
    {
      step: '03',
      title: 'AI Agent Bahasa Indonesia (Gemini 3.8 Flash & Copilot)',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      desc: 'Ketik perintah dalam Bahasa Indonesia apapun: "buat landing page bertema kopi", "tambahkan navbar responsive", atau "perbaiki error". AI merumuskan arsitektur plan dan menulis kode secara otomatis.',
      tag: 'Triple AI Engine',
    },
    {
      step: '04',
      title: 'Live Web Sandbox & Responsive Preview',
      icon: <Play className="w-5 h-5 text-emerald-400" />,
      desc: 'Panel tengah menampilkan website Anda secara langsung (real-time). Setiap perubahan kode atau hasil buatan AI langsung terlihat tanpa perlu refresh manual.',
      tag: 'Real-time Preview',
    },
    {
      step: '05',
      title: 'Upload ke GitHub Sekali Klik',
      icon: <GithubIcon className="w-5 h-5 text-purple-400" />,
      desc: 'Ingin membagikan karya Anda? Gunakan fitur GitHub sync untuk langsung membuat repositori dan mengunggah kode ke akun GitHub Anda lengkap dengan panduan bantuan (i).',
      tag: 'GitHub Sync',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-[#0d1322] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Tutorial & Panduan GarStudio</h2>
              <p className="text-[11px] text-slate-400">Langkah mudah membangun web langsung dari HP Android</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-950/40 border border-red-500/50 transition active:scale-95 cursor-pointer shrink-0"
            title="Tutup Panduan"
          >
            <span>Tutup</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps List */}
        <div className="p-5 space-y-3.5 overflow-y-auto text-xs">
          {steps.map((item) => (
            <div
              key={item.step}
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/30 transition flex gap-3.5 items-start"
            >
              <div className="p-2.5 rounded-xl bg-slate-800/90 shrink-0 mt-0.5 shadow-sm">
                {item.icon}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-100 text-xs flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">{item.step}.</span>
                    {item.title}
                  </h3>
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {item.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}

          {/* Quick Tips */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-500/30 text-[11px] text-cyan-200 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>
              <strong>Tips AI:</strong> Anda bisa berganti engine antara <strong>Gemini 3.8 Flash</strong>, <strong>Claude</strong>, dan <strong>Copilot</strong> kapan saja di panel bawah!
            </span>
          </div>
        </div>

        {/* Footer (Hanya tampil jika ada aksi Mulai Coding) */}
        {onStartCoding && (
          <div className="p-4 border-t border-slate-800 bg-[#0a0f1d] flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                onClose()
                onStartCoding()
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition cursor-pointer"
            >
              <span>Mulai Coding Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
