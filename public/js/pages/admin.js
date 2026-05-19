function AdminPage(container) {
  container.innerHTML = `
  <div class="page-enter">
    <h2 class="page-title">🛡️ 后台管理</h2>
    <p class="page-sub">系统数据大盘 · 用户管理 · 操作审计</p>

    <div class="admin-tabs">
      <button class="admin-tab active" data-tab="dashboard">📊 数据大盘</button>
      <button class="admin-tab" data-tab="users">👥 用户管理</button>
      <button class="admin-tab" data-tab="games">🎮 游戏数据</button>
      <button class="admin-tab" data-tab="logs">📋 操作日志</button>
      <button class="admin-tab" data-tab="announce">📢 系统公告</button>
      <button class="admin-tab" data-tab="export">📤 数据导出</button>
    </div>

    <div id="adminContent"></div>
  </div>`;

  const tabs = container.querySelectorAll('.admin-tab');
  const content = container.querySelector('#adminContent');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const t = tab.dataset.tab;
      if (t === 'dashboard') renderDashboard();
      else if (t === 'users') renderUsers();
      else if (t === 'logs') renderLogs();
      else if (t === 'announce') renderAnnounce();
      else if (t === 'export') renderExport();
      else if (t === 'games') renderGames();
    });
  });

  renderDashboard();

  // ===== Dashboard =====
  async function renderDashboard() {
    content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)">加载中...</div>';
    try {
      const d = await API.adminDashboard();
      content.innerHTML = `
        <div class="admin-section">
          <h3>📊 数据大盘</h3>
          <div class="dashboard-big-cards">
            <div class="dashboard-big-card"><div class="dashboard-big-num">${d.totalUsers}</div><div class="dashboard-big-label">注册用户</div></div>
            <div class="dashboard-big-card"><div class="dashboard-big-num">${d.totalTodos}</div><div class="dashboard-big-label">待办总数</div></div>
            <div class="dashboard-big-card"><div class="dashboard-big-num">${d.totalDone}</div><div class="dashboard-big-label">已完成</div></div>
            <div class="dashboard-big-card"><div class="dashboard-big-num">${d.totalResumes}</div><div class="dashboard-big-label">简历总数</div></div>
            <div class="dashboard-big-card"><div class="dashboard-big-num">${d.totalMemos}</div><div class="dashboard-big-label">备忘录</div></div>
            <div class="dashboard-big-card"><div class="dashboard-big-num">${d.activeToday}</div><div class="dashboard-big-label">今日活跃</div></div>
            <div class="dashboard-big-card"><div class="dashboard-big-num">${d.totalLogs}</div><div class="dashboard-big-label">操作日志</div></div>
          </div>
        </div>
        <div class="admin-section">
          <h3>维护操作</h3>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline" id="cleanupBtn">🗑️ 批量清理（归档待办+30天前日志）</button>
          </div>
        </div>
      `;
      content.querySelector('#cleanupBtn').addEventListener('click', async () => {
        if (!confirm('确定要清理数据？')) return;
        try {
          const r = await API.adminCleanup();
          showToast(`已清理：归档待办 ${r.archivedTodosRemoved}条，旧日志 ${r.oldLogsRemoved}条`, 'success');
          renderDashboard();
        } catch(e) { showToast('清理失败', 'error'); }
      });
    } catch(e) { content.innerHTML = '<p style="color:var(--danger)">加载失败</p>'; }
  }

  // ===== Users =====
  async function renderUsers() {
    content.innerHTML = `
      <div class="admin-section">
        <h3>👥 用户列表</h3>
        <div style="overflow-x:auto">
          <table class="admin-table">
            <thead><tr>
              <th>ID</th><th>用户名</th><th>昵称</th><th>角色</th><th>状态</th><th>积分</th><th>签到</th><th>待办</th><th>注册时间</th><th>操作</th>
            </tr></thead>
            <tbody id="userTableBody"><tr><td colspan="10" style="text-align:center;color:var(--text-light)">加载中...</td></tr></tbody>
          </table>
        </div>
      </div>
      <div id="userDetail"></div>
    `;
    try {
      const users = await API.adminUsers();
      const tbody = content.querySelector('#userTableBody');
      tbody.innerHTML = users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td><strong>${esc(u.username)}</strong></td>
          <td>${esc(u.nickname||'-')}</td>
          <td>${u.is_admin ? '<span class="badge-admin" style="font-size:11px">管理员</span>' : '<span class="badge-user" style="font-size:11px">用户</span>'}</td>
          <td>${u.disabled ? '<span style="color:var(--danger)">🚫 禁用</span>' : '<span style="color:var(--success)">✅ 正常</span>'}</td>
          <td>${u.points}</td>
          <td>${u.streak_days}天</td>
          <td>${u.todo_count}</td>
          <td style="font-size:12px">${u.created_at||'-'}</td>
          <td style="white-space:nowrap">
            <button class="btn-sm" onclick="adminViewTodos(${u.id},'${esc(u.username)}')">📋</button>
            ${!u.is_admin ? `
              <button class="btn-sm" onclick="adminToggleUser(${u.id})">${u.disabled ? '🔓' : '🔒'}</button>
              <button class="btn-sm" onclick="adminResetPwd(${u.id})">🔑</button>
              <button class="btn-sm danger" onclick="adminDeleteUser(${u.id},'${esc(u.username)}')">🗑️</button>
            ` : ''}
          </td>
        </tr>
      `).join('');

      // Attach globals
      window.adminViewTodos = async function(id, name) {
        try {
          const todos = await API.adminUserTodos(id);
          const detail = content.querySelector('#userDetail');
          detail.innerHTML = `
            <div class="admin-section">
              <h3>📋 ${esc(name)} 的待办 (${todos.length}项)</h3>
              ${todos.length === 0 ? '<p style="color:var(--text-light)">暂无</p>' :
                `<div class="admin-content"><table class="admin-table"><thead><tr><th>ID</th><th>内容</th><th>优先级</th><th>分类</th><th>截止</th><th>完成</th><th>创建</th></tr></thead><tbody>
                  ${todos.map(t => `<tr>
                    <td>${t.id}</td><td>${esc(t.text)}</td>
                    <td><span class="tag tag-${t.priority}" style="font-size:10px">${t.priority}</span></td>
                    <td>${t.category||'-'}</td><td>${t.due_date||'-'}</td>
                    <td>${t.done ? '✅' : '⬜'}</td><td style="font-size:11px">${t.created_at||'-'}</td>
                  </tr>`).join('')}
                </tbody></table></div>`}
              <button class="btn-text" onclick="document.querySelector('#userDetail').innerHTML=''">← 关闭</button>
            </div>`;
        } catch(e) { showToast('加载失败', 'error'); }
      };

      window.adminToggleUser = async function(id) {
        try { const r = await API.adminToggleUser(id); showToast(`${r.disabled ? '已禁用' : '已启用'} ${r.username}`, 'success'); renderUsers(); }
        catch(e) { showToast(e.message, 'error'); }
      };

      window.adminResetPwd = async function(id) {
        if (!confirm('确定重置为默认密码 123456？')) return;
        try { const r = await API.adminResetPwd(id); showToast(`${r.username} 密码已重置为 ${r.new_password}`, 'success'); }
        catch(e) { showToast(e.message, 'error'); }
      };

      window.adminDeleteUser = async function(id, name) {
        if (!confirm(`确定删除用户 "${name}" 及其所有数据？不可恢复！`)) return;
        try { const r = await API.adminDeleteUser(id); showToast(`已删除 ${r.username}`, 'success'); renderUsers(); }
        catch(e) { showToast(e.message, 'error'); }
      };
    } catch(e) { showToast('加载失败', 'error'); }
  }

  // ===== Logs =====
  async function renderLogs() {
    content.innerHTML = `
      <div class="admin-section">
        <h3>📋 操作日志</h3>
        <div class="admin-content" id="logContent"><p style="color:var(--text-light)">加载中...</p></div>
      </div>`;
    try {
      const logs = await API.adminLogs();
      const el = content.querySelector('#logContent');
      el.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>时间</th><th>用户</th><th>操作</th><th>目标</th><th>详情</th></tr></thead>
          <tbody>${logs.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-light)">暂无日志</td></tr>' :
            logs.map(l => `<tr>
              <td style="white-space:nowrap;font-size:12px">${l.created_at||'-'}</td>
              <td>${esc(l.username||'-')}</td>
              <td>${esc(l.action)}</td>
              <td>${esc(l.target)}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.detail||'-')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <p style="font-size:12px;color:var(--text-light);margin-top:8px">共 ${logs.length} 条记录</p>`;
    } catch(e) { showToast('加载失败', 'error'); }
  }

  // ===== Announce =====
  function renderAnnounce() {
    content.innerHTML = `
      <div class="admin-section">
        <h3>📢 发布系统公告</h3>
        <div class="form-group"><label>公告标题</label><input type="text" class="form-input" id="annTitle" placeholder="公告标题"></div>
        <div class="form-group"><label>公告内容</label><textarea class="form-input" id="annContent" rows="4" placeholder="公告内容（可选）"></textarea></div>
        <button class="btn btn-primary" id="annBtn">📢 发布公告</button>
      </div>
      <div class="admin-section">
        <h3>📜 历史公告</h3>
        <div id="annList"><p style="color:var(--text-light)">加载中...</p></div>
      </div>`;

    content.querySelector('#annBtn').addEventListener('click', async () => {
      const title = content.querySelector('#annTitle').value.trim();
      const text = content.querySelector('#annContent').value.trim();
      if (!title) { showToast('标题不能为空', 'error'); return; }
      try {
        await API.adminAnnounce(title, text);
        showToast('公告已发布 ✅', 'success');
        content.querySelector('#annTitle').value = '';
        content.querySelector('#annContent').value = '';
        renderAnnounce();
      } catch(e) { showToast('发布失败', 'error'); }
    });

    (async () => {
      try {
        const notes = await API.adminNotifications();
        const el = content.querySelector('#annList');
        el.innerHTML = notes.length === 0 ? '<p style="color:var(--text-light)">暂无公告</p>' :
          notes.map(n => `
            <div style="padding:12px;border-bottom:1px solid var(--border-light)">
              <div style="font-weight:600;display:flex;justify-content:space-between">
                <span>📢 ${esc(n.title)}</span>
                <span style="font-size:12px;color:var(--text-light)">${n.created_at}</span>
              </div>
              ${n.content ? `<p style="font-size:13px;color:var(--text-secondary);margin-top:4px">${esc(n.content)}</p>` : ''}
            </div>
          `).join('');
      } catch(e) {}
    })();
  }

  // ===== Games =====
  async function renderGames() {
    content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)">加载中...</div>';
    try {
      const { stats, totals } = await API.adminGameStats();
      content.innerHTML = `
        <div class="admin-section">
          <h3>🎮 游戏数据总览</h3>
          <div class="dashboard-big-cards">
            ${totals.length === 0 ? '<p style="color:var(--text-light)">暂无游戏数据</p>' :
              totals.map(t => {
                const icons = { minesweeper: '💣', snake: '🐍', shooter: '🚀' };
                return `<div class="dashboard-big-card">
                  <div class="dashboard-big-num">${icons[t.game_type]||'🎮'}</div>
                  <div class="dashboard-big-label" style="font-weight:600">${t.game_type}</div>
                  <div style="font-size:12px;color:var(--text-light);margin-top:4px">
                    玩家 ${t.players} · 总局 ${t.total_games||0} · 胜利 ${t.total_wins||0}<br>
                    总时长 ${formatGameTime(t.total_play_time||0)} · 最高分 ${t.max_score||0}
                  </div>
                </div>`;
              }).join('')
            }
          </div>
        </div>

        <div class="admin-section">
          <h3>👤 玩家游戏数据明细</h3>
          <div style="overflow-x:auto;max-height:500px;overflow-y:auto">
            <table class="admin-table">
              <thead><tr>
                <th>用户名</th><th>游戏</th><th>最高分</th><th>总局数</th><th>胜利</th><th>时长</th><th>最佳用时</th><th>操作</th>
              </tr></thead>
              <tbody>
                ${stats.length === 0 ? '<tr><td colspan="8" style="text-align:center;color:var(--text-light)">暂无数据</td></tr>' :
                  stats.map(s => `
                    <tr>
                      <td><strong>${esc(s.nickname||s.username)}</strong></td>
                      <td>${s.game_type}</td>
                      <td><span style="font-weight:700;color:var(--primary)">${s.high_score||0}</span></td>
                      <td>${s.total_games||0}</td>
                      <td>${s.total_wins||0}</td>
                      <td>${formatGameTime(s.total_play_time||0)}</td>
                      <td>${s.best_time ? s.best_time+'s' : '-'}</td>
                      <td>
                        <button class="btn-sm btn-outline" onclick="adminResetGame(${s.user_id},'${s.game_type}')" style="font-size:10px">🔄 重置</button>
                      </td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="admin-section">
          <h3>维护操作</h3>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button class="btn btn-sm btn-danger" id="clearAllGamesBtn">🗑️ 清空全部游戏数据</button>
          </div>
        </div>
      `;

      window.adminResetGame = async (uid, game) => {
        if (!confirm('确定重置该用户的此游戏数据？不可恢复！')) return;
        try { await API.adminResetGame(uid, game); showToast('已重置', 'success'); renderGames(); }
        catch(e) { showToast(e.message, 'error'); }
      };

      content.querySelector('#clearAllGamesBtn').addEventListener('click', async () => {
        if (!confirm('确定清空所有游戏数据？不可恢复！')) return;
        try {
          const r = await API.adminClearAllGames();
          showToast(`已清空：记录${r.deleted_sessions}条，统计${r.deleted_stats}条`, 'success');
          renderGames();
        } catch(e) { showToast('操作失败', 'error'); }
      });
    } catch(e) { showToast('加载失败', 'error'); }
  }

  function formatGameTime(sec) {
    if (!sec) return '0m';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? m + 'm' + s + 's' : s + 's';
  }

  // ===== Export =====
  function renderExport() {
    content.innerHTML = `
      <div class="admin-section">
        <h3>📤 导出全部数据</h3>
        <p style="color:var(--text-light);font-size:14px;margin-bottom:16px">导出所有用户、待办、简历、备忘录和操作日志</p>
        <button class="btn btn-primary" id="exportAllBtn">📦 导出全部数据 (JSON)</button>
        <div id="exportPreview" style="margin-top:16px"></div>
      </div>`;
    content.querySelector('#exportAllBtn').addEventListener('click', async () => {
      try {
        const data = await API.adminExport();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ccc_export_${todayStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('导出成功 📤', 'success');
        const preview = content.querySelector('#exportPreview');
        preview.innerHTML = `<div class="admin-section" style="margin:16px 0 0"><p style="font-size:13px;color:var(--text-light);margin-bottom:8px">导出预览（前2000字符）</p><pre class="admin-json">${esc(json.slice(0, 2000))}</pre></div>`;
      } catch(e) { showToast('导出失败', 'error'); }
    });
  }
}
