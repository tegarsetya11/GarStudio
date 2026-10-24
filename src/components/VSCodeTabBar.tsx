import React from 'react'
import {
  FileCode,
  FileText,
  X,
  Split,
  Eye,
  Columns,
  Rows,
  Play,
  Sparkles,
} from 'lucide-react'
import type { SplitOrientation, ViewMode, WorkspaceFile } from '../types'

interface VSCodeTabBarProps {
  files: WorkspaceFile[]
  activeFile: WorkspaceFile | null
  onSelectFile: (file: WorkspaceFile) => void
  onCloseTab?: (fileId: string) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  splitOrientation: SplitOrientation
  setSplitOrientation: (orientation: SplitOrientation) => void
  onRunPreview: () => void
  onOpenAI: () => void
}

export const VSCodeTabBar: React.FC<VSCodeTabBarProps> = ({
  files,
  activeFile,
  onSelectFile,
  onCloseTab,
  viewMode,
  setViewMode,
  splitOrientation,
  setSplitOrientation,
  onRunPreview,
  onOpenAI,
}) => {
  const getTabIcon = (fileName: string) => {
    if (fileName.endsWith('.html')) return <span className="text-[#e34c26] font-bold text-[11px] font-mono">&lt;&gt;</span>
    if (fileName.endsWith('.css')) return <span className="text-[#264de4] font-bold text-[11px] font-mono">#</span>
    if (fileName.endsWith('.js') || fileName.endsWith('.ts'))
      return <span className="text-[#f7df1e] font-bold text-[11px] font-mono">JS</span>
    if (fileName.endsWith('.json')) return <span className="text-[#cbcb41] font-bold text-[10px] font-mono">{}</span>
    if (fileName.endsWith('.md')) return <FileText className="w-3.5 h-3.5 text-purple-400" />
    return <FileCode className="w-3.5 h-3.5 text-slate-400" />
  }

  return (
    <div className="h-9 bg-[#181818] border-b border-[#2b2b2b] flex items-center justify-between select-none shrink-0 z-10 overflow-hidden">
      {/* Open File Tabs */}
      <div className="flex items-center h-full overflow-x-auto no-scrollbar flex-1">
        {files.map((file) => {
          const isActive = activeFile?.id === file.id
          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file)}
              className={`group flex items-center gap-2 px-3 h-full cursor-pointer text-xs transition border-r border-[#2b2b2b] shrink-0 ${
                isActive
                  ? 'bg-[#1e1e1e] text-slate-100 border-t-2 border-t-[#007acc] font-medium'
                  : 'bg-[#181818] text-slate-400 hover:bg-[#1f1f1f] hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {getTabIcon(file.name)}
                <span className="truncate max-w-[120px]">{file.name}</span>
              </div>

              {onCloseTab && files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(file.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-slate-700/60 p-0.5 rounded text-slate-400 hover:text-white transition"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* VS Code Editor Action Icons */}
      <div className="flex items-center gap-1 px-2 h-full bg-[#181818] border-l border-[#2b2b2b] shrink-0 text-slate-300">
        {/* Toggle Split View (Open Preview to the Side) */}
        <button
          onClick={() => setViewMode(viewMode === 'split' ? 'editor' : 'split')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition active:scale-95 ${
            viewMode === 'split'
              ? 'bg-[#007acc] text-white font-semibold shadow-sm'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          title={viewMode === 'split' ? 'Close Side Preview' : 'Open Live Preview to the Side (Split View)'}
        >
          <Split className="w-3.5 h-3.5" />
          <span className="text-[11px] hidden sm:inline">
            {viewMode === 'split' ? 'Side Preview On' : 'Preview to Side'}
          </span>
        </button>

        {/* Orientation Toggle when in split mode */}
        {viewMode === 'split' && (
          <button
            onClick={() =>
              setSplitOrientation(splitOrientation === 'horizontal' ? 'vertical' : 'horizontal')
            }
            className="p-1 rounded hover:bg-slate-800 text-slate-300 transition"
            title={`Switch to ${splitOrientation === 'horizontal' ? 'Top/Bottom' : 'Side-by-Side'} Split`}
          >
            {splitOrientation === 'horizontal' ? (
              <Columns className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Rows className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </button>
        )}

        {/* Run / Full Preview */}
        <button
          onClick={onRunPreview}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 transition"
          title="Full Preview"
        >
          {viewMode === 'preview' ? (
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
          )}
        </button>

        {/* AI Assistant */}
        <button
          onClick={onOpenAI}
          className="p-1 rounded hover:bg-slate-800 text-cyan-400 transition"
          title="Open AI Agent"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
