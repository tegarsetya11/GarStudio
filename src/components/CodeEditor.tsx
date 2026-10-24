import React, { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { basicSetup, EditorView } from 'codemirror'
import { undo, redo } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { Undo, Redo, FileCode, Check, Save, ChevronRight, Folder } from 'lucide-react'
import type { WorkspaceFile } from '../types'

interface CodeEditorProps {
  file: WorkspaceFile | null
  onChange: (content: string) => void
  onSave?: () => void
  isSaved?: boolean
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  onChange,
  onSave,
  isSaved = true,
}) => {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // Track whether the current file has unsaved changes
  const [isDirty, setIsDirty] = useState(false)

  // When switching to another file, reset dirty state to saved
  useEffect(() => {
    setIsDirty(false)
  }, [file?.id])

  const handleSaveClick = () => {
    if (onSave) {
      onSave()
    }
    // Set to saved and keep it until new user edits occur
    setIsDirty(false)
  }

  // Determine language extension based on file extension
  const getLanguageExtension = (fileName: string): Extension => {
    if (fileName.endsWith('.html')) return html()
    if (fileName.endsWith('.css')) return css()
    if (fileName.endsWith('.json')) return json()
    if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
      return javascript({ jsx: true, typescript: fileName.endsWith('.ts') })
    }
    return []
  }

  // Initialize or update editor when active file changes
  useEffect(() => {
    if (!editorContainerRef.current || !file) return

    // Clean up previous view
    if (viewRef.current) {
      viewRef.current.destroy()
    }

    const state = EditorState.create({
      doc: file.content,
      extensions: [
        basicSetup,
        getLanguageExtension(file.name),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString()
            setIsDirty(true)
            onChange(newContent)
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            backgroundColor: '#1e1e1e',
          },
          '.cm-scroller': {
            overflow: 'auto',
            paddingTop: '6px',
            paddingBottom: '24px',
          },
          '.cm-content': {
            caretColor: '#007acc',
          },
          '&.cm-focused .cm-cursor': {
            borderLeftColor: '#007acc',
          },
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [file?.id])

  // Sync external changes (e.g. from AI code generation or debug fix)
  useEffect(() => {
    if (viewRef.current && file) {
      const currentDoc = viewRef.current.state.doc.toString()
      if (currentDoc !== file.content) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: file.content },
        })
      }
    }
  }, [file?.content])

  // Helper to insert characters at cursor for mobile keyboard bar
  const insertText = (before: string, after: string = '') => {
    if (!viewRef.current) return
    const view = viewRef.current
    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert: before + after },
      selection: { anchor: from + before.length },
    })
    view.focus()
  }

  // Mobile quick keys
  const mobileShortcuts = [
    { label: 'Tab', action: () => insertText('  ') },
    { label: '<>', action: () => insertText('<', '>') },
    { label: '{}', action: () => insertText('{', '}') },
    { label: '()', action: () => insertText('(', ')') },
    { label: '[]', action: () => insertText('[', ']') },
    { label: '""', action: () => insertText('"', '"') },
    { label: "''", action: () => insertText("'", "'") },
    { label: '`', action: () => insertText('`', '`') },
    { label: ';', action: () => insertText(';') },
    { label: '=', action: () => insertText(' = ') },
    { label: '=>', action: () => insertText(' => ') },
    { label: 'const', action: () => insertText('const ') },
    { label: 'function', action: () => insertText('function ') },
  ]

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center bg-[#1e1e1e]">
        <FileCode className="w-12 h-12 mb-3 text-slate-600 stroke-[1.5]" />
        <h3 className="text-sm font-medium text-slate-400">No File Open</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Select a file from the Explorer or let the AI Agent generate a new feature.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
      {/* VS Code Breadcrumb Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#1e1e1e] border-b border-[#2b2b2b] text-[11px] select-none text-slate-400 font-sans">
        <div className="flex items-center gap-1 truncate">
          <Folder className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span>garstudio</span>
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-slate-200 font-medium truncate">{file.path}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDirty && (
            <span className="text-[10px] text-amber-400 font-medium animate-pulse">● Unsaved</span>
          )}
          {onSave && (
            <button
              onClick={handleSaveClick}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border transition shadow-sm active:scale-95 ${
                !isDirty
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/60 text-cyan-200 shadow-md ring-1 ring-cyan-500/30 animate-pulse'
              }`}
              title={
                !isDirty
                  ? 'Semua perubahan tersimpan (Saved)'
                  : 'Ada perubahan belum disimpan, klik untuk simpan (Save Files)'
              }
            >
              {!isDirty ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Save className="w-3.5 h-3.5 text-cyan-300" />
              )}
              <span>{!isDirty ? 'Saved!' : 'Save Files'}</span>
            </button>
          )}
        </div>
      </div>

      {/* CodeMirror Surface */}
      <div ref={editorContainerRef} className="flex-1 w-full overflow-hidden text-sm" />

      {/* Mobile Keyboard Accessory Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#181818] border-t border-[#2b2b2b] overflow-x-auto no-scrollbar shrink-0 shadow-lg">
        {/* Undo / Redo */}
        <button
          onClick={() => {
            if (viewRef.current) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              undo(viewRef.current as any)
            }
          }}
          className="p-1.5 rounded bg-[#252526] hover:bg-[#2a2d2e] text-slate-300 hover:text-white active:scale-95 transition"
          title="Undo"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            if (viewRef.current) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              redo(viewRef.current as any)
            }
          }}
          className="p-1.5 rounded bg-[#252526] hover:bg-[#2a2d2e] text-slate-300 hover:text-white active:scale-95 transition"
          title="Redo"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-[#2b2b2b] shrink-0 mx-0.5" />

        {/* Quick touch characters */}
        {mobileShortcuts.map((sc, i) => (
          <button
            key={i}
            onClick={sc.action}
            className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-[#252526] hover:bg-[#2a2d2e] text-cyan-300 border border-[#333] active:bg-[#007acc] active:text-white active:scale-95 transition shrink-0"
          >
            {sc.label}
          </button>
        ))}
      </div>
    </div>
  )
}
