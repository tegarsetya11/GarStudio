import React, { useState, useEffect } from 'react'
import { onAuthChange, signOutUser, signInWithGoogle, signInWithGitHub } from './lib/firebase'
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

  // Workspace visibility (stays in coding workspace even after signing out)
  const [inWorkspace, setInWorkspace] = useState<boolean>(() => {
    return (
      !!localStorage.getItem('garstudio_user_session') ||
      localStorage.getItem('garstudio_in_workspace') === 'true'
    )
  })
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
        '👋 Halo! Saya GarStudio AI Agent — siap membantu membangun web impian Anda!\n\n💡 **Saya mengerti apa saja yang Anda ketik**, baik Bahasa Indonesia, Inggris, atau bahasa gaul sekalipun. Tidak perlu format khusus!\n\nContoh perintah:\n• "buat game quiz matematika" → langsung generate\n• "toko online pakaian premium" → langsung generate\n• "ubah warna jadi merah" → langsung koreksi\n• "timer ga jalan" → langsung debug & fix\n\n🚀 Ketik apa saja — saya akan selalu memahami dan langsung menghasilkan kodenya!',
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

  // Apply AI Changes directly to workspace files, persist to storage, and activate index.html
  const applyChangesToWorkspace = async (changes: FileChange[]) => {
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
    FileSystemService.saveToLocalStorage(updatedFiles)

    // Set active file to index.html or first changed file
    const target = updatedFiles.find((f) => f.name === 'index.html') || updatedFiles[0]
    if (target) {
      setActiveFileId(target.id)
    }

    return updatedFiles
  }

  // Unified Autonomous AI Agent Prompt Workflow (Auto-detect Plan vs Correction & Auto-Apply)
  const handleSendPrompt = async (prompt: string, _mode?: AIMode) => {
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

    // Auto-detect: apakah ini koreksi/modifikasi langsung atau pembuatan web baru
    const isCorrection = AIAgentService.isCorrectionOrEdit(prompt, files)

    if (isCorrection) {
      // ── KOREKSI / EDIT LANGSUNG ──
      setAiStage('generating')
      const result = await AIAgentService.reviseAndCorrect(
        prompt,
        activeFile,
        files,
        ...aiParams
      )
      setAiStage('done')
      if (result.rateLimit) setRateLimit(result.rateLimit)

      if (result.changes && result.changes.length > 0) {
        await applyChangesToWorkspace(result.changes)
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-fix-' + Date.now(),
          role: 'assistant',
          content: result.message || `✨ Koreksi berhasil diterapkan langsung! Web di preview telah diperbarui.`,
          timestamp: Date.now(),
          changes: result.changes,
        },
      ])
      return
    }

    // ── PEMBUATAN WEB BARU (PLAN + AUTO GENERATE + AUTO APPLY) ──
    setAiStage('planning')
    const { plan, rateLimit: rl1 } = await AIAgentService.planArchitecture(prompt, files, ...aiParams)
    if (rl1) setRateLimit(rl1)

    // Tampilkan rencana arsitektur di chat
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-plan-' + Date.now(),
        role: 'assistant',
        content: `📋 [${providerLabel}] Rencana dibuat untuk: "${plan.goal}"`,
        timestamp: Date.now(),
        plan,
      },
    ])

    // Langsung generate kodenya dan terapkan otomatis!
    setAiStage('generating')
    const { changes, rateLimit: rl2 } = await AIAgentService.generateCode(plan, files, ...aiParams, prompt)
    if (rl2) setRateLimit(rl2)

    if (changes && changes.length > 0) {
      await applyChangesToWorkspace(changes)
    }

    setAiStage('done')
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-code-' + Date.now(),
        role: 'assistant',
        content: `🚀 [${providerLabel}] Kode selesai dibuat dan langsung dijalankan di Live Preview! Silakan uji web Anda atau berikan koreksi langsung kapan saja.`,
        timestamp: Date.now(),
        changes,
      },
    ])
  }

  // Apply AI Changes directly to workspace files and save
  const handleApplyChanges = async (changes: FileChange[]) => {
    await applyChangesToWorkspace(changes)
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
    setInWorkspace(true)
    localStorage.setItem('garstudio_in_workspace', 'true')
    // Show folder guide modal before starting coding if no folder linked yet
    if (!folderName) {
      setIsFolderGuideOpen(true)
    }
  }

  // Sign out dari akun Google/GitHub tapi TETAP DI HALAMAN CODING
  const handleSignOut = async () => {
    try {
      await signOutUser() // Firebase sign out
    } catch { /* ignore */ }
    localStorage.removeItem('garstudio_user_session')
    setCurrentUser(null)
    // Tetap di workspace halaman coding!
    setInWorkspace(true)
    localStorage.setItem('garstudio_in_workspace', 'true')
  }

  // Kembali ke Beranda (Landing Page)
  const handleGoToHome = () => {
    localStorage.removeItem('garstudio_in_workspace')
    setInWorkspace(false)
  }

  // Quick login dari dalam halaman coding
  const handleLoginWithGoogle = async () => {
    try {
      const fbUser = await signInWithGoogle()
      const session: UserSession = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Google User',
        email: fbUser.email || '',
        provider: 'google',
        avatarUrl: fbUser.photoURL || '',
      }
      localStorage.setItem('garstudio_user_session', JSON.stringify(session))
      setCurrentUser(session)
      setInWorkspace(true)
      localStorage.setItem('garstudio_in_workspace', 'true')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || ''
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        alert('Gagal login Google. Pastikan popup browser diizinkan.')
      }
    }
  }

  const handleLoginWithGitHub = async () => {
    try {
      const fbUser = await signInWithGitHub()
      const session: UserSession = {
        id: fbUser.uid,
        name: fbUser.displayName || 'GitHub User',
        email: fbUser.email || '',
        provider: 'github',
        avatarUrl: fbUser.photoURL || '',
      }
      localStorage.setItem('garstudio_user_session', JSON.stringify(session))
      setCurrentUser(session)
      setInWorkspace(true)
      localStorage.setItem('garstudio_in_workspace', 'true')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || ''
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        alert('Gagal login GitHub. Pastikan popup browser diizinkan.')
      }
    }
  }

  // Tampilkan LandingPage jika belum masuk ke workspace dan belum login
  if (!inWorkspace && !currentUser) {
    return (
      <LandingPage
        onLoginSuccess={handleLoginSuccess}
        onContinueGuest={() => {
          setInWorkspace(true)
          localStorage.setItem('garstudio_in_workspace', 'true')
        }}
      />
    )
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
        onSignOut={handleSignOut}
        onLogout={handleGoToHome}
        onOpenLogin={handleLoginWithGoogle}
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
          currentUser={currentUser}
          onLoginWithGoogle={handleLoginWithGoogle}
          onLoginWithGitHub={handleLoginWithGitHub}
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
              currentUser={currentUser}
              onLoginWithGoogle={handleLoginWithGoogle}
              onLoginWithGitHub={handleLoginWithGitHub}
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
