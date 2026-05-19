// ===== 休闲娱乐页面 =====
function GamesPage(container) {
  // Auth check with redirect
  const user = API.getUser();
  if (!user) { window.location.hash = '#/login'; return; }

  // ===== 高缓存 =====
  const gameHSCache = { ms: 0, snake: 0, shooter: 0 };

  // ===== Difficulty state =====
  const currentDiff = { ms: 'easy' };
  let currentLeaderboard = 'minesweeper';
  let lbSort = 'score';

  // === 第一步：立刻渲染游戏界面，不要任何加载状态 ===
  container.innerHTML = `
  <div class="page-enter">
    <h2 class="page-title">🎮 休闲娱乐</h2>
    <p class="page-sub">工作学习之余放松一下</p>

    <div id="gamesContent">
      <!-- 扫雷 -->
      <div class="game-section" id="gameMinesweeper">
        <div class="game-section-header">
          <h3>💣 经典扫雷</h3>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline mine-diff active" data-game="ms" data-diff="easy">初级 (9×9)</button>
            <button class="btn btn-sm btn-outline mine-diff" data-game="ms" data-diff="medium">中级 (16×16)</button>
            <button class="btn btn-sm btn-outline mine-diff" data-game="ms" data-diff="hard">高级 (30×16)</button>
          </div>
        </div>
        <div class="game-status-bar">
          <div class="game-status-item">💣 <span id="mineCount">10</span></div>
          <div class="game-status-item">⏱️ <span id="mineTimer">000</span></div>
          <div class="game-status-item">🏆 最高 <span id="mineHS">0</span></div>
        </div>
        <div id="mineContainer" class="game-canvas-wrap" style="overflow-x:auto;justify-content:flex-start;padding:8px 12px">
          <div class="mine-grid easy" id="mineGrid"></div>
        </div>
        <div class="game-controls">
          <button class="btn btn-sm btn-primary" id="mineNewBtn">🔄 新局</button>
          <span style="font-size:12px;color:var(--text-light)">左键翻开 · 右键插旗</span>
        </div>
      </div>

      <!-- 贪吃蛇 -->
      <div class="game-section" id="gameSnake">
        <div class="game-section-header">
          <h3>🐍 贪吃蛇</h3>
        </div>
        <div class="game-status-bar">
          <div class="game-status-item">🍎 得分 <span id="snakeScore">0</span></div>
          <div class="game-status-item">⏱️ <span id="snakeTimer">00:00</span></div>
          <div class="game-status-item">🏆 最高 <span id="snakeHS">0</span></div>
          <div class="game-status-item">⚡ 速度 <span id="snakeSpeed">1</span></div>
        </div>
        <div class="game-canvas-wrap" id="snakeWrap">
          <canvas id="snakeCanvas" width="400" height="400"></canvas>
        </div>
        <div class="game-touch-controls" id="snakeTouch">
          <div class="touch-dpad">
            <div class="touch-btn empty"></div>
            <div class="touch-btn up" data-dir="up">⬆️</div>
            <div class="touch-btn empty"></div>
            <div class="touch-btn left" data-dir="left">⬅️</div>
            <div class="touch-btn center">🐍</div>
            <div class="touch-btn right" data-dir="right">➡️</div>
            <div class="touch-btn empty"></div>
            <div class="touch-btn down" data-dir="down">⬇️</div>
            <div class="touch-btn empty"></div>
          </div>
        </div>
        <div class="game-controls">
          <button class="btn btn-sm btn-primary" id="snakeStartBtn">▶️ 开始</button>
          <button class="btn btn-sm btn-outline" id="snakePauseBtn" disabled>⏸️ 暂停</button>
          <span style="font-size:12px;color:var(--text-light)">方向键控制</span>
        </div>
      </div>

      <!-- 雷霆战机 -->
      <div class="game-section" id="gameShooter">
        <div class="game-section-header">
          <h3>🚀 雷霆战机</h3>
        </div>
        <div class="game-status-bar">
          <div class="game-status-item">🎯 得分 <span id="shooterScore">0</span></div>
          <div class="game-status-item">⏱️ <span id="shooterTimer">00:00</span></div>
          <div class="game-status-item">🌊 波次 <span id="shooterWave">0</span></div>
          <div class="game-status-item">🏆 最高 <span id="shooterHS">0</span></div>
          <div class="game-status-item">❤️ <span id="shooterHP">3</span></div>
        </div>
        <div class="game-canvas-wrap" id="shooterWrap">
          <canvas id="shooterCanvas" width="480" height="500"></canvas>
        </div>
        <div class="game-touch-controls" id="shooterTouch">
          <div class="touch-dpad">
            <div class="touch-btn empty"></div>
            <div class="touch-btn up" data-dir="up">⬆️</div>
            <div class="touch-btn empty"></div>
            <div class="touch-btn left" data-dir="left">⬅️</div>
            <div class="touch-btn center">🚀</div>
            <div class="touch-btn right" data-dir="right">➡️</div>
            <div class="touch-btn empty"></div>
            <div class="touch-btn down" data-dir="down">⬇️</div>
            <div class="touch-btn empty"></div>
          </div>
        </div>
        <div class="game-controls">
          <button class="btn btn-sm btn-primary" id="shooterStartBtn">▶️ 开始</button>
          <button class="btn btn-sm btn-outline" id="shooterPauseBtn" disabled>⏸️ 暂停</button>
          <span style="font-size:12px;color:var(--text-light)">方向键移动 · 自动射击</span>
        </div>
      </div>

      <!-- 排行榜 -->
      <div class="leaderboard-section">
        <h3 style="margin-bottom:12px">🏆 全局排行榜</h3>
        <div class="leaderboard-tabs">
          <button class="leaderboard-tab active" data-game="minesweeper">💣 扫雷</button>
          <button class="leaderboard-tab" data-game="snake">🐍 贪吃蛇</button>
          <button class="leaderboard-tab" data-game="shooter">🚀 雷霆战机</button>
        </div>
        <div class="leaderboard-sort">
          <button class="active" data-sort="score">🏅 按分数</button>
          <button data-sort="time">⏱️ 按时长</button>
        </div>
        <div id="leaderboardContent"></div>
      </div>
    </div>
  </div>`;

  // === 第二步：提取 DOM 引用，开始绑定 ===
  const content = container.querySelector('#gamesContent');
  if (!content) { console.error('gamesContent not found'); return; }

  // === 第三步：异步初始化（所有错误都不影响页面渲染） ===
  try {
    initPage();
  } catch(e) { console.error('GamesPage init error:', e); }

  function initPage() {
    try {
      // 绑定游戏事件
      setTimeout(() => {
        try {
          initMinesweeper();
        } catch(e) { console.error('minesweeper init error:', e); }
      }, 50);

      setTimeout(() => {
        try { bindSnake(); } catch(e) { console.error('snake bind error:', e); }
      }, 50);

      setTimeout(() => {
        try { bindShooter(); } catch(e) { console.error('shooter bind error:', e); }
      }, 50);

      setTimeout(() => {
        try {
          bindLeaderboard();
          loadLeaderboard(currentLeaderboard);
        } catch(e) { console.error('leaderboard bind error:', e); }
      }, 50);

      // Difficulty buttons
      content.querySelectorAll('.mine-diff').forEach(btn => {
        btn.addEventListener('click', () => {
          content.querySelectorAll('.mine-diff').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentDiff.ms = btn.dataset.diff;
          clearInterval(mineTimerInterval);
          initMinesweeper();
        });
      });

      // Load HS from API (fire and forget)
      loadGameStats();
    } catch(e) { console.error('initPage error:', e); }
  }

  // ----- 异步数据加载 -----
  async function loadGameStats() {
    try {
      const stats = await API.getGameStats();
      stats.forEach(s => {
        if (s.game_type === 'minesweeper') { gameHSCache.ms = s.high_score; }
        if (s.game_type === 'snake') { gameHSCache.snake = s.high_score; }
        if (s.game_type === 'shooter') { gameHSCache.shooter = s.high_score; }
      });
      ['mineHS','snakeHS','shooterHS'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const key = id === 'mineHS' ? 'ms' : id === 'snakeHS' ? 'snake' : 'shooter';
          el.textContent = gameHSCache[key];
        }
      });
    } catch(e) { /* silently ignore - HS display defaults to 0 */ }
  }

  // ===== Score Float =====
  function showScoreFloat(score, x, y) {
    const el = document.createElement('div');
    el.className = 'score-float';
    el.textContent = '+' + score;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ===== Submit Game =====
  async function submitGame(type, score, duration, won, difficulty) {
    try {
      const r = await API.submitGameResult({
        game_type: type, score: Math.round(score),
        duration: Math.round(duration), won, difficulty
      });
      // Update cache
      if (score > (gameHSCache[type==='minesweeper'?'ms':'snake']||0) && type !== 'shooter' && type !== 'snake' && type !== 'minesweeper') {}
      if (type === 'minesweeper' && score > gameHSCache.ms) gameHSCache.ms = score;
      if (type === 'snake' && score > gameHSCache.snake) gameHSCache.snake = score;
      if (type === 'shooter' && score > gameHSCache.shooter) gameHSCache.shooter = score;
      return r;
    } catch(e) { return { points_earned: 0 }; }
  }

  // ==========================
  //  扫 雷
  // ==========================
  let mineGrid = [];
  let mineRevealed = [];
  let mineFlagged = [];
  let mineGameOver = false;
  let mineFirstClick = true;
  let mineTimerInterval = null;
  let mineTimer = 0;
  const mineDims = { easy: [9,9,10], medium: [16,16,40], hard: [30,16,99] };

  function initMinesweeper() {
    const diff = currentDiff.ms;
    const [w, h, mines] = mineDims[diff];
    const grid = document.getElementById('mineGrid');
    const container = document.getElementById('mineContainer');
    if (!grid) return;

    clearInterval(mineTimerInterval);
    mineTimer = 0;
    mineGameOver = false;
    mineFirstClick = true;
    mineRevealed = [];
    mineFlagged = [];

    grid.className = 'mine-grid ' + (diff === 'hard' ? 'hard' : diff === 'medium' ? '' : 'easy');
    grid.style.gridTemplateColumns = 'repeat(' + w + ',1fr)';
    grid.style.gridTemplateRows = 'repeat(' + h + ',1fr)';

    mineGrid = Array.from({ length: h }, () => Array(w).fill(0));
    mineRevealed = Array.from({ length: h }, () => Array(w).fill(false));
    mineFlagged = Array.from({ length: h }, () => Array(w).fill(false));

    grid.innerHTML = '';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.textContent = '';
        grid.appendChild(cell);
      }
    }

    document.getElementById('mineCount').textContent = mines;
    document.getElementById('mineTimer').textContent = '000';

    // Events
    grid.querySelectorAll('.mine-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        if (mineGameOver) return;
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        if (mineFlagged[y][x]) return;
        if (mineRevealed[y][x]) return;
        if (mineFirstClick) { placeMines(w, h, mines, x, y); mineFirstClick = false; startMineTimer(); }
        revealCell(x, y, w, h);
      });

      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (mineGameOver) return;
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        if (mineRevealed[y][x]) return;
        mineFlagged[y][x] = !mineFlagged[y][x];
        renderMines(w, h);
        const flagged = mineFlagged.flat().filter(Boolean).length;
        document.getElementById('mineCount').textContent = mines - flagged;
      });
    });
  }

  function placeMines(w, h, mines, cx, cy) {
    let placed = 0;
    while (placed < mines) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);
      if (x === cx && y === cy) continue;
      if (mineGrid[y][x] === -1) continue;
      mineGrid[y][x] = -1;
      placed++;
      // Increment adjacent
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && mineGrid[ny][nx] !== -1) {
            mineGrid[ny][nx]++;
          }
        }
      }
    }
  }

  function revealCell(x, y, w, h) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    if (mineRevealed[y][x] || mineFlagged[y][x]) return;
    mineRevealed[y][x] = true;

    if (mineGrid[y][x] === -1) {
      // BOOM
      mineGameOver = true;
      clearInterval(mineTimerInterval);
      revealAllMines(w, h);
      const el = document.querySelector(`.mine-cell[data-x="${x}"][data-y="${y}"]`);
      if (el) { el.classList.add('exploded'); el.classList.add('explode-anim'); el.textContent = '💥'; }
      setTimeout(() => showMineGameOver(false), 600);
      return;
    }

    if (mineGrid[y][x] === 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          revealCell(x + dx, y + dy, w, h);
        }
      }
    }

    renderMines(w, h);
    checkMineWin(w, h);
  }

  function revealAllMines(w, h) {
    const cells = document.querySelectorAll('.mine-cell');
    cells.forEach(cell => {
      const x = parseInt(cell.dataset.x);
      const y = parseInt(cell.dataset.y);
      if (mineGrid[y][x] === -1) {
        cell.classList.add('mine');
        cell.textContent = '💣';
      }
    });
  }

  function checkMineWin(w, h) {
    const totalCells = w * h;
    const [,, mines] = mineDims[currentDiff.ms];
    const revealed = mineRevealed.flat().filter(Boolean).length;
    if (revealed === totalCells - mines) {
      mineGameOver = true;
      clearInterval(mineTimerInterval);
      // Flag remaining mines
      const cells = document.querySelectorAll('.mine-cell');
      cells.forEach(cell => {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        if (mineGrid[y][x] === -1) {
          cell.classList.add('flagged');
          cell.textContent = '🚩';
        }
      });
      setTimeout(() => showMineGameOver(true), 400);
    }
  }

  function renderMines(w, h) {
    const cells = document.querySelectorAll('.mine-cell');
    cells.forEach(cell => {
      const x = parseInt(cell.dataset.x);
      const y = parseInt(cell.dataset.y);
      cell.className = 'mine-cell';
      if (mineRevealed[y][x]) {
        cell.classList.add('revealed');
        if (mineGrid[y][x] > 0) {
          cell.textContent = mineGrid[y][x];
          cell.classList.add('num-' + mineGrid[y][x]);
        } else if (mineGrid[y][x] === 0) {
          cell.textContent = '';
        }
      } else if (mineFlagged[y][x]) {
        cell.classList.add('flagged');
        cell.textContent = '🚩';
      }
    });
  }

  function startMineTimer() {
    clearInterval(mineTimerInterval);
    mineTimer = 0;
    mineTimerInterval = setInterval(() => {
      mineTimer++;
      const el = document.getElementById('mineTimer');
      if (el) el.textContent = String(mineTimer).padStart(3, '0');
      if (mineTimer >= 999) clearInterval(mineTimerInterval);
    }, 1000);
  }

  function showMineGameOver(won) {
    const time = mineTimer;
    const [,, mines] = mineDims[currentDiff.ms];
    let score = won ? Math.max(100, (mines * 1000) / Math.max(time, 1)) : 0;
    score = Math.round(score);
    const pointsEarned = won ? Math.max(5, Math.floor(score / 100)) : 0;

    if (won) gameHSCache.ms = Math.max(gameHSCache.ms, score);
    submitGame('minesweeper', score, time, won, currentDiff.ms);

    const grid = document.getElementById('mineGrid');
    const wrap = grid?.closest('.game-canvas-wrap');
    const overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';
    overlay.innerHTML = `
      <div class="game-over-box">
        <div class="game-over-title">${won ? '🎉 通关！' : '💥 踩雷了'}</div>
        ${won ? `<div class="game-over-score">${score}</div>` : '<div style="font-size:16px;color:var(--text-light);margin:8px 0">再接再厉！</div>'}
        <div class="game-over-stats">
          <div>⏱️ <span>${time}s</span></div>
          <div>💣 <span>${mines}个</span></div>
        </div>
        ${won ? `<div class="game-over-points">+${pointsEarned} 积分</div>` : ''}
        <button class="btn btn-primary btn-sm" onclick="this.closest('.game-over-overlay').remove();document.getElementById('mineNewBtn')?.click()">🔄 再来一局</button>
      </div>
    `;
    if (wrap) wrap.appendChild(overlay);

    // Update HS display
    const hsEl = document.getElementById('mineHS');
    if (hsEl) hsEl.textContent = gameHSCache.ms;
    loadLeaderboard(currentLeaderboard);
  }

  // Minesweeper new button
  document.addEventListener('click', (e) => {
    if (e.target.id === 'mineNewBtn') {
      clearInterval(mineTimerInterval);
      // Remove any overlays
      document.querySelectorAll('.game-over-overlay').forEach(el => el.remove());
      initMinesweeper();
    }
  });

  // ==========================
  //  贪 吃 蛇
  // ==========================
  let snakeGame = null;
  let snakeAnimId = null;

  function bindSnake() {
    const canvas = document.getElementById('snakeCanvas');
    const startBtn = document.getElementById('snakeStartBtn');
    const pauseBtn = document.getElementById('snakePauseBtn');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    const cols = 20;
    const rows = 20;
    let snake = [];
    let food = { x: 8, y: 8 };
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let score = 0;
    let running = false;
    let paused = false;
    let gameTimer = 0;
    let timerInterval = null;
    let gameOver = false;
    let speed = 150;
    let ateCount = 0;

    function resetSnake() {
      snake = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score = 0;
      speed = 150;
      ateCount = 0;
      gameTimer = 0;
      gameOver = false;
      paused = false;
      pauseBtn.textContent = '⏸️ 暂停';
      pauseBtn.disabled = false;
      placeFood();
      updateSnakeUI();
    }

    function placeFood() {
      while (true) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);
        if (!snake.some(s => s.x === x && s.y === y)) {
          food = { x, y };
          return;
        }
      }
    }

    function updateSnakeUI() {
      document.getElementById('snakeScore').textContent = score;
      document.getElementById('snakeSpeed').textContent = Math.min(10, Math.floor(ateCount / 3) + 1);
      document.getElementById('snakeTimer').textContent =
        String(Math.floor(gameTimer / 60)).padStart(2,'0') + ':' + String(gameTimer % 60).padStart(2,'0');
    }

    function drawSnake() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cellSize = canvas.width / cols;

      // Grid bg
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Grid lines
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= cols; i++) {
        ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(canvas.width, i * cellSize); ctx.stroke();
      }

      // Food
      ctx.fillStyle = '#ff4757';
      ctx.beginPath();
      ctx.arc(food.x * cellSize + cellSize/2, food.y * cellSize + cellSize/2, cellSize/2 - 2, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#ff6b81';
      ctx.beginPath();
      ctx.arc(food.x * cellSize + cellSize/2 - 2, food.y * cellSize + cellSize/2 - 2, 3, 0, Math.PI*2);
      ctx.fill();

      // Snake
      snake.forEach((seg, i) => {
        const ratio = 1 - (i / snake.length) * 0.5;
        const g = Math.round(200 * ratio);
        ctx.fillStyle = i === 0 ? '#27ae60' : `rgb(39, ${g}, 80)`;
        const pad = 1;
        ctx.fillRect(seg.x * cellSize + pad, seg.y * cellSize + pad, cellSize - pad*2, cellSize - pad*2);
        ctx.strokeStyle = '#1a7a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(seg.x * cellSize + pad, seg.y * cellSize + pad, cellSize - pad*2, cellSize - pad*2);
        // Eyes on head
        if (i === 0) {
          ctx.fillStyle = '#fff';
          const ex = seg.x * cellSize + (dir.x === 1 ? cellSize-8 : dir.x === -1 ? 8 : cellSize/2-2);
          const ey = seg.y * cellSize + (dir.y === 1 ? cellSize-8 : dir.y === -1 ? 8 : cellSize/2-2);
          ctx.fillRect(ex, ey, 4, 4);
        }
      });
    }

    function gameLoop() {
      if (paused || gameOver) return;
      if (!running) { snakeAnimId = requestAnimationFrame(gameLoop); return; }

      // Apply direction
      dir = { ...nextDir };

      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // Wall collision
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        endSnakeGame(false);
        return;
      }
      // Self collision
      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        endSnakeGame(false);
        return;
      }

      snake.unshift(head);

      // Eat food
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        ateCount++;
        if (ateCount % 3 === 0 && speed > 60) speed -= 10;
        placeFood();
        const rect = canvas.getBoundingClientRect();
        showScoreFloat(10, rect.left + Math.random() * 200, rect.top + Math.random() * 200);
      } else {
        snake.pop();
      }

      updateSnakeUI();
      drawSnake();

      // Check if snake fills the board (win)
      if (snake.length === cols * rows) {
        endSnakeGame(true);
        return;
      }

      snakeAnimId = setTimeout(() => gameLoop(), speed);
    }

    function endSnakeGame(won) {
      if (gameOver) return;
      gameOver = true;
      running = false;
      clearInterval(timerInterval);
      startBtn.textContent = '▶️ 开始';
      pauseBtn.disabled = true;

      const finalScore = score;
      if (finalScore > gameHSCache.snake) gameHSCache.snake = finalScore;

      submitGame('snake', finalScore, gameTimer, won, 'normal');

      const rect = canvas.getBoundingClientRect();
      const wrap = document.getElementById('snakeWrap');
      const overlay = document.createElement('div');
      overlay.className = 'game-over-overlay';
      overlay.innerHTML = `
        <div class="game-over-box">
          <div class="game-over-title">${won ? '🎉 完美通关！' : '💀 游戏结束'}</div>
          <div class="game-over-score">${finalScore}</div>
          <div class="game-over-stats">
            <div>🐍 长度 <span>${snake.length}</span></div>
            <div>⏱️ <span>${gameTimer}s</span></div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="this.closest('.game-over-overlay').remove();document.getElementById('snakeStartBtn')?.click()">🔄 再来一局</button>
        </div>
      `;
      if (wrap) wrap.appendChild(overlay);

      document.getElementById('snakeHS').textContent = gameHSCache.snake;
      loadLeaderboard(currentLeaderboard);
    }

    function startSnake() {
      resetSnake();
      drawSnake();
      running = true;
      startBtn.textContent = '⏹️ 进行中';
      pauseBtn.disabled = false;
      gameTimer = 0;
      clearInterval(timerInterval);
      timerInterval = setInterval(() => { if (!paused && running) { gameTimer++; updateSnakeUI(); } }, 1000);
      clearTimeout(snakeAnimId);
      cancelAnimationFrame(snakeAnimId);
      gameLoop();
    }

    startBtn.addEventListener('click', () => {
      // Remove overlays
      document.querySelectorAll('#snakeWrap .game-over-overlay').forEach(el => el.remove());
      if (gameOver) { startSnake(); return; }
      if (!running) {
        startSnake();
      } else {
        // Restart
        clearInterval(timerInterval);
        gameOver = true; running = false;
        startSnake();
      }
    });

    pauseBtn.addEventListener('click', () => {
      if (!running) return;
      paused = !paused;
      pauseBtn.textContent = paused ? '▶️ 继续' : '⏸️ 暂停';
      if (!paused) gameLoop();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!running) return;
      const k = e.key;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) e.preventDefault();
      if (k === 'ArrowUp' && dir.y !== 1) nextDir = { x: 0, y: -1 };
      if (k === 'ArrowDown' && dir.y !== -1) nextDir = { x: 0, y: 1 };
      if (k === 'ArrowLeft' && dir.x !== 1) nextDir = { x: -1, y: 0 };
      if (k === 'ArrowRight' && dir.x !== -1) nextDir = { x: 1, y: 0 };
    });

    // Touch
    document.querySelectorAll('#snakeTouch .touch-btn[data-dir]').forEach(btn => {
      const dir = btn.dataset.dir;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!running) return;
        if (dir === 'up' && snake[0] && snake[0].y !== undefined && nextDir.y !== 1) nextDir = { x: 0, y: -1 };
        if (dir === 'down' && nextDir.y !== -1) nextDir = { x: 0, y: 1 };
        if (dir === 'left' && nextDir.x !== 1) nextDir = { x: -1, y: 0 };
        if (dir === 'right' && nextDir.x !== -1) nextDir = { x: 1, y: 0 };
      });
      btn.addEventListener('click', (e) => {
        if (!running) return;
        if (dir === 'up' && nextDir.y !== 1) nextDir = { x: 0, y: -1 };
        if (dir === 'down' && nextDir.y !== -1) nextDir = { x: 0, y: 1 };
        if (dir === 'left' && nextDir.x !== 1) nextDir = { x: -1, y: 0 };
        if (dir === 'right' && nextDir.x !== -1) nextDir = { x: 1, y: 0 };
      });
    });

    // Swipe detection on canvas
    let touchStartX = 0, touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
      if (!running) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && nextDir.x !== -1) nextDir = { x: 1, y: 0 };
        else if (dx < 0 && nextDir.x !== 1) nextDir = { x: -1, y: 0 };
      } else {
        if (dy > 0 && nextDir.y !== -1) nextDir = { x: 0, y: 1 };
        else if (dy < 0 && nextDir.y !== 1) nextDir = { x: 0, y: -1 };
      }
    }, { passive: true });

    resetSnake();
    drawSnake();
  }

  // ==========================
  //  雷 霆 战 机
  // ==========================
  function bindShooter() {
    const canvas = document.getElementById('shooterCanvas');
    const startBtn = document.getElementById('shooterStartBtn');
    const pauseBtn = document.getElementById('shooterPauseBtn');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    let player, bullets, enemies, enemyBullets;
    let score = 0, wave = 1, hp = 3;
    let running = false, paused = false, gameOver = false;
    let keys = {};
    let gameTimer = 0;
    let timerInterval = null;
    let lastShot = 0;
    let waveSpawned = 0;
    let spawnTimer = 0;

    // Stars
    let stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.5, sp: Math.random() * 1 + 0.3
    }));

    function resetShooter() {
      player = { x: W/2, y: H - 60, w: 32, h: 32, speed: 5 };
      bullets = [];
      enemies = [];
      enemyBullets = [];
      score = 0;
      wave = 1;
      hp = 3;
      gameTimer = 0;
      gameOver = false;
      paused = false;
      keys = {};
      waveSpawned = 0;
      spawnTimer = 0;
      pauseBtn.textContent = '⏸️ 暂停';
      pauseBtn.disabled = false;
      updateShooterUI();
    }

    function updateShooterUI() {
      document.getElementById('shooterScore').textContent = score;
      document.getElementById('shooterWave').textContent = wave;
      document.getElementById('shooterHP').textContent = hp;
      document.getElementById('shooterTimer').textContent =
        String(Math.floor(gameTimer / 60)).padStart(2,'0') + ':' + String(gameTimer % 60).padStart(2,'0');
    }

    function spawnEnemies() {
      const count = Math.min(3 + wave, 10);
      const cols = Math.min(count, 8);
      const spacing = (W - 40) / cols;
      for (let i = 0; i < Math.min(count, cols); i++) {
        enemies.push({
          x: 20 + i * spacing, y: -20 - Math.random() * 40,
          w: 30, h: 24, hp: 1,
          speed: 0.4 + wave * 0.08 + Math.random() * 0.3,
          shootTimer: 0,
          shootInterval: Math.max(40, 80 - wave * 3)
        });
      }
      // Extra enemies on sides for higher waves
      if (wave > 3) {
        for (let i = 0; i < Math.min(wave - 2, 3); i++) {
          enemies.push({
            x: Math.random() * (W - 60) + 30, y: -40 - Math.random() * 60,
            w: 24, h: 20, hp: 1,
            speed: 0.6 + wave * 0.1 + Math.random() * 0.4,
            shootTimer: 0,
            shootInterval: Math.max(30, 60 - wave * 2)
          });
        }
      }
      waveSpawned++;
    }

    function drawShooter() {
      ctx.clearRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      stars.forEach(s => {
        ctx.fillRect(s.x, s.y, s.s, s.s);
        s.y += s.sp;
        if (s.y > H) { s.y = -5; s.x = Math.random() * W; }
      });

      // Player ship (triangle)
      ctx.fillStyle = '#165DFF';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 18);
      ctx.lineTo(player.x - 18, player.y + 10);
      ctx.lineTo(player.x + 18, player.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a8cff';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 12);
      ctx.lineTo(player.x - 10, player.y + 6);
      ctx.lineTo(player.x + 10, player.y + 6);
      ctx.closePath();
      ctx.fill();

      // Engine glow
      ctx.fillStyle = '#ff6b35';
      const flicker = Math.random() * 4 + 2;
      ctx.fillRect(player.x - 4, player.y + 10, 3, 6 + flicker);
      ctx.fillRect(player.x + 2, player.y + 10, 3, 6 + flicker);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(player.x - 3, player.y + 10, 1, 3 + flicker * 0.5);
      ctx.fillRect(player.x + 3, player.y + 10, 1, 3 + flicker * 0.5);

      // Player bullets
      ctx.fillStyle = '#00ff88';
      bullets.forEach(b => {
        ctx.fillRect(b.x - 2, b.y - 6, 4, 10);
      });

      // Enemies
      enemies.forEach(e => {
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + 12);
        ctx.lineTo(e.x - 15, e.y - 10);
        ctx.lineTo(e.x + 15, e.y - 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff6b81';
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + 8);
        ctx.lineTo(e.x - 8, e.y - 6);
        ctx.lineTo(e.x + 8, e.y - 6);
        ctx.closePath();
        ctx.fill();
        // Enemy glow
        ctx.fillStyle = '#ff4757';
        ctx.fillRect(e.x - 3, e.y + 12, 6, 4 + Math.random() * 2);
      });

      // Enemy bullets
      ctx.fillStyle = '#ffaa00';
      enemyBullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(b.x - 1, b.y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffaa00';
      });

      // HP bar
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < hp ? '#f53f3f' : '#e0e0e0';
        ctx.fillRect(W - 80 + i * 22, 10, 18, 14);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.strokeRect(W - 80 + i * 22, 10, 18, 14);
      }

      // Score / Wave display
      ctx.fillStyle = '#333';
      ctx.font = '14px sans-serif';
      ctx.fillText('🎯 ' + score + '  🌊 ' + wave, 10, 22);
    }

    function shootBullet() {
      bullets.push({ x: player.x, y: player.y - 18 });
    }

    function updateShooter() {
      if (paused || gameOver || !running) return;

      // Player movement
      if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
      if (keys['ArrowRight'] || keys['d']) player.x += player.speed;
      if (keys['ArrowUp'] || keys['w']) player.y -= player.speed;
      if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
      player.x = Math.max(20, Math.min(W - 20, player.x));
      player.y = Math.max(40, Math.min(H - 20, player.y));

      // Auto fire
      const now = Date.now();
      if (now - lastShot > 200) {
        shootBullet();
        lastShot = now;
      }

      // Move bullets
      bullets = bullets.filter(b => {
        b.y -= 8;
        return b.y > -10;
      });

      // Spawn waves
      if (enemies.length === 0 && waveSpawned < 5) {
        spawnEnemies();
      }
      if (waveSpawned >= 5 && enemies.length === 0) {
        wave++;
        waveSpawned = 0;
        updateShooterUI();
        // Healing bonus on wave completion
        hp = Math.min(3, hp + 1);
        updateShooterUI();
        showScoreFloat(wave * 5, player.x, player.y - 40);
      }

      // Move enemies
      enemies.forEach(e => {
        e.y += e.speed;
        e.shootTimer++;
        // Shoot
        if (e.shootTimer >= e.shootInterval) {
          e.shootTimer = 0;
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          enemyBullets.push({ x: e.x, y: e.y + 12, vx: (dx/dist)*2, vy: (dy/dist)*2 });
        }
      });

      // Bullet-enemy collision
      bullets = bullets.filter(b => {
        let hit = false;
        enemies = enemies.filter(e => {
          if (b.x > e.x - 15 && b.x < e.x + 15 && b.y > e.y - 12 && b.y < e.y + 12) {
            hit = true;
            score += 10;
            updateShooterUI();
            const rect = canvas.getBoundingClientRect();
            showScoreFloat(10, rect.left + e.x, rect.top + e.y - 20);
            return false;
          }
          return true;
        });
        return !hit;
      });

      // Enemy bullets - player collision
      enemyBullets = enemyBullets.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x > player.x - 15 && b.x < player.x + 15 && b.y > player.y - 15 && b.y < player.y + 15) {
          hp--;
          updateShooterUI();
          if (hp <= 0) {
            endShooterGame();
          }
          return false;
        }
        return b.y < H + 10;
      });

      // Remove enemies that go off-screen
      enemies = enemies.filter(e => e.y < H + 30);

      drawShooter();
    }

    function endShooterGame() {
      gameOver = true;
      running = false;
      clearInterval(timerInterval);
      startBtn.textContent = '▶️ 开始';
      pauseBtn.disabled = true;

      const finalScore = score;
      if (finalScore > gameHSCache.shooter) gameHSCache.shooter = finalScore;

      submitGame('shooter', finalScore, gameTimer, false, 'wave' + wave);

      const wrap = document.getElementById('shooterWrap');
      const overlay = document.createElement('div');
      overlay.className = 'game-over-overlay';
      overlay.innerHTML = `
        <div class="game-over-box">
          <div class="game-over-title">💥 战机坠毁</div>
          <div class="game-over-score">${finalScore}</div>
          <div class="game-over-stats">
            <div>🌊 波次 <span>${wave}</span></div>
            <div>⏱️ <span>${gameTimer}s</span></div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="this.closest('.game-over-overlay').remove();document.getElementById('shooterStartBtn')?.click()">🔄 再来一局</button>
        </div>
      `;
      if (wrap) wrap.appendChild(overlay);

      document.getElementById('shooterHS').textContent = gameHSCache.shooter;
      loadLeaderboard(currentLeaderboard);
    }

    function shooterLoop() {
      updateShooter();
      if (!gameOver) requestAnimationFrame(shooterLoop);
    }

    function startShooter() {
      resetShooter();
      drawShooter();
      running = true;
      startBtn.textContent = '⏹️ 进行中';
      pauseBtn.disabled = false;
      gameTimer = 0;
      clearInterval(timerInterval);
      timerInterval = setInterval(() => { if (!paused && running) { gameTimer++; updateShooterUI(); } }, 1000);
      shooterLoop();
    }

    startBtn.addEventListener('click', () => {
      document.querySelectorAll('#shooterWrap .game-over-overlay').forEach(el => el.remove());
      if (gameOver) { startShooter(); return; }
      if (!running) startShooter();
      else { clearInterval(timerInterval); gameOver = true; running = false; startShooter(); }
    });

    pauseBtn.addEventListener('click', () => {
      if (!running) return;
      paused = !paused;
      pauseBtn.textContent = paused ? '▶️ 继续' : '⏸️ 暂停';
    });

    document.addEventListener('keydown', (e) => {
      keys[e.key] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => { keys[e.key] = false; });

    // Touch controls
    document.querySelectorAll('#shooterTouch .touch-btn[data-dir]').forEach(btn => {
      const dir = btn.dataset.dir;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['Arrow' + dir.charAt(0).toUpperCase() + dir.slice(1)] = true;
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['Arrow' + dir.charAt(0).toUpperCase() + dir.slice(1)] = false;
      });
    });

    drawShooter();
  }

  // ==========================
  //  排 行 榜
  // ==========================
  function bindLeaderboard() {
    content.querySelectorAll('.leaderboard-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        content.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentLeaderboard = tab.dataset.game;
        loadLeaderboard(currentLeaderboard);
      });
    });
    content.querySelectorAll('.leaderboard-sort button').forEach(btn => {
      btn.addEventListener('click', () => {
        content.querySelectorAll('.leaderboard-sort button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        lbSort = btn.dataset.sort;
        loadLeaderboard(currentLeaderboard);
      });
    });
  }

  async function loadLeaderboard(game) {
    const el = document.getElementById('leaderboardContent');
    if (!el) return;
    try {
      const rows = await API.gameLeaderboard(game, lbSort);
      if (rows.length === 0) {
        el.innerHTML = '<p style="font-size:13px;color:var(--text-light);text-align:center;padding:20px">暂无游戏记录，快来玩一局吧！</p>';
        return;
      }
      el.innerHTML = rows.map((r, i) => `
        <div class="leaderboard-item ${r.username === (API.getUser()||{}).username ? 'me' : ''}">
          <div class="leaderboard-rank ${i < 3 ? ['gold','silver','bronze'][i] : ''}">${i + 1}</div>
          <div class="leaderboard-name">${esc(r.nickname || r.username)}</div>
          <div class="leaderboard-score">${r.high_score}</div>
          <div class="leaderboard-meta">
            ${r.best_time ? '⏱️ ' + r.best_time + 's' : ''}
            ${lbSort === 'time' ? '🕐 ' + formatDuration(r.total_play_time) : ''}
            <br>${r.total_games}局 ${r.total_wins}胜
          </div>
        </div>
      `).join('');
    } catch(e) {
      el.innerHTML = '<p style="color:var(--danger);font-size:13px">加载失败</p>';
    }
  }

  function formatDuration(sec) {
    if (!sec) return '0m';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? m + 'm' + s + 's' : s + 's';
  }
}
