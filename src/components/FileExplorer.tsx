import React, { useState } from 'react'
import {
  FileCode,
  FileText,
  FilePlus,
  Trash2,
  FolderOpen,
  Smartphone,
  ChevronDown,
} from 'lucide-react'
import type { WorkspaceFile } from '../types'

interface FileExplorerProps {
  files: WorkspaceFile[]
  activeFile: WorkspaceFile | null
  onSelectFile: (file: WorkspaceFile) => void
  onCreateFile: (fileName: string) => void
  onDeleteFile: (fileId: string) => void
  onLinkFolder: () => void
  folderName: string | null
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onLinkFolder,
  folderName,
}) => {
  const [isCreating, setIsCreating] = useState(false)
  const [newFileName, setNewFileName] = useState('')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFileName.trim()) return
    onCreateFile(newFileName.trim())
    setNewFileName('')
    setIsCreating(false)
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.html')) return <span className="text-[#e34c26] font-bold text-[11px] font-mono">&lt;&gt;</span>
    if (fileName.endsWith('.css')) return <span className="text-[#264de4] font-bold text-[11px] font-mono">#</span>
    if (fileName.endsWith('.js') || fileName.endsWith('.ts'))
      return <span className="text-[#f7df1e] font-bold text-[11px] font-mono">JS</span>
    if (fileName.endsWith('.json')) return <span className="text-[#cbcb41] font-bold text-[10px] font-mono">{}</span>
    if (fileName.endsWith('.md')) return <FileText className="w-3.5 h-3.5 text-purple-400" />
    return <FileCode className="w-3.5 h-3.5 text-slate-400" />
  }

  return (
    <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none font-sans">
      {/* VS Code Explorer Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2b2b2b]">
        <div className="flex items-center gap-1 font-bold text-[11px] text-[#bbbbbb] tracking-wider uppercase">
          <span>Explorer</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 rounded hover:bg-[#333333] text-slate-300 active:scale-95 transition"
            title="New File"
          >
            <FilePlus className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* VS Code Workspace Section Header */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-[#202020] text-[11px] font-bold text-[#aaaaaa] uppercase tracking-wide border-b border-[#2b2b2b]">
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        <span className="truncate">{folderName ? folderName.toUpperCase() : 'GARSTUDIO [WORKSPACE]'}</span>
      </div>

      {/* Android Device Folder Card */}
      <div className="p-2.5 mx-2 my-2 rounded bg-[#1e1e1e] border border-[#333333] text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
            <Smartphone className="w-3 h-3 text-emerald-400" />
            <span>Android Storage</span>
          </div>
          <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono">
            {folderName ? 'Linked' : 'OPFS'}
          </span>
        </div>
        <button
          onClick={onLinkFolder}
          className="w-full py-1.5 px-2 bg-[#0e639c] hover:bg-[#1177bb] rounded text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition active:scale-98"
        >
          <FolderOpen className="w-3 h-3" />
          <span>{folderName ? 'Switch Folder' : 'Link Android Folder'}</span>
        </button>
      </div>

      {/* New File Input Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="px-3 py-2 border-b border-[#333] bg-[#1e1e1e]">
          <input
            type="text"
            placeholder="filename.html"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
            className="w-full px-2 py-1 text-xs bg-[#3c3c3c] border border-[#007acc] rounded text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-0.5 bg-[#007acc] hover:bg-[#1177bb] text-white text-[11px] font-medium rounded"
            >
              OK
            </button>
          </div>
        </form>
      )}

      {/* File List Tree */}
      <div className="flex-1 overflow-y-auto py-1 space-y-0.5">
        {files.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            Empty workspace. Click + to create file.
          </div>
        ) : (
          files.map((file) => {
            const isSelected = activeFile?.id === file.id
            return (
              <div
                key={file.id}
                onClick={() => onSelectFile(file)}
                className={`group flex items-center justify-between px-3 py-1 cursor-pointer transition text-xs ${
                  isSelected
                    ? 'bg-[#37373d] text-white font-medium border-l-2 border-[#007acc]'
                    : 'hover:bg-[#2a2d2e] text-[#cccccc]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-5 flex items-center justify-center shrink-0">
                    {getFileIcon(file.name)}
                  </div>
                  <span className="truncate">{file.name}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteFile(file.id)
                    }}
                    title="Delete file"
                    className="p-0.5 hover:text-rose-400 text-slate-400 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
