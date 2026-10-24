import React from 'react'
import { X, Sparkles, Smartphone, Check, ExternalLink, Cpu, Bot } from 'lucide-react'
import { GithubIcon } from './GithubIcon'
import type { SettingsState } from '../types'
import { FileSystemService } from '../services/fileSystemService'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: SettingsState
  onUpdateSettings: (newSettings: Partial<SettingsState>) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null

  const isFSSupported = FileSystemService.isFileSystemAccessSupported()
  const isOPFSSupported = FileSystemService.isOPFSSupported()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#0d1322] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0f172a]">
          <h2 className="text-sm font-bold text-slate-100">GarStudio Preferences</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto max-h-[80vh]">

          {/* AI Engine Selector — 3 providers */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pilih AI Engine Aktif</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              {/* Gemini */}
              <button
                type="button"
                onClick={() => onUpdateSettings({ aiProvider: 'gemini' })}
                className={`py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
                  settings.aiProvider === 'gemini'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Gemini</span>
              </button>
              {/* Claude */}
              <button
                type="button"
                onClick={() => onUpdateSettings({ aiProvider: 'claude' })}
                className={`py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
                  settings.aiProvider === 'claude'
                    ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Cpu className="w-4 h-4 text-amber-300" />
                <span>Claude</span>
              </button>
              {/* GitHub Copilot */}
              <button
                type="button"
                onClick={() => onUpdateSettings({ aiProvider: 'copilot' })}
                className={`py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition ${
                  settings.aiProvider === 'copilot'
                    ? 'bg-gradient-to-br from-purple-600 to-violet-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Bot className="w-4 h-4 text-purple-300" />
                <span>Copilot</span>
              </button>
            </div>
          </div>

          {/* Gemini Config */}
          {settings.aiProvider === 'gemini' && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-semibold text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Gemini API Key</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>Dapatkan Key Gratis</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={settings.geminiApiKey}
                onChange={(e) => onUpdateSettings({ geminiApiKey: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Gemini Model</label>
                <select
                  value={settings.geminiModel}
                  onChange={(e) => onUpdateSettings({ geminiModel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="gemini-2.0-flash">⚡ Gemini 2.0 Flash (Default — Cepat &amp; Pintar)</option>
                  <option value="gemini-2.0-flash-exp">🧪 Gemini 2.0 Flash Exp (Experimental)</option>
                  <option value="gemini-1.5-pro">🧠 Gemini 1.5 Pro (Deep Reasoning)</option>
                  <option value="gemini-1.5-flash">🚀 Gemini 1.5 Flash (Ultra Fast, Limit Tinggi)</option>
                </select>
              </div>
              <div className="text-[10px] text-slate-500 bg-slate-950 rounded-lg px-2.5 py-1.5 border border-slate-800">
                💡 <span className="text-slate-400">Free tier:</span> 15 req/mnt · 1,500 req/hari · Gratis di Google AI Studio
              </div>
            </div>
          )}

          {/* Claude Config */}
          {settings.aiProvider === 'claude' && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>Claude (Anthropic) API Key</span>
                </label>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>Anthropic Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                value={settings.claudeApiKey}
                onChange={(e) => onUpdateSettings({ claudeApiKey: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Claude Model</label>
                <select
                  value={settings.claudeModel}
                  onChange={(e) => onUpdateSettings({ claudeModel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (State-of-the-Art)</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Lightning Fast)</option>
                  <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (Hybrid Reasoning)</option>
                </select>
              </div>
              <div className="text-[10px] text-slate-500 bg-slate-950 rounded-lg px-2.5 py-1.5 border border-slate-800">
                💡 <span className="text-slate-400">Free tier terbatas.</span> Direkomendasikan pakai Gemini untuk penggunaan gratis.
              </div>
            </div>
          )}

          {/* Copilot Config */}
          {settings.aiProvider === 'copilot' && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 font-semibold text-purple-300">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>GitHub Token (Copilot)</span>
                </label>
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                >
                  <span>GitHub Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                placeholder="ghp_... atau github_pat_..."
                value={settings.copilotToken}
                onChange={(e) => onUpdateSettings({ copilotToken: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Copilot Model</label>
                <select
                  value={settings.copilotModel}
                  onChange={(e) => onUpdateSettings({ copilotModel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="gpt-4o">GPT-4o (Recommended — Multimodal)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast &amp; Efficient)</option>
                  <option value="Meta-Llama-3.1-405B-Instruct">Meta Llama 3.1 405B</option>
                  <option value="Phi-4">Phi-4 (Microsoft Small Model)</option>
                </select>
              </div>
              <div className="text-[10px] text-slate-500 bg-slate-950 rounded-lg px-2.5 py-1.5 border border-slate-800">
                💡 Butuh GitHub account + akses <span className="text-purple-400">GitHub Models</span> (beta). Token: ghp_ atau github_pat_
              </div>
            </div>
          )}

          {/* GitHub PAT for sync */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 font-semibold text-slate-300">
              <GithubIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>GitHub PAT (untuk Sync Repository)</span>
            </label>
            <input
              type="password"
              placeholder="ghp_..."
              value={settings.githubToken}
              onChange={(e) => onUpdateSettings({ githubToken: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Android File System Capabilities */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android Storage Engine</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">File System Access API:</span>
                <span className={isFSSupported ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                  {isFSSupported ? '✓ Supported (Physical Folders)' : '○ Fallback Enabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Origin Private File System (OPFS):</span>
                <span className={isOPFSSupported ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  {isOPFSSupported ? '✓ Active' : 'Not Supported'}
                </span>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl flex items-center justify-center gap-1.5 transition active:scale-98 text-xs shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Simpan &amp; Tutup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
