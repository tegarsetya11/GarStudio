import type { WorkspaceFile } from '../types'

export class FileSystemService {
  private static rootDirHandle: FileSystemDirectoryHandle | null = null

  /**
   * Check if File System Access API is supported (e.g. Chrome on Android 118+)
   */
  static isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  }

  /**
   * Check if Origin Private File System (OPFS) is supported
   */
  static isOPFSSupported(): boolean {
    return typeof navigator !== 'undefined' && 'storage' in navigator && 'getDirectory' in navigator.storage
  }

  /**
   * Link to a physical directory on Android device via showDirectoryPicker()
   */
  static async openLocalDirectory(): Promise<{ files: WorkspaceFile[]; folderName: string }> {
    if (!this.isFileSystemAccessSupported()) {
      throw new Error(
        'Physical folder linking is not supported by your current browser. You can still use GarStudio with built-in storage or OPFS.'
      )
    }

    try {
      const picker = (window as unknown as { showDirectoryPicker: (opts: unknown) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker
      const dirHandle: FileSystemDirectoryHandle = await picker({
        mode: 'readwrite',
      })

      this.rootDirHandle = dirHandle
      const files: WorkspaceFile[] = []
      await this.readDirectoryRecursive(dirHandle, '', files)

      return {
        files,
        folderName: dirHandle.name,
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Folder selection cancelled by user.')
      }
      throw err
    }
  }

  /**
   * Recursively read files from a directory handle
   */
  private static async readDirectoryRecursive(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
    accumulatedFiles: WorkspaceFile[]
  ) {
    // Iterate over directory values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valuesIterator = (dirHandle as any).values()
    for await (const entry of valuesIterator) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name

      // Ignore dotfiles and node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue
      }

      if (entry.kind === 'file') {
        try {
          const fileHandle = entry as FileSystemFileHandle
          const file = await fileHandle.getFile()
          const content = await file.text()
          accumulatedFiles.push({
            id: 'file-' + Math.random().toString(36).substring(2, 9),
            name: entry.name,
            path: entryPath,
            content,
            fileHandle,
          })
        } catch (e) {
          console.warn(`Could not read file: ${entryPath}`, e)
        }
      } else if (entry.kind === 'directory') {
        await this.readDirectoryRecursive(
          entry as FileSystemDirectoryHandle,
          entryPath,
          accumulatedFiles
        )
      }
    }
  }

  /**
   * Save content directly to physical file on Android storage
   */
  static async saveFileContent(file: WorkspaceFile, newContent: string): Promise<boolean> {
    if (file.fileHandle) {
      try {
        const writable = await file.fileHandle.createWritable()
        await writable.write(newContent)
        await writable.close()
        return true
      } catch (err) {
        console.error('Failed to write to physical file handle:', err)
      }
    }

    // Try finding in root dir handle if available
    if (this.rootDirHandle) {
      try {
        const parts = file.path.split('/')
        let currentDir = this.rootDirHandle

        for (let i = 0; i < parts.length - 1; i++) {
          currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true })
        }

        const fileName = parts[parts.length - 1]
        const fileHandle = await currentDir.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(newContent)
        await writable.close()
        file.fileHandle = fileHandle
        return true
      } catch (err) {
        console.warn('Could not write via root directory handle:', err)
      }
    }

    return false
  }

  /**
   * Create a new file in physical directory or memory
   */
  static async createNewFile(
    fileName: string,
    initialContent: string = '',
    _existingFiles: WorkspaceFile[] = []
  ): Promise<WorkspaceFile> {
    let fileHandle: FileSystemFileHandle | undefined

    if (this.rootDirHandle) {
      try {
        const parts = fileName.split('/')
        let currentDir = this.rootDirHandle

        for (let i = 0; i < parts.length - 1; i++) {
          currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true })
        }

        const baseName = parts[parts.length - 1]
        fileHandle = await currentDir.getFileHandle(baseName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(initialContent)
        await writable.close()
      } catch (e) {
        console.warn('Could not write new file physically:', e)
      }
    }

    const newFile: WorkspaceFile = {
      id: 'file-' + Math.random().toString(36).substring(2, 9),
      name: fileName.split('/').pop() || fileName,
      path: fileName,
      content: initialContent,
      fileHandle,
    }

    return newFile
  }

  /**
   * Export all workspace files as an immediate browser download package
   */
  static exportFilesToDownload(files: WorkspaceFile[], _projectName = 'garstudio-project') {
    files.forEach((file) => {
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  /**
   * Save workspace state to localStorage (offline persistence)
   */
  static saveToLocalStorage(files: WorkspaceFile[]) {
    try {
      const serialized = files.map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        content: f.content,
      }))
      localStorage.setItem('garstudio_workspace', JSON.stringify(serialized))
    } catch (e) {
      console.warn('Failed to save to localStorage:', e)
    }
  }

  /**
   * Load workspace state from localStorage
   */
  static loadFromLocalStorage(): WorkspaceFile[] | null {
    try {
      const data = localStorage.getItem('garstudio_workspace')
      if (data) {
        return JSON.parse(data)
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e)
    }
    return null
  }
}
