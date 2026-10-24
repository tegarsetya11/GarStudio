import React, { useState, useEffect, useRef } from 'react'
import {
  RotateCcw,
  Smartphone,
  Tablet,
  Monitor,
  AlertTriangle,
  Sparkles,
  Bug,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'
import type { PreviewError, WorkspaceFile } from '../types'

interface LivePreviewProps {
  files: WorkspaceFile[]
  onAutoFixError: (error: PreviewError) => void
  isFixing?: boolean
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  files,
  onAutoFixError,
  isFixing = false,
}) => {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'full'>('full')
  const [currentError, setCurrentError] = useState<PreviewError | null>(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const [previewSrcDoc, setPreviewSrcDoc] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Listen for intercepted errors from sandbox iframe via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GARSTUDIO_SANDBOX_ERROR') {
        const err: PreviewError = {
          ...event.data.error,
          timestamp: Date.now(),
        }
        setCurrentError(err)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Build combined bundle for iframe sandbox
  useEffect(() => {
    // Jika tidak ada file sama sekali — preview kosong/blank
    if (files.length === 0) {
      setPreviewSrcDoc('')
      return
    }

    const indexFile = files.find((f) => f.name === 'index.html' || f.path.endsWith('.html'))

    // Jika tidak ada file HTML atau isinya kosong — preview blank
    if (!indexFile || !indexFile.content.trim()) {
      setPreviewSrcDoc('')
      return
    }

    let html = indexFile.content

    // Extract all CSS files
    const cssFiles = files.filter((f) => f.name.endsWith('.css'))
    const inlineStyles = cssFiles.map((c) => `<style data-file="${c.name}">\n${c.content}\n</style>`).join('\n')

    // Extract all JS files
    const jsFiles = files.filter((f) => f.name.endsWith('.js') && !f.name.endsWith('.min.js'))
    const inlineScripts = jsFiles.map((j) => `<script data-file="${j.name}">\n${j.content}\n</script>`).join('\n')

    // Error Interceptor Injection Script
    const errorInterceptorScript = `
    <script>
      (function() {
        function sendError(errorData) {
          try {
            window.parent.postMessage({
              type: 'GARSTUDIO_SANDBOX_ERROR',
              error: {
                message: errorData.message || 'Unknown runtime error',
                source: errorData.source || errorData.filename || 'sandbox',
                lineno: errorData.lineno || 0,
                colno: errorData.colno || 0,
                stack: errorData.error ? errorData.error.stack : (errorData.stack || '')
              }
            }, '*');
          } catch(e) {}
        }

        window.onerror = function(message, source, lineno, colno, error) {
          sendError({ message: message.toString(), source, lineno, colno, error });
          return false;
        };

        window.addEventListener('unhandledrejection', function(event) {
          sendError({
            message: 'Unhandled Promise Rejection: ' + (event.reason ? (event.reason.message || event.reason) : 'Unknown'),
            stack: event.reason && event.reason.stack ? event.reason.stack : ''
          });
        });

        // Intercept console.error as well
        const originalConsoleError = console.error;
        console.error = function() {
          originalConsoleError.apply(console, arguments);
          const args = Array.from(arguments).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
          sendError({ message: 'Console Error: ' + args });
        };
      })();
    </script>
    `

    // Inject interceptor into <head> or at beginning
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${errorInterceptorScript}\n${inlineStyles}`)
    } else {
      html = errorInterceptorScript + inlineStyles + html
    }

    // Inject inline scripts before </body> or append
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${inlineScripts}\n</body>`)
    } else {
      html += inlineScripts
    }

    setPreviewSrcDoc(html)
  }, [files, reloadTrigger])

  const handleRefresh = () => {
    setCurrentError(null)
    setReloadTrigger((v) => v + 1)
  }

  // Open preview in new window / full tab
  const handleOpenExternal = () => {
    const blob = new Blob([previewSrcDoc], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden select-none">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181818] border-b border-[#2b2b2b] text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-200">Sandbox Preview</span>
          {currentError ? (
            <span className="flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 animate-pulse">
              <Bug className="w-3 h-3" />
              <span>Bug Intercepted</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle className="w-3 h-3" />
              <span>Healthy</span>
            </span>
          )}
        </div>

        {/* Device Mode Switchers */}
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded-md transition ${
                device === 'mobile'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mobile Android Viewport (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={`p-1.5 rounded-md transition ${
                device === 'tablet'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tablet Viewport (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDevice('full')}
              className={`p-1.5 rounded-md transition ${
                device === 'full'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full Responsive"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="Reload Preview"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleOpenExternal}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 hidden sm:flex"
            title="Open in new window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating AI Bug Diagnostic Banner */}
      {currentError && (
        <div className="bg-rose-950/90 border-b border-rose-800/80 p-3 text-xs text-rose-200 flex flex-col gap-2 shrink-0 animate-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-rose-300">
                  Runtime Error Caught ({currentError.lineno ? `Line ${currentError.lineno}` : 'Script'})
                </div>
                <div className="text-[11px] text-rose-200 font-mono mt-0.5 line-clamp-2">
                  {currentError.message}
                </div>
              </div>
            </div>
            <button
              onClick={() => setCurrentError(null)}
              className="text-rose-400 hover:text-rose-200 text-sm px-1"
            >
              ✕
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              disabled={isFixing}
              onClick={() => onAutoFixError(currentError)}
              className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white font-medium rounded-lg shadow-md flex items-center gap-1.5 text-xs active:scale-95 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isFixing ? 'AI Diagnosing & Fixing...' : 'Auto-Fix with AI Agent'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Iframe Viewport Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 bg-[#05070d]">
        <div
          className={`h-full transition-all duration-300 overflow-hidden shadow-2xl ${
            device === 'mobile'
              ? 'w-full max-w-[390px] rounded-3xl border-4 border-slate-800 bg-black'
              : device === 'tablet'
              ? 'w-full max-w-[768px] rounded-2xl border-2 border-slate-800 bg-black'
              : 'w-full rounded-xl border border-slate-800 bg-black'
          }`}
        >
          <iframe
            ref={iframeRef}
            srcDoc={previewSrcDoc}
            title="Live Preview Sandbox"
            sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
            className="w-full h-full border-none bg-slate-950"
          />
        </div>
      </div>
    </div>
  )
}
