import React from 'react'
import { FolderTree, Code2, Eye, Sparkles } from 'lucide-react'
import type { ActivePanel, AIStage } from '../types'

interface MobileBottomNavProps {
  activePanel: ActivePanel
  setActivePanel: (panel: ActivePanel) => void
  aiStage: AIStage
  hasError: boolean
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePanel,
  setActivePanel,
  aiStage,
  hasError,
}) => {
  const isAiActive = aiStage !== 'idle' && aiStage !== 'done'

  const tabs: { id: ActivePanel; label: string; icon: React.ReactNode }[] = [
    {
      id: 'explorer',
      label: 'Files',
      icon: <FolderTree className="w-5 h-5" />,
    },
    {
      id: 'editor',
      label: 'Editor',
      icon: <Code2 className="w-5 h-5" />,
    },
    {
      id: 'preview',
      label: 'Preview',
      icon: (
        <div className="relative">
          <Eye className="w-5 h-5" />
          {hasError && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900 animate-ping" />
          )}
        </div>
      ),
    },
    {
      id: 'agent',
      label: 'AI Agent',
      icon: (
        <div className="relative">
          <Sparkles className="w-5 h-5" />
          {isAiActive && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-slate-900 animate-pulse" />
          )}
        </div>
      ),
    },
  ]

  return (
    <nav className="h-14 bg-[#0d1322] border-t border-slate-800/80 px-2 flex items-center justify-around shrink-0 select-none z-30 pb-[env(safe-area-inset-bottom,0px)]">
      {tabs.map((tab) => {
        const isActive = activePanel === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition relative ${
              isActive
                ? 'text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 shadow-sm shadow-cyan-400" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
