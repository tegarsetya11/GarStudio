import type { WorkspaceFile } from '../types'

export const initialProjectFiles: WorkspaceFile[] = [
  {
    id: 'f-1',
    name: 'index.html',
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Web App</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css" />
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 flex flex-col items-center justify-center">
  <div class="w-full max-w-md mx-auto text-center space-y-6">
    <div class="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
      </svg>
    </div>
    
    <div>
      <h1 class="text-2xl font-bold text-white tracking-tight">My Mobile Web App</h1>
      <p class="text-sm text-slate-400 mt-2">Ready for development. Edit index.html or ask the AI Agent to build your idea.</p>
    </div>

    <!-- Interactive Card Demo -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <p id="counterDisplay" class="text-4xl font-mono font-bold text-cyan-400">0</p>
      <div class="flex items-center justify-center gap-3">
        <button id="incrementBtn" class="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold active:scale-95 transition">
          Click Me
        </button>
        <button id="resetBtn" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm active:scale-95 transition">
          Reset
        </button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>`
  },
  {
    id: 'f-2',
    name: 'style.css',
    path: 'style.css',
    content: `/* Custom Mobile Web Styling */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

button {
  touch-action: manipulation;
}
`
  },
  {
    id: 'f-3',
    name: 'app.js',
    path: 'app.js',
    content: `// Application Logic
let count = 0;
const counterDisplay = document.getElementById('counterDisplay');
const incrementBtn = document.getElementById('incrementBtn');
const resetBtn = document.getElementById('resetBtn');

incrementBtn?.addEventListener('click', () => {
  count++;
  if (counterDisplay) {
    counterDisplay.textContent = count;
  }
});

resetBtn?.addEventListener('click', () => {
  count = 0;
  if (counterDisplay) {
    counterDisplay.textContent = count;
  }
});

console.log("GarStudio application initialized.");
`
  },
  {
    id: 'f-4',
    name: 'README.md',
    path: 'README.md',
    content: `# My Web Project
A mobile-friendly web application created with **GarStudio**.
`
  }
]
