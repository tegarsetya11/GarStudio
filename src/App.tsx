import React, { useState, useEffect } from 'react'
import { onAuthChange, signOutUser } from './lib/firebase'
import type {
  ActivePanel,
  AIMessage,
  AIMode,
  AIStage,
  FileChange,
  PreviewError,
  RateLimitInfo,
  SettingsState,
  SplitOrientation,
  UserSession,
  ViewMode,
  WorkspaceFile,
} from './types'
import { initialProjectFiles } from './utils/starterProject'
import { FileSystemService } from './services/fileSystemService'
import { AIAgentService } from './services/aiAgentService'
import { Header } from './components/Header'
import { VSCodeActivityBar } from './components/VSCodeActivityBar'
import { FileExplorer } from './components/FileExplorer'
import { VSCodeTabBar } from './components/VSCodeTabBar'
import { CodeEditor } from './components/CodeEditor'
import { LivePreview } from './components/LivePreview'
import { AIAgentPanel } from './components/AIAgentPanel'
import { MobileLayout } from './components/MobileLayout'
import { RateLimitBanner } from './components/RateLimitBanner'
import { VSCodeStatusBar } from './components/VSCodeStatusBar'
import { GitHubModal } from './components/GitHubModal'
import { SettingsModal } from './components/SettingsModal'
import { LandingPage } from './components/LandingPage'
import { FolderGuideModal } from './components/FolderGuideModal'
import { TutorialModal } from './components/TutorialModal'

export const App: React.FC = () => {
  // Workspace files state
  const [files, setFiles] = useState<WorkspaceFile[]>(() => {
    const saved = FileSystemService.loadFromLocalStorage()
    if (saved && saved.length > 0) {
      // Filter out old PraciPulse or old starter "My Mobile Web App" content
      const hasOldContent = saved.some(
        (f) =>
          (f.content && f.content.includes('PraciPulse')) ||
          (f.content && f.content.includes('My Mobile Web App')) ||
          (f.content && f.content.includes('GarStudio application initialized'))
      )
      if (!hasOldContent) {
        return saved
      }
      // Clear old starter content from localStorage
      FileSystemService.saveToLocalStorage([])
    }
    // Default: empty workspace — no starter example files
    return []
  })
  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return files[0]?.id || ''
  })
  const [folderName, setFolderName] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<ActivePanel>('editor')

  // VS Code Layout: Editor, Split (Side-by-side or Top-bottom), or Preview
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [splitOrientation, setSplitOrientation] = useState<SplitOrientation>('horizontal')
  const [mobilePreviewVisible, setMobilePreviewVisible] = useState(true)

  // AI & Debugger states
  const [aiStage, setAiStage] = useState<AIStage>('idle')
  const [aiMode, setAiMode] = useState<AIMode>('plan')
  const [currentError, setCurrentError] = useState<PreviewError | null>(null)
  const [isFixingBug, setIsFixingBug] = useState(false)
  const [isGitHubOpen, setIsGitHubOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null)

  // 2-Page Flow: User Session, Folder Guide Modal, and Tutorial Modal
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    // Restore from localStorage as initial state (will be overwritten by Firebase listener)
    const saved = localStorage.getItem('garstudio_user_session')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        return null
      }
    }
    return null
  })

  // Firebase Auth state listener — runs on mount and stays active
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        // User logged in via Firebase — sync to our session format
        const saved = localStorage.getItem('garstudio_user_session')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed.id === firebaseUser.uid) {
              setCurrentUser(parsed)
              return
            }
          } catch { /* ignore */ }
        }
        // Build session from Firebase user if localStorage doesn't match
        const session: UserSession = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          provider: firebaseUser.providerData[0]?.providerId?.includes('github') ? 'github' : 'google',
          avatarUrl: firebaseUser.photoURL || '',
        }
        localStorage.setItem('garstudio_user_session', JSON.stringify(session))
        setCurrentUser(session)
      } else {
        // Firebase says user is not logged in
        localStorage.removeItem('garstudio_user_session')
        setCurrentUser(null)
      }
    })
    return () => unsubscribe()
  }, [])
  const [isFolderGuideOpen, setIsFolderGuideOpen] = useState(false)
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)

  // Settings
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('garstudio_settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          aiProvider: parsed.aiProvider || 'gemini',
          geminiApiKey: parsed.geminiApiKey || '',
          geminiModel: (!parsed.geminiModel || parsed.geminiModel === 'gemini-2.0-flash' || parsed.geminiModel === 'gemini-2.5-flash') ? 'gemini-3.8-flash' : parsed.geminiModel,
          claudeApiKey: parsed.claudeApiKey || '',
          claudeModel: (!parsed.claudeModel || parsed.claudeModel === 'claude-3-5-sonnet-20241022') ? 'claude-sonnet-4-5' : parsed.claudeModel,
          copilotToken: parsed.copilotToken || '',
          copilotModel: parsed.copilotModel || 'gpt-4o',
          githubToken: parsed.githubToken || '',
          fontSize: parsed.fontSize || 14,
          wordWrap: parsed.wordWrap ?? true,
          autoRunPreview: parsed.autoRunPreview ?? true,
          previewDevice: parsed.previewDevice || 'mobile',
        }
      } catch (e) {
        console.warn('Error reading settings', e)
      }
    }
    return {
      aiProvider: 'gemini',
      geminiApiKey: '',
      geminiModel: 'gemini-3.8-flash',
      claudeApiKey: '',
      claudeModel: 'claude-sonnet-4-5',
      copilotToken: '',
      copilotModel: 'gpt-4o',
      githubToken: '',
      fontSize: 14,
      wordWrap: true,
      autoRunPreview: true,
      previewDevice: 'mobile',
    }
  })

  // AI Agent Message History
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'm-init',
      role: 'assistant',
      content:
        '👋 Selamat datang di GarStudio! IDE Mobile AI untuk Android. Ketik perintah dalam Bahasa Indonesia atau Inggris — saya mengerti keduanya! Gunakan mode **Buat Plan** untuk membangun fitur baru, atau **Interaktif** untuk tanya jawab cepat. Pilih engine AI (Gemini/Claude) di panel ini.',
      timestamp: Date.now(),
    },
  ])

  // Save files to local storage on change
  useEffect(() => {
    FileSystemService.saveToLocalStorage(files)
  }, [files])

  // Save settings
  const handleUpdateSettings = (newSettings: Partial<SettingsState>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem('garstudio_settings', JSON.stringify(updated))
  }

  const activeFile = files.find((f) => f.id === activeFileId) || files[0] || null

  // File operations
  const handleSelectFile = (file: WorkspaceFile) => {
    setActiveFileId(file.id)
    if (activePanel === 'explorer') {
      setActivePanel('editor')
    }
  }

  const handleCreateFile = async (name: string) => {
    const newFile = await FileSystemService.createNewFile(name, '', files)
    setFiles((prev) => [...prev, newFile])
    setActiveFileId(newFile.id)
    setActivePanel('editor')
  }

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    if (activeFileId === fileId) {
      const remaining = files.filter((f) => f.id !== fileId)
      if (remaining.length > 0) {
        setActiveFileId(remaining[0].id)
      }
    }
  }

  const handleEditorChange = (newContent: string) => {
    if (!activeFile) return
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFile.id ? { ...f, content: newContent } : f))
    )
  }

  const handleSaveFile = async () => {
    if (activeFile) {
      await FileSystemService.saveFileContent(activeFile, activeFile.content)
    }
  }

  // Link physical Android device folder via showDirectoryPicker()
  const handleLinkFolder = async () => {
    try {
      const { files: loadedFiles, folderName: name } = await FileSystemService.openLocalDirectory()
      setFolderName(name)
      setIsFolderGuideOpen(false)

      if (loadedFiles.length > 0) {
        // Folder berisi file — tampilkan semua
        setFiles(loadedFiles)
        setActiveFileId(loadedFiles[0].id)
      } else {
        // Folder kosong — workspace bersih seperti VS Code/Antigravity
        setFiles([])
        setActiveFileId('')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message)
      }
    }
  }

  // Export project to device downloads
  const handleExport = () => {
    FileSystemService.exportFilesToDownload(files, folderName || 'garstudio-project')
  }

  const providerLabel = AIAgentService.providerLabel(settings.aiProvider)

  // Shorthand for copilot params
  const aiParams = [
    settings.aiProvider,
    settings.geminiApiKey,
    settings.geminiModel,
    settings.claudeApiKey,
    settings.claudeModel,
    settings.copilotToken,
    settings.copilotModel,
  ] as const

  // Autonomous AI Agent Prompt Workflow (Plan Mode & Interactive Mode)
  const handleSendPrompt = async (prompt: string, mode: AIMode = 'plan') => {
    // Automatically ensure all 3 panels (HTML Editor, Web Preview, AI Agent) are visible on prompt
    setMobilePreviewVisible(true)
    setViewMode('split')

    const userMsg: AIMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setRateLimit(null)

    if (mode === 'interactive') {
      setAiStage('generating')
      const result = await AIAgentService.interactiveChat(prompt, activeFile, files, ...aiParams)
      setAiStage('done')
      if (result.rateLimit) setRateLimit(result.rateLimit)
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-chat-' + Date.now(),
          role: 'assistant',
          content: result.message,
          timestamp: Date.now(),
          changes: result.changes,
        },
      ])
      return
    }

    // Plan Mode
    setAiStage('planning')
    const { plan, rateLimit: rl1 } = await AIAgentService.planArchitecture(prompt, files, ...aiParams)
    if (rl1) { setRateLimit(rl1); setAiStage('idle'); return }

    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-plan-' + Date.now(),
        role: 'assistant',
        content: `📋 [${providerLabel} — Mode Plan] Rencana arsitektur dibuat untuk: "${plan.goal}"`,
        timestamp: Date.now(),
        plan,
      },
    ])

    setAiStage('generating')
    const { changes, rateLimit: rl2 } = await AIAgentService.generateCode(plan, files, ...aiParams)
    if (rl2) { setRateLimit(rl2); setAiStage('idle'); return }

    setAiStage('done')
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-code-' + Date.now(),
        role: 'assistant',
        content: `✅ [${providerLabel}] Kode selesai untuk ${changes.length} file. Tinjau lalu tekan "Apply" di bawah.`,
        timestamp: Date.now(),
        changes,
      },
    ])
  }

  // Apply AI Changes directly to workspace files and save
  const handleApplyChanges = async (changes: FileChange[]) => {
    let updatedFiles = [...files]

    for (const change of changes) {
      const existing = updatedFiles.find((f) => f.path === change.path)
      if (existing) {
        updatedFiles = updatedFiles.map((f) =>
          f.path === change.path ? { ...f, content: change.code } : f
        )
        await FileSystemService.saveFileContent(existing, change.code)
      } else {
        const newFile = await FileSystemService.createNewFile(
          change.path,
          change.code,
          updatedFiles
        )
        updatedFiles.push(newFile)
      }
    }

    setFiles(updatedFiles)
    alert(`✅ ${changes.length} perubahan file berhasil diterapkan ke workspace!`)
    setViewMode('split')
  }

  // AI Debugger: Intercept error from iframe and auto-fix
  const handleAutoFixError = async (error: PreviewError) => {
    setIsFixingBug(true)
    setAiStage('debugging')
    setRateLimit(null)

    const { fixes, rateLimit: rl } = await AIAgentService.autoFixBug(error, files, ...aiParams)
    if (rl) setRateLimit(rl)

    if (fixes.length > 0) {
      await handleApplyChanges(fixes)
      setCurrentError(null)
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-fix-' + Date.now(),
          role: 'assistant',
          content: `🛠️ AI Debugger Otonom (${providerLabel}) berhasil memperbaiki error: "${error.message}"`,
          timestamp: Date.now(),
          changes: fixes,
        },
      ])
    }

    setIsFixingBug(false)
    setAiStage('idle')
  }

  const handleLoginSuccess = (session: UserSession) => {
    setCurrentUser(session)
    // Show folder guide modal before starting coding if no folder linked yet
    if (!folderName) {
      setIsFolderGuideOpen(true)
    }
  }

  const handleLogout = async () => {
    try {
      await signOutUser() // Firebase sign out
    } catch { /* ignore */ }
    localStorage.removeItem('garstudio_user_session')
    setCurrentUser(null)
  }

  // If user is not logged in, render Page 1 (LandingPage / Beranda)
  if (!currentUser) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-full bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-sans select-none">
      {/* VS Code Title Bar - shown on all screens */}
      <Header
        folderName={folderName}
        activeFile={activeFile}
        onOpenFolder={handleLinkFolder}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGitHub={() => setIsGitHubOpen(true)}
        onExport={handleExport}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenTutorial={() => setIsTutorialOpen(true)}
      />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MOBILE LAYOUT: Top=Code, Middle=Preview, Bottom=AI Agent */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 md:hidden overflow-hidden">
        <MobileLayout
          files={files}
          activeFile={activeFile}
          onEditorChange={handleEditorChange}
          onSaveFile={handleSaveFile}
          messages={messages}
          aiStage={aiStage}
          aiProvider={settings.aiProvider}
          aiMode={aiMode}
          onSwitchProvider={(provider) => handleUpdateSettings({ aiProvider: provider })}
          onSwitchMode={setAiMode}
          onSendPrompt={handleSendPrompt}
          onApplyChanges={handleApplyChanges}
          onAutoFixError={handleAutoFixError}
          isFixingBug={isFixingBug}
          githubToken={settings.githubToken}
          previewVisible={mobilePreviewVisible}
          onTogglePreview={() => setMobilePreviewVisible((v) => !v)}
          folderLinked={!!folderName}
          folderName={folderName || undefined}
          onOpenFolder={handleLinkFolder}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT: VS Code-style side-by-side layout       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-1 overflow-hidden relative">
        {/* VS Code Activity Bar (Leftmost icon strip) */}
        <VSCodeActivityBar
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenFolder={handleLinkFolder}
          hasError={!!currentError}
        />

        {/* VS Code Secondary Sidebar (File Explorer) */}
        {activePanel === 'explorer' && (
          <div className="w-64 h-full border-r border-[#2b2b2b] shrink-0 z-20 flex flex-col bg-[#252526]">
            <FileExplorer
              files={files}
              activeFile={activeFile}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onLinkFolder={handleLinkFolder}
              folderName={folderName}
            />
          </div>
        )}

        {/* VS Code Main Editor & Live Preview Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1e1e1e]">
          {/* VS Code Tabs */}
          <VSCodeTabBar
            files={files}
            activeFile={activeFile}
            onSelectFile={handleSelectFile}
            viewMode={viewMode}
            setViewMode={setViewMode}
            splitOrientation={splitOrientation}
            setSplitOrientation={setSplitOrientation}
            onRunPreview={() => setViewMode(viewMode === 'preview' ? 'editor' : 'preview')}
            onOpenAI={() => setActivePanel(activePanel === 'agent' ? 'editor' : 'agent')}
          />

          {/* Central Stage */}
          <div className="flex-1 overflow-hidden relative">
            {viewMode === 'editor' && (
              <div className="w-full h-full">
                <CodeEditor
                  file={activeFile}
                  onChange={handleEditorChange}
                  onSave={handleSaveFile}
                  isSaved={true}
                  folderLinked={!!folderName}
                  folderName={folderName || undefined}
                  onOpenFolder={handleLinkFolder}
                />
              </div>
            )}

            {viewMode === 'preview' && (
              <div className="w-full h-full">
                <LivePreview
                  files={files}
                  onAutoFixError={handleAutoFixError}
                  isFixing={isFixingBug}
                />
              </div>
            )}

            {viewMode === 'split' && (
              <div
                className={`w-full h-full flex ${
                  splitOrientation === 'horizontal' ? 'flex-row' : 'flex-col'
                }`}
              >
                <div
                  className={`relative overflow-hidden ${
                    splitOrientation === 'horizontal'
                      ? 'w-1/2 h-full border-r border-[#2b2b2b]'
                      : 'w-full h-1/2 border-b border-[#2b2b2b]'
                  }`}
                >
                  <CodeEditor
                    file={activeFile}
                    onChange={handleEditorChange}
                    onSave={handleSaveFile}
                    isSaved={true}
                    folderLinked={!!folderName}
                    folderName={folderName || undefined}
                    onOpenFolder={handleLinkFolder}
                  />
                </div>
                <div
                  className={`relative overflow-hidden ${
                    splitOrientation === 'horizontal' ? 'w-1/2 h-full' : 'w-full h-1/2'
                  }`}
                >
                  <LivePreview
                    files={files}
                    onAutoFixError={handleAutoFixError}
                    isFixing={isFixingBug}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop AI Agent Panel on right */}
        {activePanel === 'agent' && (
          <div className="w-80 lg:w-96 h-full border-l border-[#2b2b2b] shrink-0 z-20 flex flex-col bg-[#181818]">
            <AIAgentPanel
              messages={messages}
              aiStage={aiStage}
              aiProvider={settings.aiProvider}
              aiMode={aiMode}
              onSwitchProvider={(provider) => handleUpdateSettings({ aiProvider: provider })}
              onSwitchMode={setAiMode}
              onSendPrompt={handleSendPrompt}
              onApplyChanges={handleApplyChanges}
              activeFile={activeFile}
              files={files}
              githubToken={settings.githubToken}
              folderLinked={!!folderName}
              onOpenFolder={handleLinkFolder}
            />
          </div>
        )}
      </div>

      {/* VS Code Blue Status Bar - desktop only */}
      <div className="hidden md:block">
        <VSCodeStatusBar
          activeFile={activeFile}
          viewMode={viewMode}
          setViewMode={setViewMode}
          aiProvider={settings.aiProvider}
          error={currentError}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAI={() => setActivePanel(activePanel === 'agent' ? 'editor' : 'agent')}
          folderName={folderName}
        />
      </div>

      {/* GitHub Sync Modal */}
      <GitHubModal
        isOpen={isGitHubOpen || activePanel === 'git'}
        onClose={() => {
          setIsGitHubOpen(false)
          if (activePanel === 'git') setActivePanel('editor')
        }}
        files={files}
        initialToken={settings.githubToken}
        onSaveToken={(t) => handleUpdateSettings({ githubToken: t })}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* ⚡ Rate Limit Warning Banner (Antigravity-style) */}
      <RateLimitBanner
        rateLimit={rateLimit}
        onDismiss={() => setRateLimit(null)}
        onSwitchProvider={(provider) => handleUpdateSettings({ aiProvider: provider })}
        currentProvider={settings.aiProvider}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 📂 Post-Login Folder Guide Modal (Step-by-step instruction requested by user) */}
      <FolderGuideModal
        isOpen={isFolderGuideOpen}
        onClose={() => setIsFolderGuideOpen(false)}
        onOpenFolder={handleLinkFolder}
        onContinueWithoutFolder={() => setIsFolderGuideOpen(false)}
      />

      {/* 📖 Tutorial & Guide Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  )
}

export default App
