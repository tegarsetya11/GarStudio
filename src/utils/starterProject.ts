import type { WorkspaceFile } from '../types'

export const initialProjectFiles: WorkspaceFile[] = [
  {
    id: 'f-1',
    name: 'index.html',
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>GarStudio • Gemini Canvas & 2D Arcade Engine</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Font: Plus Jakarta Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css" />
</head>
<body class="bg-[#090b10] text-slate-100 min-h-screen flex flex-col font-['Plus_Jakarta_Sans'] antialiased selection:bg-cyan-500 selection:text-black">

  <!-- Top Gemini-Style Canvas Header -->
  <header class="sticky top-0 z-40 bg-[#0d111a]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
        <!-- Embedded SVG Logo -->
        <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-extrabold tracking-tight text-white">GarStudio Canvas</span>
          <span class="text-[10px] bg-cyan-500/10 text-cyan-400 font-mono px-2 py-0.5 rounded-full border border-cyan-500/20">v2.5 Engine</span>
        </div>
        <p class="text-[10px] text-slate-400 font-medium">Multi-Agent Intelligence & 2D Arcade Engine</p>
      </div>
    </div>

    <!-- Active Multi-Agent Selector Tabs -->
    <div class="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
      <button id="agentGeminiBtn" class="agent-tab active px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="hidden sm:inline">🟢 Gemini</span>
      </button>
      <button id="agentClaudeBtn" class="agent-tab px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition text-[11px] font-semibold text-slate-400 hover:text-amber-300">
        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        <span class="hidden sm:inline">🟠 Claude</span>
      </button>
      <button id="agentCopilotBtn" class="agent-tab px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition text-[11px] font-semibold text-slate-400 hover:text-cyan-300">
        <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
        <span class="hidden sm:inline">🔵 Copilot</span>
      </button>
    </div>
  </header>

  <!-- Main Canvas Workspace Grid -->
  <main class="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
    
    <!-- Left Column: Interactive 2D Arcade Game Canvas -->
    <div class="lg:col-span-8 flex flex-col gap-3">
      <div class="relative bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
        
        <!-- Game HUD & Controls Bar -->
        <div class="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
          <div class="flex items-center gap-3">
            <span class="font-bold text-white tracking-wide flex items-center gap-1.5">
              <span class="text-amber-400">⚡</span> CYBER RUNNER 2D
            </span>
            <div class="font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              SCORE: <span id="gameScore">0</span>
            </div>
            <div class="hidden sm:block font-mono text-slate-400 text-[11px]">
              HI: <span id="gameHighScore">0</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button id="soundToggleBtn" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs" title="Toggle Sound">
              🔊
            </button>
            <button id="gameRestartBtn" class="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold text-xs transition">
              Restart
            </button>
          </div>
        </div>

        <!-- HTML5 2D Game Canvas Area -->
        <div class="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-[#05070d] flex items-center justify-center overflow-hidden">
          <canvas id="gameCanvas" class="w-full h-full block cursor-pointer"></canvas>

          <!-- Game Over Overlay -->
          <div id="gameOverScreen" class="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 hidden animate-in fade-in">
            <div class="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl">
              💥
            </div>
            <h2 class="text-xl font-extrabold text-white">SYSTEM CRASHED</h2>
            <p class="text-xs text-slate-400 max-w-xs">Skor akhir kamu: <span id="finalScoreDisplay" class="font-bold text-cyan-400 font-mono text-sm">0</span>. Sentuh layar atau klik tombol di bawah untuk bangkit lagi!</p>
            <button id="btnPlayAgain" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition">
              🔄 Main Lagi (Space / Tap)
            </button>
          </div>
        </div>

        <!-- Android Touch Virtual Controls (Visible on mobile/tablet) -->
        <div class="p-3 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between sm:hidden">
          <span class="text-[11px] text-slate-400">Ketuk layar atau tombol:</span>
          <button id="touchJumpBtn" class="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 active:scale-90 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition">
            LOMPAT (JUMP) 🚀
          </button>
        </div>
      </div>
    </div>

    <!-- Right Column: Multi-Agent Intelligence Telemetry & Live Controls -->
    <div class="lg:col-span-4 flex flex-col gap-3">
      
      <!-- Agent Intelligence Status Card -->
      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-300">Active Intelligence Engine</span>
          <span id="agentBadge" class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            🟢 GEMINI AGENT
          </span>
        </div>
        <p id="agentDescription" class="text-xs text-slate-400 leading-relaxed">
          Mengontrol tata letak real-time, visual rendering 60FPS pada Canvas, responsivitas sentuhan, dan palet estetika modern.
        </p>

        <!-- Dynamic Action Buttons -->
        <div class="space-y-2 pt-1">
          <button id="btnPulseColor" class="w-full py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-between transition active:scale-98">
            <span class="flex items-center gap-2">🎨 <span>Ganti Palet Warna Neon</span></span>
            <span class="text-[10px] text-slate-400 font-mono">Cycle</span>
          </button>
          <button id="btnSpeedUp" class="w-full py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-between transition active:scale-98">
            <span class="flex items-center gap-2">⚡ <span>Tingkatkan Kecepatan Game</span></span>
            <span id="speedIndicator" class="text-[10px] text-cyan-400 font-mono">1.0x</span>
          </button>
          <button id="btnSoundChime" class="w-full py-2 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-between transition active:scale-98">
            <span class="flex items-center gap-2">🎵 <span>Tes Audio Synthesizer</span></span>
            <span class="text-[10px] text-cyan-400 font-mono">WebAudio</span>
          </button>
        </div>
      </div>

      <!-- Real-Time Metrics & Workspace Info -->
      <div class="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-2.5 text-xs text-slate-400 font-mono">
        <div class="flex justify-between items-center text-slate-300 font-bold text-[11px]">
          <span>WORKSPACE TELEMETRY</span>
          <span class="text-emerald-400 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live
          </span>
        </div>
        <div class="flex justify-between">
          <span>FPS Rate:</span>
          <span id="fpsDisplay" class="text-white font-bold">60.0</span>
        </div>
        <div class="flex justify-between">
          <span>Asset Policy:</span>
          <span class="text-cyan-400">100% Inline SVG/Canvas</span>
        </div>
        <div class="flex justify-between">
          <span>Persistence:</span>
          <span class="text-emerald-400">VS Code Continuous</span>
        </div>
      </div>

    </div>
  </main>

  <script src="script.js"></script>
</body>
</html>`
  },
  {
    id: 'f-2',
    name: 'style.css',
    path: 'style.css',
    content: `/* Custom Gemini Canvas & 2D Arcade Engine Styling */

:root {
  --neon-accent: #06b6d4;
  --neon-glow: rgba(6, 182, 212, 0.35);
}

body {
  touch-action: manipulation;
  -webkit-font-smoothing: antialiased;
}

canvas {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
  user-select: none;
  -webkit-user-select: none;
}

/* Glassmorphism Accents */
.glass-panel {
  background: rgba(13, 17, 26, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Micro-interaction active tab transitions */
.agent-tab {
  cursor: pointer;
  border: 1px solid transparent;
}

.agent-tab.active {
  box-shadow: 0 4px 12px var(--neon-glow);
}

/* Smooth Touch Optimization */
button {
  -webkit-tap-highlight-color: transparent;
}
`
  },
  {
    id: 'f-3',
    name: 'script.js',
    path: 'script.js',
    content: `// ── GarStudio Multi-Agent 2D Canvas & Arcade Game Engine ──────────────────────

// ── Web Audio API Synthesizer (Zero External Audio Links) ────────────────────
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(frequency, type = 'sine', duration = 0.1, gainVal = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  jump() {
    this.playTone(520, 'triangle', 0.12, 0.2);
  }

  score() {
    this.playTone(880, 'sine', 0.15, 0.25);
  }

  hit() {
    this.playTone(140, 'sawtooth', 0.25, 0.3);
  }
}

const sounds = new SoundEngine();

// ── 2D Canvas Arcade Engine (Cyber Runner) ───────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let animationFrameId = null;
let lastTime = performance.now();
let fpsTimer = 0;
let frames = 0;

let gameSpeed = 4.0;
let score = 0;
let highScore = parseInt(localStorage.getItem('gs_highscore') || '0', 10);
let isGameOver = false;

// Neon Color Themes
const themes = [
  { name: 'Cyan Neon', player: '#06b6d4', obstacle: '#f43f5e', ground: '#1e293b' },
  { name: 'Emerald Cyber', player: '#10b981', obstacle: '#e11d48', ground: '#134e4a' },
  { name: 'Violet Synth', player: '#a855f7', obstacle: '#f59e0b', ground: '#3b0764' },
];
let currentThemeIdx = 0;

// Player Entity
const player = {
  x: 50,
  y: 0,
  width: 24,
  height: 24,
  vy: 0,
  gravity: 0.55,
  jumpStrength: -10.5,
  groundY: 0,
  isGrounded: false,
};

// Obstacles Array & Particle Burst
let obstacles = [];
let particles = [];
let spawnTimer = 0;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio || 1);
  canvas.height = rect.height * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  player.groundY = rect.height - 35;
  if (player.y > player.groundY - player.height) {
    player.y = player.groundY - player.height;
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function spawnObstacle() {
  const rect = canvas.getBoundingClientRect();
  const h = 20 + Math.random() * 25;
  obstacles.push({
    x: rect.width + 20,
    y: rect.height - 35 - h,
    width: 16 + Math.random() * 10,
    height: h,
    passed: false,
  });
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      radius: 2 + Math.random() * 2,
      alpha: 1.0,
      color,
    });
  }
}

function handleJump() {
  if (isGameOver) {
    resetGame();
    return;
  }
  if (player.isGrounded) {
    player.vy = player.jumpStrength;
    player.isGrounded = false;
    sounds.jump();
  }
}

function resetGame() {
  score = 0;
  obstacles = [];
  particles = [];
  isGameOver = false;
  player.y = player.groundY - player.height;
  player.vy = 0;
  document.getElementById('gameOverScreen')?.classList.add('hidden');
  document.getElementById('gameScore').textContent = '0';
  lastTime = performance.now();
  loop();
}

function endGame() {
  isGameOver = true;
  sounds.hit();
  spawnParticles(player.x + 12, player.y + 12, '#f43f5e');
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('gs_highscore', String(highScore));
    document.getElementById('gameHighScore').textContent = String(highScore);
  }
  document.getElementById('finalScoreDisplay').textContent = String(score);
  document.getElementById('gameOverScreen')?.classList.remove('hidden');
}

// Main 60FPS Game Loop
function loop(now = performance.now()) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // FPS Counter
  frames++;
  fpsTimer += dt;
  if (fpsTimer >= 1.0) {
    document.getElementById('fpsDisplay').textContent = (frames / fpsTimer).toFixed(1);
    frames = 0;
    fpsTimer = 0;
  }

  const rect = canvas.getBoundingClientRect();
  const theme = themes[currentThemeIdx];

  ctx.clearRect(0, 0, rect.width, rect.height);

  // Draw Cyber Grid Horizon
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < rect.width; x += 30) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rect.height);
  }
  ctx.stroke();

  // Draw Ground Line
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, rect.height - 35, rect.width, 35);
  ctx.strokeStyle = theme.player;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, rect.height - 35);
  ctx.lineTo(rect.width, rect.height - 35);
  ctx.stroke();

  if (!isGameOver) {
    // Player Physics
    player.vy += player.gravity;
    player.y += player.vy;

    if (player.y >= player.groundY - player.height) {
      player.y = player.groundY - player.height;
      player.vy = 0;
      player.isGrounded = true;
    }

    // Spawn Obstacles
    spawnTimer += dt;
    if (spawnTimer > 1.8 / (gameSpeed / 4)) {
      spawnObstacle();
      spawnTimer = 0;
    }

    // Update Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= gameSpeed;

      // Score Trigger
      if (!obs.passed && obs.x + obs.width < player.x) {
        obs.passed = true;
        score += 10;
        sounds.score();
        document.getElementById('gameScore').textContent = String(score);
      }

      // Collision Detection (AABB)
      if (
        player.x < obs.x + obs.width &&
        player.x + player.width > obs.x &&
        player.y < obs.y + obs.height &&
        player.y + player.height > obs.y
      ) {
        endGame();
      }

      if (obs.x < -30) {
        obstacles.splice(i, 1);
      }
    }
  }

  // Draw Player
  ctx.fillStyle = theme.player;
  ctx.shadowColor = theme.player;
  ctx.shadowBlur = 10;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.shadowBlur = 0;

  // Draw Obstacles
  ctx.fillStyle = theme.obstacle;
  ctx.shadowColor = theme.obstacle;
  ctx.shadowBlur = 8;
  obstacles.forEach((obs) => {
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  });
  ctx.shadowBlur = 0;

  // Draw Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.025;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  if (!isGameOver) {
    animationFrameId = requestAnimationFrame(loop);
  }
}

// ── Multi-Agent Switching Interface ──────────────────────────────────────────
const agents = {
  gemini: {
    badge: '🟢 GEMINI AGENT',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    btnClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    desc: 'Mengontrol visual Canvas 60FPS real-time, tata letak dinamis, dan palet estetika modern.',
  },
  claude: {
    badge: '🟠 CLAUDE AGENT',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    btnClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    desc: 'Mengoptimalkan arsitektur state machine, akurasi fisika game AABB, dan efisiensi memori.',
  },
  copilot: {
    badge: '🔵 COPILOT AGENT',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    btnClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    desc: 'Melakukan pemantauan FPS real-time, interception error runtime, dan utilitas interaksi cepat.',
  },
};

function setAgent(key) {
  const ag = agents[key];
  if (!ag) return;
  const badge = document.getElementById('agentBadge');
  const desc = document.getElementById('agentDescription');
  if (badge) {
    badge.textContent = ag.badge;
    badge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ' + ag.badgeClass;
  }
  if (desc) desc.textContent = ag.desc;

  ['agentGeminiBtn', 'agentClaudeBtn', 'agentCopilotBtn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.className = 'agent-tab px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition text-[11px] font-semibold text-slate-400';
    }
  });

  const activeBtn = document.getElementById('agent' + key.charAt(0).toUpperCase() + key.slice(1) + 'Btn');
  if (activeBtn) {
    activeBtn.className = 'agent-tab active px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition text-[11px] font-semibold ' + ag.btnClass;
  }
}

// ── Event Listeners ──────────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    handleJump();
  }
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleJump();
});

document.getElementById('touchJumpBtn')?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleJump();
});

document.getElementById('btnPlayAgain')?.addEventListener('click', resetGame);
document.getElementById('gameRestartBtn')?.addEventListener('click', resetGame);

document.getElementById('agentGeminiBtn')?.addEventListener('click', () => setAgent('gemini'));
document.getElementById('agentClaudeBtn')?.addEventListener('click', () => setAgent('claude'));
document.getElementById('agentCopilotBtn')?.addEventListener('click', () => setAgent('copilot'));

document.getElementById('btnPulseColor')?.addEventListener('click', () => {
  currentThemeIdx = (currentThemeIdx + 1) % themes.length;
  sounds.score();
});

document.getElementById('btnSpeedUp')?.addEventListener('click', () => {
  gameSpeed = gameSpeed >= 7.0 ? 4.0 : gameSpeed + 1.0;
  document.getElementById('speedIndicator').textContent = (gameSpeed / 4).toFixed(1) + 'x';
  sounds.jump();
});

document.getElementById('btnSoundChime')?.addEventListener('click', () => {
  sounds.score();
});

document.getElementById('soundToggleBtn')?.addEventListener('click', (e) => {
  sounds.enabled = !sounds.enabled;
  e.target.textContent = sounds.enabled ? '🔊' : '🔇';
});

// Initialize Engine
document.getElementById('gameHighScore').textContent = String(highScore);
loop();
console.log('GarStudio Gemini Canvas & 2D Arcade Engine Loaded.');
`
  },
  {
    id: 'f-4',
    name: 'README.md',
    path: 'README.md',
    content: `# GarStudio Gemini Canvas & 2D Arcade Engine
Proyek berbasis Single-Workspace Persistent dengan arsitektur Multi-Agent Intelligence (🟢 Gemini, 🟠 Claude, 🔵 Copilot) dan Game Engine 2D Canvas 60FPS.
`
  }
]
