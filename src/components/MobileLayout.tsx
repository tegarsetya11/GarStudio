import React, { useState, useRef, useEffect } from 'react'
import {
  ChevronUp,
  ChevronDown,
  Code2,
  Globe,
  Bot,
  Eye,
  EyeOff,
  GripHorizontal,
  Maximize2,
} from 'lucide-react'
import type { AIMessage, AIMode, AIProvider, AIStage, FileChange, PreviewError, WorkspaceFile } from '../types'
import { CodeEditor } from './CodeEditor'
import { LivePreview } from './LivePreview'
import { AIAgentPanel } from './AIAgentPanel'

interface MobileLayoutProps {
  files: WorkspaceFile[]
  activeFile: WorkspaceFile | null
  onEditorChange: (content: string) => void
  onSaveFile: () => void
  messages: AIMessage[]
  aiStage: AIStage
  aiProvider: AIProvider
  aiMode: AIMode
  onSwitchProvider: (provider: AIProvider) => void
  onSwitchMode: (mode: AIMode) => void
  onSendPrompt: (prompt: string, mode: AIMode) => void
  onApplyChanges: (changes: FileChange[]) => void
  onAutoFixError: (error: PreviewError) => void
  isFixingBug: boolean
  githubToken?: string
  previewVisible?: boolean
  onTogglePreview?: () => void
  folderLinked?: boolean
  folderName?: string
  onOpenFolder?: () => void
}

type PanelFocus = 'editor' | 'preview' | 'agent' | 'split'

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  files,
  activeFile,
  onEditorChange,
  onSaveFile,
  messages,
  aiStage,
  aiProvider,
  aiMode,
  onSwitchProvider,
  onSwitchMode,
  onSendPrompt,
  onApplyChanges,
  onAutoFixError,
  isFixingBug,
  githubToken = '',
  previewVisible,
  onTogglePreview,
  folderLinked = false,
  folderName,
  onOpenFolder,
}) => {
  const [codeVisible, setCodeVisible] = useState(true)
  const [internalPreviewVisible, setInternalPreviewVisible] = useState(true)
  const [panelFocus, setPanelFocus] = useState<PanelFocus>('split')
  const [editorHeight, setEditorHeight] = useState(30)
  const [previewHeight, setPreviewHeight] = useState(40)

  const isPreviewVisible = previewVisible !== undefined ? previewVisible : internalPreviewVisible
  const togglePreview = onTogglePreview || (() => setInternalPreviewVisible((v) => !v))

  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef<'top' | 'bottom' | null>(null)
  const startY = useRef(0)
  const startHeights = useRef({ editor: 30, preview: 40 })

  const effectiveEditorHeight = codeVisible ? editorHeight : 0
  const effectivePreviewHeight = isPreviewVisible ? previewHeight : 0
  const agentHeight = Math.max(10, 100 - effectiveEditorHeight - effectivePreviewHeight)

  const startDrag = (divider: 'top' | 'bottom', y: number) => {
    isDragging.current = divider
    startY.current = y
    startHeights.current = { editor: editorHeight, preview: previewHeight }
  }

  useEffect(() => {
    const handleMove = (y: number) => {
      if (!isDragging.current || !containerRef.current) return
      const containerH = containerRef.current.clientHeight
      const deltaPercent = ((y - startY.current) / containerH) * 100

      if (isDragging.current === 'top') {
        const newEditor = Math.max(8, Math.min(60, startHeights.current.editor + deltaPercent))
        const newPreview = Math.max(8, Math.min(70, startHeights.current.preview - deltaPercent))
        if (newEditor + newPreview <= 88) {
          setEditorHeight(newEditor)
          setPreviewHeight(newPreview)
        }
      } else {
        const newPreview = Math.max(8, Math.min(70, startHeights.current.preview + deltaPercent))
        if (startHeights.current.editor + newPreview <= 90) {
          setPreviewHeight(newPreview)
        }
      }
    }

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      handleMove(e.touches[0].clientY)
    }
    const stopDrag = () => { isDragging.current = null }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', stopDrag)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopDrag)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', stopDrag)
    }
  }, [editorHeight, previewHeight])

  const applyPreset = (mode: PanelFocus) => {
    setPanelFocus(mode)
    if (mode === 'editor') {
      setCodeVisible(true)
      if (!isPreviewVisible) togglePreview()
      setEditorHeight(65)
      setPreviewHeight(15)
    } else if (mode === 'preview') {
      setCodeVisible(false)
      if (!isPreviewVisible) togglePreview()
      setPreviewHeight(75)
    } else if (mode === 'agent') {
      setCodeVisible(false)
      if (isPreviewVisible) togglePreview()
    } else {
      setCodeVisible(true)
      if (!isPreviewVisible) togglePreview()
      setEditorHeight(30)
      setPreviewHeight(40)
    }
  }

  const handlePromptSubmit = (prompt: string, mode: AIMode) => {
    // Automatically show all 3 panels (HTML Code, Web Preview, AI Agent) when user sends prompt
    setCodeVisible(true)
    if (!isPreviewVisible) {
      togglePreview()
    }
    setPanelFocus('split')
    setEditorHeight(30)
    setPreviewHeight(38)
    onSendPrompt(prompt, mode)
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#1e1e1e]">
      {/* Quick Layout Switcher Bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#141414] border-b border-[#2b2b2b] shrink-0">
        <div className="flex items-center gap-1">
          {(
            [
              { key: 'split', icon: <GripHorizontal className="w-3.5 h-3.5" />, label: 'Balanced' },
              { key: 'editor', icon: <Code2 className="w-3.5 h-3.5" />, label: 'Editor' },
              { key: 'preview', icon: <Globe className="w-3.5 h-3.5" />, label: 'Preview' },
              { key: 'agent', icon: <Bot className="w-3.5 h-3.5" />, label: 'AI' },
            ] as const
          ).map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${
                panelFocus === key
                  ? key === 'agent'
                    ? 'bg-amber-600/80 text-white'
                    : 'bg-[#007acc] text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#252526]'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
        {/* Panel Visibility Toggles */}
        <div className="flex items-center gap-1.5">
          {/* Toggle Code Button */}
          <button
            onClick={() => setCodeVisible((v) => !v)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${
              codeVisible
                ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={codeVisible ? 'Sembunyikan Code Panel' : 'Tampilkan Code Panel'}
          >
            {codeVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>Code</span>
          </button>

          {/* Toggle Preview Button */}
          <button
            onClick={togglePreview}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${
              isPreviewVisible
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={isPreviewVisible ? 'Sembunyikan Web Preview' : 'Tampilkan Web Preview'}
          >
            {isPreviewVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* 3-Panel Stacked Layout */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden relative">

        {/* TOP PANEL: HTML Code Editor */}
        {codeVisible && effectiveEditorHeight > 0 && (
          <>
            <div
              className="flex flex-col overflow-hidden shrink-0 border-b border-[#2b2b2b]"
              style={{ height: `${effectiveEditorHeight}%` }}
            >
              <div className="flex items-center justify-between px-2.5 py-1 bg-[#252526] border-b border-[#2b2b2b] shrink-0 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Code2 className="w-3 h-3 text-cyan-400" />
                  <span className="text-cyan-300 font-medium font-mono">
                    {activeFile?.name || 'index.html'}
                  </span>
                  <span className="text-slate-600">— Code Editor</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => applyPreset('editor')}
                    className="p-0.5 rounded hover:bg-[#333333] transition"
                    title="Maximize Code"
                  >
                    <Maximize2 className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                  </button>
                  <button
                    onClick={() => setCodeVisible(false)}
                    className="p-0.5 rounded hover:bg-[#333333] transition text-slate-500 hover:text-slate-300"
                    title="Hide Code Panel"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  file={activeFile}
                  onChange={onEditorChange}
                  onSave={onSaveFile}
                  isSaved={true}
                  folderLinked={folderLinked}
                  folderName={folderName}
                  onOpenFolder={onOpenFolder}
                />
              </div>
            </div>

            {/* ── TOP DIVIDER: Code ↕ Preview ── */}
            <div
              className="relative flex items-center justify-center shrink-0 cursor-row-resize group select-none touch-none"
              style={{ height: '28px' }}
              onMouseDown={(e) => startDrag('top', e.clientY)}
              onTouchStart={(e) => startDrag('top', e.touches[0].clientY)}
            >
              <div className="absolute inset-0 bg-[#181818] border-y border-[#2b2b2b] group-hover:bg-[#007acc]/10 transition-colors" />
              <div className="relative flex items-center gap-2 px-4 py-1 rounded-full bg-[#252526] border border-[#3c3c3c] group-hover:border-[#007acc]/70 group-hover:bg-[#007acc]/20 shadow transition-all">
                <div className="flex gap-0.5">
                  {[0,1,2,3,4,5].map((i) => (
                    <div key={i} className="w-0.5 h-3 rounded-full bg-slate-600 group-hover:bg-[#007acc] transition-colors" />
                  ))}
                </div>
                <span className="text-[9px] font-semibold text-slate-500 group-hover:text-[#007acc] transition-colors whitespace-nowrap tracking-wide">
                  ↕ Seret untuk resize
                </span>
                <div className="flex gap-0.5">
                  {[0,1,2,3,4,5].map((i) => (
                    <div key={i} className="w-0.5 h-3 rounded-full bg-slate-600 group-hover:bg-[#007acc] transition-colors" />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Show code button when hidden */}
        {!codeVisible && (
          <button
            onClick={() => setCodeVisible(true)}
            className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-slate-500 hover:text-cyan-400 hover:bg-[#252526] transition border-b border-[#2b2b2b] shrink-0"
          >
            <ChevronDown className="w-3 h-3" />
            <Code2 className="w-3 h-3" />
            <span>Tampilkan Code Panel ({activeFile?.name})</span>
          </button>
        )}

        {/* MIDDLE PANEL: Live Web Preview */}
        {isPreviewVisible && effectivePreviewHeight > 0 && (
          <>
            <div
              className="flex flex-col overflow-hidden shrink-0 border-b border-[#2b2b2b]"
              style={{ height: `${effectivePreviewHeight}%` }}
            >
              <div className="flex items-center justify-between px-2.5 py-1 bg-[#1a1a1a] border-b border-[#2b2b2b] shrink-0 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">Web Preview</span>
                  <span className="text-slate-600">— Live Sandbox</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => applyPreset('preview')}
                    className="p-0.5 rounded hover:bg-[#333333] transition"
                    title="Perbesar Preview"
                  >
                    <Maximize2 className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                  </button>
                  <button
                    onClick={togglePreview}
                    className="p-0.5 rounded hover:bg-[#333333] transition text-slate-500 hover:text-slate-300"
                    title="Sembunyikan Web Preview"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <LivePreview
                  files={files}
                  onAutoFixError={onAutoFixError}
                  isFixing={isFixingBug}
                />
              </div>
            </div>

            {/* ── BOTTOM DIVIDER: Preview ↕ AI Agent ── */}
            <div
              className="relative flex items-center justify-center shrink-0 cursor-row-resize group select-none touch-none"
              style={{ height: '28px' }}
              onMouseDown={(e) => startDrag('bottom', e.clientY)}
              onTouchStart={(e) => startDrag('bottom', e.touches[0].clientY)}
            >
              <div className="absolute inset-0 bg-[#181818] border-y border-[#2b2b2b] group-hover:bg-amber-500/10 transition-colors" />
              <div className="relative flex items-center gap-2 px-4 py-1 rounded-full bg-[#252526] border border-[#3c3c3c] group-hover:border-amber-500/70 group-hover:bg-amber-500/20 shadow transition-all">
                <div className="flex gap-0.5">
                  {[0,1,2,3,4,5].map((i) => (
                    <div key={i} className="w-0.5 h-3 rounded-full bg-slate-600 group-hover:bg-amber-400 transition-colors" />
                  ))}
                </div>
                <span className="text-[9px] font-semibold text-slate-500 group-hover:text-amber-400 transition-colors whitespace-nowrap tracking-wide">
                  ↕ Seret untuk resize
                </span>
                <div className="flex gap-0.5">
                  {[0,1,2,3,4,5].map((i) => (
                    <div key={i} className="w-0.5 h-3 rounded-full bg-slate-600 group-hover:bg-amber-400 transition-colors" />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tombol Tampilkan Web Preview saat disembunyikan */}
        {!isPreviewVisible && (
          <button
            onClick={togglePreview}
            className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-slate-500 hover:text-emerald-400 hover:bg-[#252526] transition border-b border-[#2b2b2b] shrink-0"
          >
            <ChevronDown className="w-3 h-3 text-emerald-400" />
            <Globe className="w-3 h-3 text-emerald-400" />
            <span>Tampilkan Web Preview</span>
          </button>
        )}

        {/* BOTTOM PANEL: AI Agent */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ height: `${agentHeight}%` }}
        >
          <div className="flex items-center justify-between px-2.5 py-1 bg-[#181818] border-b border-[#2b2b2b] shrink-0 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Bot className={`w-3 h-3 ${aiProvider === 'claude' ? 'text-amber-400' : 'text-blue-400'}`} />
              <span className={`font-medium ${aiProvider === 'claude' ? 'text-amber-300' : 'text-blue-300'}`}>
                AI Agent
              </span>
              <span className="text-slate-600">
                — {aiProvider === 'claude' ? 'Claude AI' : 'Gemini AI'}
              </span>
              {(aiStage === 'planning' || aiStage === 'generating') && (
                <span className="flex items-center gap-1 text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-500/30 animate-pulse ml-1">
                  <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce inline-block" />
                  Thinking...
                </span>
              )}
            </div>
            <button
              onClick={() => applyPreset('agent')}
              className="p-0.5 rounded hover:bg-[#333333] transition"
              title="Maximize AI Panel"
            >
              <Maximize2 className="w-3 h-3 text-slate-500 hover:text-slate-300" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AIAgentPanel
              messages={messages}
              aiStage={aiStage}
              aiProvider={aiProvider}
              aiMode={aiMode}
              onSwitchProvider={onSwitchProvider}
              onSwitchMode={onSwitchMode}
              onSendPrompt={handlePromptSubmit}
              onApplyChanges={onApplyChanges}
              activeFile={activeFile}
              files={files}
              githubToken={githubToken}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
