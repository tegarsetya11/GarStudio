import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  X,
  RefreshCw,
  Sparkles,
  Cpu,
  Bot,
  ArrowRight,
  Clock,
  Zap,
  ExternalLink,
} from 'lucide-react'
import type { AIProvider, RateLimitInfo } from '../types'

interface RateLimitBannerProps {
  rateLimit: RateLimitInfo | null
  onDismiss: () => void
  onSwitchProvider: (provider: AIProvider) => void
  currentProvider: AIProvider
  onOpenSettings: () => void
}

const PROVIDER_CONFIG = {
  gemini: {
    name: 'Gemini 3.8 Flash',
    color: 'blue',
    icon: <img src="/icons/gemini.png" alt="Gemini" className="w-4 h-4 object-contain inline-block" />,
    upgradeUrl: 'https://aistudio.google.com/app/apikey',
    switchTo: ['claude', 'copilot'] as AIProvider[],
    freeLimit: '15 req/mnt, 1,500 req/hari',
  },
  claude: {
    name: 'Claude Sonnet 4.5',
    color: 'amber',
    icon: <img src="/icons/claude.png" alt="Claude" className="w-4 h-4 object-contain inline-block" />,
    upgradeUrl: 'https://console.anthropic.com/settings/billing',
    switchTo: ['gemini', 'copilot'] as AIProvider[],
    freeLimit: '~5 req/mnt (free tier)',
  },
  copilot: {
    name: 'GitHub Copilot',
    color: 'purple',
    icon: <img src="/icons/copilot.png" alt="Copilot" className="w-4 h-4 object-contain inline-block rounded-full" />,
    upgradeUrl: 'https://github.com/features/copilot',
    switchTo: ['gemini', 'claude'] as AIProvider[],
    freeLimit: '2,000 req/bln (free tier)',
  },
}

const PROVIDER_ALT_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini',
  claude: 'Claude',
  copilot: 'Copilot',
}

function Countdown({ retryAfter }: { retryAfter: number }) {
  const [remaining, setRemaining] = useState(retryAfter)

  useEffect(() => {
    if (remaining <= 0) return
    const interval = setInterval(() => setRemaining((v) => Math.max(0, v - 1)), 1000)
    return () => clearInterval(interval)
  }, [remaining])

  if (remaining <= 0) return <span className="text-emerald-400 font-medium">Siap dicoba kembali!</span>
  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  return (
    <span className="font-mono text-amber-300">
      {m > 0 ? `${m}m ` : ''}{s}s
    </span>
  )
}

export const RateLimitBanner: React.FC<RateLimitBannerProps> = ({
  rateLimit,
  onDismiss,
  onSwitchProvider,
  currentProvider,
  onOpenSettings,
}) => {
  if (!rateLimit) return null

  const cfg = PROVIDER_CONFIG[currentProvider]
  const colorMap: Record<string, string> = {
    blue: 'from-blue-950/95 to-indigo-950/95 border-blue-700/50',
    amber: 'from-amber-950/95 to-orange-950/95 border-amber-700/50',
    purple: 'from-purple-950/95 to-violet-950/95 border-purple-700/50',
  }
  const gradientBg = colorMap[cfg.color] || colorMap.blue

  const limitTypeLabel: Record<string, string> = {
    quota: 'Kuota Habis',
    rateLimit: 'Rate Limit',
    daily: 'Batas Harian',
    token: 'Token Habis',
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[100] m-3 rounded-2xl border bg-gradient-to-br ${gradientBg} shadow-2xl shadow-black/50 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300`}
    >
      {/* Top accent bar */}
      <div
        className={`h-0.5 w-full rounded-t-2xl bg-gradient-to-r ${
          cfg.color === 'blue'
            ? 'from-blue-500 via-cyan-400 to-indigo-500'
            : cfg.color === 'amber'
            ? 'from-amber-500 via-yellow-400 to-orange-500'
            : 'from-purple-500 via-violet-400 to-fuchsia-500'
        }`}
      />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Animated warning icon */}
            <div
              className={`p-2 rounded-xl ${
                cfg.color === 'blue'
                  ? 'bg-blue-500/20 text-blue-300'
                  : cfg.color === 'amber'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-purple-500/20 text-purple-300'
              } animate-pulse`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  ⚡ {limitTypeLabel[rateLimit.limitType] || 'Batas Penggunaan'} — {cfg.name}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Batas free tier: <span className="text-slate-300">{cfg.freeLimit}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        <div className="text-[11px] text-slate-300 font-mono bg-black/30 rounded-lg px-3 py-2 mb-3 border border-white/5 line-clamp-2">
          {rateLimit.message}
        </div>

        {/* Retry countdown */}
        {rateLimit.retryAfter && rateLimit.retryAfter > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Coba lagi dalam:</span>
            <Countdown retryAfter={rateLimit.retryAfter} />
          </div>
        )}

        {/* Switch provider buttons */}
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            🔀 Ganti ke Provider Lain
          </div>
          <div className="flex gap-2 flex-wrap">
            {cfg.switchTo.map((alt) => {
              const altCfg = PROVIDER_CONFIG[alt]
              const altColorMap: Record<string, string> = {
                blue: 'bg-blue-600/80 hover:bg-blue-500 text-white border-blue-500/40',
                amber: 'bg-amber-600/80 hover:bg-amber-500 text-white border-amber-500/40',
                purple: 'bg-purple-600/80 hover:bg-purple-500 text-white border-purple-500/40',
              }
              return (
                <button
                  key={alt}
                  onClick={() => {
                    onSwitchProvider(alt)
                    onDismiss()
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 shadow-sm ${
                    altColorMap[altCfg.color]
                  }`}
                >
                  {altCfg.icon}
                  <span>{PROVIDER_ALT_LABELS[alt]}</span>
                  <ArrowRight className="w-3 h-3 opacity-70" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <a
            href={cfg.upgradeUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline transition"
          >
            <Zap className="w-3 h-3" />
            <span>Upgrade {cfg.name}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-white/5 transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Ganti API Key</span>
          </button>
        </div>
      </div>
    </div>
  )
}
