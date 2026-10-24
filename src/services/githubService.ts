import { Octokit } from '@octokit/rest'
import type { GitHubConfig, WorkspaceFile } from '../types'

export class GitHubService {
  /**
   * Test user token and retrieve username
   */
  static async verifyToken(token: string): Promise<string> {
    const octokit = new Octokit({ auth: token })
    const { data } = await octokit.rest.users.getAuthenticated()
    return data.login
  }

  /**
   * Upload all workspace files directly to GitHub (create repo if needed, commit, and push)
   */
  static async uploadWorkspace(
    config: GitHubConfig,
    files: WorkspaceFile[],
    onProgress?: (msg: string) => void
  ): Promise<{ repoUrl: string; commitSha: string }> {
    if (!config.token) {
      throw new Error('GitHub Personal Access Token is required.')
    }
    if (!config.repo) {
      throw new Error('Repository name is required.')
    }

    const octokit = new Octokit({ auth: config.token })
    const notify = (msg: string) => onProgress?.(msg)

    notify('Authenticating with GitHub...')
    const { data: user } = await octokit.rest.users.getAuthenticated()
    const owner = user.login
    const repo = config.repo.trim().replace(/\s+/g, '-')

    // 1. Check if repo exists; if not, create it
    notify(`Checking repository ${owner}/${repo}...`)
    let repoData
    try {
      const existing = await octokit.rest.repos.get({ owner, repo })
      repoData = existing.data
      notify('Repository found. Preparing commit...')
    } catch (err: unknown) {
      // @ts-expect-error - Octokit error status
      if (err?.status === 404) {
        notify(`Creating new ${config.isPrivate ? 'private' : 'public'} repository...`)
        const created = await octokit.rest.repos.createForAuthenticatedUser({
          name: repo,
          description: config.description || 'Created seamlessly with GarStudio Mobile AI IDE',
          private: config.isPrivate,
          auto_init: true,
        })
        repoData = created.data
        notify('Repository created successfully.')
        // Brief pause for GitHub to initialize branch
        await new Promise((res) => setTimeout(res, 2000))
      } else {
        throw err
      }
    }

    const branch = config.branch || repoData.default_branch || 'main'

    // 2. Get latest commit SHA on the branch if it exists
    let latestCommitSha: string | undefined
    try {
      const refData = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      })
      latestCommitSha = refData.data.object.sha
    } catch (e) {
      console.warn('Branch ref not found, will create fresh root commit:', e)
    }

    // 3. Create Blobs for each file in workspace
    notify(`Uploading ${files.length} workspace files...`)
    const treeItems: {
      path: string
      mode: '100644'
      type: 'blob'
      sha: string
    }[] = []

    for (const file of files) {
      notify(`Creating blob for ${file.path}...`)
      // Browser-safe utf-8 base64 encoding
      const utf8Bytes = new TextEncoder().encode(file.content)
      let binaryStr = ''
      for (let i = 0; i < utf8Bytes.length; i++) {
        binaryStr += String.fromCharCode(utf8Bytes[i])
      }
      const base64Content = btoa(binaryStr)

      const blob = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: base64Content,
        encoding: 'base64',
      })

      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.data.sha,
      })
    }

    // 4. Create new Git Tree
    notify('Assembling Git Tree...')
    const newTree = await octokit.rest.git.createTree({
      owner,
      repo,
      tree: treeItems,
      base_tree: latestCommitSha,
    })

    // 5. Create Commit
    notify('Creating commit...')
    const commitMessage = `🚀 GarStudio AI Commit: ${new Date().toLocaleTimeString()} - synced from Android`
    const newCommit = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.data.sha,
      parents: latestCommitSha ? [latestCommitSha] : [],
    })

    // 6. Update Reference (Push)
    notify(`Pushing to ${branch}...`)
    try {
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.data.sha,
        force: true,
      })
    } catch {
      // If ref does not exist yet, create it
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: newCommit.data.sha,
      })
    }

    notify('✅ Successfully pushed to GitHub!')
    return {
      repoUrl: repoData.html_url,
      commitSha: newCommit.data.sha.substring(0, 7),
    }
  }
}
