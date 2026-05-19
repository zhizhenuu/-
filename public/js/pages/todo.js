function TodoPage(container) {
  const html = `
  <div class="page-enter">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div>
        <h2 class="page-title">📋 待办清单</h2>
        <p class="page-sub">管理你的每日任务</p>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-outline" id="dashboardBtn">📊 看板</button>
        <button class="btn btn-sm btn-outline" id="pomoBtn">🍅 专注</button>
        <button class="btn btn-sm btn-outline" onclick="App.navigate('/memos')">📝 随笔</button>
      </div>
    </div>

    <div class="todo-input-row">
      <input type="text" class="form-input" id="todoInput" placeholder="添加待办事项..." autofocus>
    </div>

    <div class="todo-meta-row">
      <select id="prioritySelect">
        <option value="urgent">🔴 紧急</option>
        <option value="important">🟠 重要</option>
        <option value="normal" selected>🔵 普通</option>
        <option value="low">⚪ 低优先</option>
      </select>
      <select id="categorySelect">
        <option value="">📂 无分类</option>
        <option value="工作">💼 工作</option>
        <option value="学习">📚 学习</option>
        <option value="生活">🏠 生活</option>
        <option value="运动">🏃 运动</option>
        <option value="其他">📌 其他</option>
      </select>
      <input type="date" id="dueDateInput">
      <button class="btn btn-primary" id="addBtn">➕ 添加</button>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-sm btn-outline filter-btn active" data-filter="all">全部</button>
      <button class="btn btn-sm btn-outline filter-btn" data-filter="urgent">🔴 紧急</button>
      <button class="btn btn-sm btn-outline filter-btn" data-filter="today">📅 今天</button>
      <button class="btn btn-sm btn-outline filter-btn" data-filter="archived">🗂️ 归档</button>
      <button class="btn btn-sm btn-text" id="exportBtn">📤 导出</button>
    </div>

    <ul class="todo-list" id="todoList"></ul>
    <div class="empty-hint" id="emptyHint" style="text-align:center;color:var(--text-light);margin-top:60px;display:none">
      <div style="font-size:48px;margin-bottom:12px">✨</div>
      <p>暂无待办，添加一条吧</p>
    </div>

    <div class="todo-bottom-bar" style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
      <div class="todo-stats" id="todoStats" style="font-size:13px;color:var(--text-light)">已完成 0 / 总数 0</div>
      <div style="display:flex;gap:8px">
        <button class="btn-text" id="archiveBtn" style="display:none;color:var(--text-light)">🗂️ 归档已完成</button>
        <button class="btn-text danger" id="clearDoneBtn" style="display:none">🗑️ 清除已完成</button>
      </div>
    </div>
  </div>`;

  container.innerHTML = html;

  // ===== State =====
  let todos = [];
  let currentFilter = 'all';
  let pomoInterval = null;

  // ===== Refs =====
  const input = container.querySelector('#todoInput');
  const prio = container.querySelector('#prioritySelect');
  const cat = container.querySelector('#categorySelect');
  const due = container.querySelector('#dueDateInput');
  const addBtn = container.querySelector('#addBtn');
  const list = container.querySelector('#todoList');
  const stats = container.querySelector('#todoStats');
  const empty = container.querySelector('#emptyHint');
  const clearDone = container.querySelector('#clearDoneBtn');
  const archiveBtn = container.querySelector('#archiveBtn');
  due.value = todayStr();

  // ===== Render =====
  async function render() {
    const q = { archived: currentFilter === 'archived' ? '1' : '0' };
    if (currentFilter === 'urgent') q.category = '';
    if (currentFilter === 'today') q.category = '';

    try { todos = await API.getTodos(q); } catch (e) { showToast('加载失败', 'error'); return; }

    // 过滤
    let filtered = [...todos];
    const today = todayStr();
    if (currentFilter === 'urgent') filtered = filtered.filter(t => t.priority === 'urgent' && !t.done);
    if (currentFilter === 'today') {
      filtered = filtered.filter(t => t.due_date === today || (!t.due_date && !t.done));
    }

    const doneCount = filtered.filter(t => t.done).length;
    list.innerHTML = '';

    if (filtered.length === 0) { empty.style.display = 'block'; }
    else { empty.style.display = 'none'; }

    filtered.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'todo-item';
      li.draggable = true;
      li.dataset.id = todo.id;

      const pMap = { urgent: '🔴', important: '🟠', normal: '🔵', low: '⚪' };

      li.innerHTML = `
        <div class="priority-bar priority-${todo.priority}"></div>
        <span class="todo-checkbox ${todo.done ? 'done' : ''}"></span>
        <div class="todo-body">
          <div class="todo-text ${todo.done ? 'done' : ''}">${esc(todo.text)}</div>
          <div class="todo-meta">
            <span class="tag tag-${todo.priority}">${pMap[todo.priority]||''} ${todo.priority}</span>
            ${todo.category ? `<span class="tag tag-category">${esc(todo.category)}</span>` : ''}
            ${todo.due_date ? `<span class="todo-due">📅 ${fmtDate(todo.due_date)} · ${countdown(todo.due_date)}</span>` : ''}
          </div>
        </div>
        <div class="todo-actions" style="display:flex;gap:4px">
          <button class="btn-sm" data-action="pomo" title="专注25分">🍅</button>
          <button class="btn-sm" data-action="edit" title="编辑">✏️</button>
          <button class="btn-sm danger" data-action="delete" title="删除">🗑️</button>
        </div>
      `;

      // Events
      li.querySelector('.todo-checkbox').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const r = await API.updateTodo(todo.id, { done: todo.done ? 0 : 1 });
          if (r.done && !todo.done) {
            // Check daily checkin
            const user = API.getUser();
            if (user && user.last_checkin !== todayStr()) {
              showToast('🎯 完成待办 +1积分！去签到吧', 'success');
            }
          }
          render();
        } catch (e) { showToast('操作失败', 'error'); }
      });

      li.querySelector('[data-action="pomo"]').addEventListener('click', (e) => {
        e.stopPropagation();
        startPomodoro(todo);
      });

      li.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation();
        startEdit(todo, li);
      });

      li.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        li.classList.add('removing');
        li.addEventListener('animationend', async () => {
          try { await API.deleteTodo(todo.id); render(); }
          catch(e) { showToast('删除失败', 'error'); }
        }, { once: true });
      });

      li.querySelector('.todo-body').addEventListener('click', () => {
        if (!todo.done) showTodoDetail(todo);
      });

      list.appendChild(li);
    });

    stats.textContent = `已完成 ${doneCount} / 总数 ${filtered.length}`;
    clearDone.style.display = doneCount > 0 ? '' : 'none';
    archiveBtn.style.display = filtered.some(t => t.done) ? '' : 'none';

    // Drag & drop sorting
    makeSortable(list, async (orders) => {
      try { await API.batchSort(orders); } catch(e) {}
    });
  }

  // ===== 编辑 =====
  function startEdit(todo, li) {
    const textEl = li.querySelector('.todo-text');
    const ed = document.createElement('input');
    ed.className = 'form-input';
    ed.style.fontSize = '15px';
    ed.style.padding = '4px 8px';
    ed.value = todo.text;
    textEl.replaceWith(ed);
    ed.focus(); ed.select();

    async function finish() {
      const val = ed.value.trim();
      if (val && val !== todo.text) {
        try { await API.updateTodo(todo.id, { text: val }); }
        catch(e) { showToast('编辑失败', 'error'); }
      }
      render();
    }
    ed.addEventListener('blur', finish);
    ed.addEventListener('keydown', e => {
      if (e.key === 'Enter') ed.blur();
      if (e.key === 'Escape') { ed.value = todo.text; ed.blur(); }
    });
  }

  // ===== 添加 =====
  async function addTodo() {
    const text = input.value.trim();
    if (!text) return;
    try {
      await API.addTodo(text, cat.value, due.value, prio.value);
      input.value = ''; input.focus();
      render();
      showToast('已添加 ✅', 'success');
    } catch (e) { showToast('添加失败', 'error'); }
  }

  input.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
  addBtn.addEventListener('click', addTodo);

  // ===== Filters =====
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // ===== 清除已完成 =====
  clearDone.addEventListener('click', async () => {
    try {
      const r = await API.clearDone();
      showToast(`已归档 ${r.count} 项完成待办`, 'success');
      render();
    } catch(e) { showToast('操作失败', 'error'); }
  });

  // ===== 归档已完成 =====
  archiveBtn.addEventListener('click', async () => {
    const doneTodos = todos.filter(t => t.done);
    if (doneTodos.length === 0) return;
    try {
      await API.batchArchive(doneTodos.map(t => t.id));
      showToast(`已归档 ${doneTodos.length} 项`, 'success');
      render();
    } catch(e) { showToast('操作失败', 'error'); }
  });

  // ===== 导出 =====
  container.querySelector('#exportBtn').addEventListener('click', async () => {
    try {
      const all = await API.getTodos({ archived: '0' });
      if (all.length === 0) { showToast('暂无待办可导出', 'info'); return; }

      // Markdown
      let md = '# 待办清单\n\n';
      md += '| 内容 | 优先级 | 分类 | 截止日期 | 状态 |\n';
      md += '|------|--------|------|----------|------|\n';
      all.forEach(t => {
        const status = t.done ? '✅ 已完成' : '⬜ 未完成';
        md += `| ${t.text} | ${t.priority} | ${t.category||'-'} | ${t.due_date||'-'} | ${status} |\n`;
      });

      const blob = new Blob(['\ufeff' + md], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '待办清单_' + todayStr() + '.md';
      a.click();
      URL.revokeObjectURL(url);
      showToast('已导出 Markdown 📤', 'success');
    } catch(e) { showToast('导出失败', 'error'); }
  });

  // ===== 数据看板 =====
  container.querySelector('#dashboardBtn').addEventListener('click', showDashboard);

  async function showDashboard() {
    const content = openModal(`
      <div class="modal-header">
        <h3>📊 数据看板</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="dashboard-grid" id="dashCards">
        <div class="dashboard-card"><div class="dashboard-num">-</div><div class="dashboard-label">待办总数</div></div>
        <div class="dashboard-card"><div class="dashboard-num">-</div><div class="dashboard-label">已完成</div></div>
        <div class="dashboard-card"><div class="dashboard-num">-</div><div class="dashboard-label">紧急未完成</div></div>
        <div class="dashboard-card"><div class="dashboard-num">-</div><div class="dashboard-label">已过期</div></div>
      </div>
      <h4 style="font-size:14px;margin:16px 0 8px">📈 近7天趋势</h4>
      <div id="weeklyChart" style="height:130px"></div>
      <div style="font-size:12px;color:var(--text-light);margin-top:8px;display:flex;gap:16px">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--primary);opacity:.6;margin-right:4px"></span>新增</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--success);margin-right:4px"></span>完成</span>
      </div>
    `);

    try {
      const overview = await API.todoOverview();
      const cards = content.querySelectorAll('.dashboard-num');
      cards[0].textContent = overview.total;
      cards[1].textContent = overview.done;
      cards[2].textContent = overview.urgent;
      cards[3].textContent = overview.expired;

      const weekly = await API.todoWeekly();
      renderChart('weeklyChart', weekly, 'date', 'added', 'added', 100);
      // Also show completed
      const bars = content.querySelectorAll('.chart-bar.added');
      if (bars.length === weekly.length) {
        weekly.forEach((w, i) => {
          const pct = (w.completed / Math.max(...weekly.map(d => d.added), 1) * 100);
          const bar = document.createElement('div');
          bar.className = 'chart-bar completed';
          bar.style.height = Math.max(pct, 2) + '%';
          bars[i].parentElement.appendChild(bar);
        });
      }
    } catch(e) { showToast('加载看板失败', 'error'); }
  }

  // ===== 待办详情弹窗 =====
  function showTodoDetail(todo) {
    openModal(`
      <div class="modal-header">
        <h3>📋 待办详情</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:18px;font-weight:600;margin-bottom:8px">${esc(todo.text)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="tag tag-${todo.priority}">${todo.priority === 'urgent'?'🔴':todo.priority==='important'?'🟠':todo.priority==='normal'?'🔵':'⚪'} ${todo.priority}</span>
          ${todo.category ? `<span class="tag tag-category">${esc(todo.category)}</span>` : ''}
          <span style="font-size:12px;color:var(--text-light)">${todo.done ? '✅ 已完成' : '⬜ 未完成'}</span>
        </div>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.8">
        ${todo.due_date ? `<div>📅 截止日期: ${fmtDate(todo.due_date)} · ${countdown(todo.due_date)}</div>` : ''}
        <div>🕐 创建时间: ${todo.created_at || '-'}</div>
        ${todo.completed_at ? `<div>✅ 完成时间: ${todo.completed_at}</div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-outline" onclick="this.closest('.modal-overlay').remove()">关闭</button>
        <button class="btn btn-sm ${todo.done ? 'btn-outline' : 'btn-primary'}" onclick="(async()=>{await API.updateTodo(${todo.id},{done:${todo.done?0:1}});this.closest('.modal-overlay').remove();App.navigate('/todos')})()">
          ${todo.done ? '⬜ 标记未完成' : '✅ 标记完成'}
        </button>
      </div>
    `);
  }

  // ===== 番茄钟 =====
  function startPomodoro(todo) {
    const minutes = 25;
    const totalSec = minutes * 60;
    let remaining = totalSec;
    if (pomoInterval) clearInterval(pomoInterval);

    const overlay = document.createElement('div');
    overlay.className = 'pomo-overlay';
    overlay.innerHTML = `
      <div class="pomo-modal">
        <div class="pomo-label">🍅 专注计时 · ${esc(todo.text)}</div>
        <div class="pomo-timer" id="pomoDisplay">25:00</div>
        <div class="pomo-progress"><div class="pomo-progress-bar" id="pomoProgress" style="width:100%"></div></div>
        <div class="pomo-actions">
          <button class="btn btn-outline btn-sm" id="pomoPauseBtn">⏸️ 暂停</button>
          <button class="btn btn-danger btn-sm" id="pomoStopBtn">✕ 关闭</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const display = overlay.querySelector('#pomoDisplay');
    const progress = overlay.querySelector('#pomoProgress');
    const pauseBtn = overlay.querySelector('#pomoPauseBtn');
    const stopBtn = overlay.querySelector('#pomoStopBtn');
    let paused = false;

    function updateDisplay() {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      progress.style.width = (remaining / totalSec * 100) + '%';
    }

    pomoInterval = setInterval(() => {
      if (paused) return;
      remaining--;
      updateDisplay();
      if (remaining <= 0) {
        clearInterval(pomoInterval);
        display.textContent = '🎉 时间到！';
        progress.style.width = '0%';
        showToast('🍅 专注完成！休息一下吧', 'success');
        pauseBtn.style.display = 'none';
      }
    }, 1000);

    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? '▶️ 继续' : '⏸️ 暂停';
    });

    stopBtn.addEventListener('click', () => {
      clearInterval(pomoInterval);
      overlay.remove();
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  // ===== Init =====
  // Check expired todos notification
  (async function checkExpired() {
    try {
      const all = await API.getTodos({ archived: '0' });
      const expired = all.filter(t => t.due_date && t.due_date < todayStr() && !t.done);
      if (expired.length > 0) {
        setTimeout(() => {
          showToast(`⚠️ ${expired.length} 项待办已过期！`, 'warn');
        }, 1000);
      }
    } catch(e) {}
  })();

  render();
}
