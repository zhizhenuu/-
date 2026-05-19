function ProfilePage(container) {
  container.innerHTML = `
  <div class="page-enter">
    <h2 class="page-title">👤 个人中心</h2>
    <p class="page-sub">管理你的账户与偏好</p>

    <div class="profile-card">
      <div class="profile-avatar" id="avatarWrap">
        <span id="avatarLetter">?</span>
        <div class="avatar-overlay">📷 换头像</div>
      </div>
      <h3 id="displayName">-</h3>
      <div class="profile-meta">
        <span id="roleBadge"></span>
        <span id="levelBadge" class="level-badge level-1" style="margin-left:8px">⭐ Lv.1</span>
      </div>

      <div class="profile-stats" id="statsWrap">
        <div class="profile-stat-item">
          <div class="profile-stat-num" id="statTodos">-</div>
          <div class="profile-stat-label">待办数</div>
        </div>
        <div class="profile-stat-item">
          <div class="profile-stat-num" id="statDone">-</div>
          <div class="profile-stat-label">已完成</div>
        </div>
        <div class="profile-stat-item">
          <div class="profile-stat-num" id="statPoints">-</div>
          <div class="profile-stat-label">积分</div>
        </div>
        <div class="profile-stat-item">
          <div class="profile-stat-num" id="statStreak">-</div>
          <div class="profile-stat-label">连续签到</div>
        </div>
      </div>

      <button class="btn btn-success btn-sm" id="checkinBtn">📅 每日签到 +积分</button>
    </div>

    <!-- 设置 -->
    <div class="settings-section">
      <h3 style="font-size:16px;margin-bottom:12px">⚙️ 账户设置</h3>

      <div class="card">
        <div class="settings-row">
          <div>
            <div class="settings-label">昵称</div>
            <div class="settings-desc" id="nicknameDesc">点击修改</div>
          </div>
          <button class="btn btn-sm btn-outline" id="editNicknameBtn">修改</button>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-label">邮箱</div>
            <div class="settings-desc" id="emailDesc">用于找回密码</div>
          </div>
          <button class="btn btn-sm btn-outline" id="editEmailBtn">修改</button>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-label">修改密码</div>
            <div class="settings-desc">定期更换密码更安全</div>
          </div>
          <button class="btn btn-sm btn-outline" id="changePwdBtn">修改</button>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-label">🌙 深色模式</div>
            <div class="settings-desc">自动跟随系统或手动切换</div>
          </div>
          <button class="toggle ${App.theme === 'dark' ? 'on' : ''}" id="themeToggle"></button>
        </div>
      </div>
    </div>

    <!-- 积分排行 -->
    <div class="settings-section">
      <h3 style="font-size:16px;margin-bottom:12px">🏆 积分排行</h3>
      <div class="card" id="leaderboardContent">
        <p style="color:var(--text-light)">加载中...</p>
      </div>
    </div>

    <!-- 游戏战绩 -->
    <div class="settings-section">
      <h3 style="font-size:16px;margin-bottom:12px">🎮 我的游戏战绩</h3>
      <div class="card" id="gameStatsContent">
        <p style="color:var(--text-light)">加载中...</p>
      </div>
    </div>

    <!-- 注销 -->
    <div style="text-align:center;margin-top:24px">
      <button class="btn btn-sm btn-text danger" id="deleteAccountBtn">⚠️ 注销账号</button>
    </div>
  </div>`;

  const user = API.getUser();
  if (!user) return;

  // ===== Load =====
  loadProfile();

  async function loadProfile() {
    const letter = container.querySelector('#avatarLetter');
    const name = container.querySelector('#displayName');
    const badge = container.querySelector('#roleBadge');
    const levelBadge = container.querySelector('#levelBadge');
    const nicknameDesc = container.querySelector('#nicknameDesc');
    const emailDesc = container.querySelector('#emailDesc');

    letter.textContent = (user.nickname || user.username).charAt(0).toUpperCase();
    name.textContent = user.nickname ? `${user.nickname} (@${user.username})` : user.username;
    badge.innerHTML = user.is_admin
      ? '<span class="profile-badge badge-admin">🛡️ 管理员</span>'
      : '<span class="profile-badge badge-user">👤 用户</span>';
    nicknameDesc.textContent = user.nickname || '未设置';
    emailDesc.textContent = user.email || '未设置';

    // Level
    const lvl = getLevel(user.points || 0);
    levelBadge.textContent = `⭐ ${lvl.name}`;
    levelBadge.className = `level-badge level-${lvl.level}`;

    // Stats
    try {
      const overview = await API.todoOverview();
      container.querySelector('#statTodos').textContent = overview.total;
      container.querySelector('#statDone').textContent = overview.done;
    } catch {}
    container.querySelector('#statPoints').textContent = user.points || 0;
    container.querySelector('#statStreak').textContent = (user.streak_days || 0) + ' 天';

    // Checkin btn state
    const checkinBtn = container.querySelector('#checkinBtn');
    const today = todayStr();
    if (user.last_checkin === today) {
      checkinBtn.disabled = true;
      checkinBtn.textContent = '✅ 今日已签到';
    }

    // Leaderboard
    loadLeaderboard();
    // Game stats
    loadGameStats();
  }

  function getLevel(points) {
    if (points >= 500) return { level: 5, name: 'Lv.5 殿堂大神' };
    if (points >= 200) return { level: 4, name: 'Lv.4 效率达人' };
    if (points >= 80) return { level: 3, name: 'Lv.3 勤奋之星' };
    if (points >= 30) return { level: 2, name: 'Lv.2 进阶学徒' };
    return { level: 1, name: 'Lv.1 新手入门' };
  }

  async function loadLeaderboard() {
    const el = container.querySelector('#leaderboardContent');
    try {
      const top = await API.leaderboard();
      el.innerHTML = top.map((u, i) => `
        <div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-light);gap:10px">
          <span style="font-weight:700;color:${i < 3 ? ['#ffd700','#c0c0c0','#cd7f32'][i] : '#999'};width:24px">${i + 1}</span>
          <span style="flex:1;font-weight:${u.username === user.username ? '700' : '400'}">
            ${esc(u.nickname || u.username)}
            ${u.username === user.username ? '<span style="font-size:11px;color:var(--primary)">(你)</span>' : ''}
          </span>
          <span style="color:var(--primary);font-weight:600">${u.points} 分</span>
          <span style="font-size:12px;color:var(--text-light)">🔥 ${u.streak_days}天</span>
        </div>
      `).join('');
    } catch {
      el.innerHTML = '<p style="color:var(--text-light)">加载失败</p>';
    }
  }

  async function loadGameStats() {
    const el = container.querySelector('#gameStatsContent');
    try {
      const stats = await API.getGameStats();
      if (!stats || stats.length === 0) {
        el.innerHTML = '<p style="color:var(--text-light)">暂无游戏记录，去休闲娱乐玩一局吧 🎮</p>';
        return;
      }
      const icons = { minesweeper: '💣', snake: '🐍', shooter: '🚀' };
      const names = { minesweeper: '扫雷', snake: '贪吃蛇', shooter: '雷霆战机' };
      let totalTime = 0, totalGames = 0, totalWins = 0, maxScore = 0;
      stats.forEach(s => { totalTime += s.total_play_time || 0; totalGames += s.total_games || 0; totalWins += s.total_wins || 0; if ((s.high_score || 0) > maxScore) maxScore = s.high_score; });

      el.innerHTML = `
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-light)">
          <div style="text-align:center;min-width:80px">
            <div style="font-size:24px;font-weight:700;color:var(--primary)">${totalGames}</div>
            <div style="font-size:12px;color:var(--text-light)">总游玩局数</div>
          </div>
          <div style="text-align:center;min-width:80px">
            <div style="font-size:24px;font-weight:700;color:var(--success)">${totalWins}</div>
            <div style="font-size:12px;color:var(--text-light)">总胜利次数</div>
          </div>
          <div style="text-align:center;min-width:80px">
            <div style="font-size:24px;font-weight:700;color:var(--warning)">${maxScore}</div>
            <div style="font-size:12px;color:var(--text-light)">历史最高分</div>
          </div>
          <div style="text-align:center;min-width:80px">
            <div style="font-size:24px;font-weight:700;color:var(--info)">${formatTime(totalTime)}</div>
            <div style="font-size:12px;color:var(--text-light)">总游玩时长</div>
          </div>
        </div>
        <div class="game-profile-stats">
          ${stats.map(s => `
            <div class="game-stat-card" onclick="App.navigate('/games')">
              <div class="g">${icons[s.game_type]||'🎮'}</div>
              <div style="font-size:13px;font-weight:600;margin-bottom:4px">${names[s.game_type]||s.game_type}</div>
              <div class="v">${s.high_score||0}</div>
              <div class="l">最高分</div>
              <div style="font-size:11px;color:var(--text-light);margin-top:4px">
                ${s.total_games||0}局·${s.total_wins||0}胜<br>
                🕐 ${formatTime(s.total_play_time||0)}
                ${s.best_time ? '·⏱️ '+s.best_time+'s' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch {
      el.innerHTML = '<p style="color:var(--text-light)">加载失败</p>';
    }
  }

  function formatTime(sec) {
    if (!sec) return '0m';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? m + 'm ' + s + 's' : s + 's';
  }

  // ===== Events =====

  // Avatar upload
  container.querySelector('#avatarWrap').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        try {
          await API.updateAvatar(dataUrl);
          user.avatar = dataUrl;
          API.setUser(user);
          container.querySelector('#avatarLetter').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover">`;
          showToast('头像已更新 ✅', 'success');
        } catch(e) { showToast('更新失败', 'error'); }
      };
      reader.readAsDataURL(file);
    });
    input.click();
  });

  // Nickname
  container.querySelector('#editNicknameBtn').addEventListener('click', () => {
    const modal = openModal(`
      <div class="modal-header"><h3>修改昵称</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="form-group">
        <label>新昵称</label>
        <input type="text" class="form-input" id="nicknameInput" value="${esc(user.nickname || '')}" placeholder="输入昵称" maxlength="20">
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-sm btn-primary" id="saveNicknameBtn">保存</button>
      </div>
    `);
    modal.querySelector('#saveNicknameBtn').addEventListener('click', async () => {
      const n = modal.querySelector('#nicknameInput').value.trim();
      if (!n) { showToast('昵称不能为空', 'error'); return; }
      try {
        const r = await API.updateNickname(n);
        user.nickname = r.nickname;
        API.setUser(user);
        closeModal(modal);
        loadProfile();
        showToast('昵称已更新 ✅', 'success');
      } catch(e) { showToast(e.message, 'error'); }
    });
  });

  // Email
  container.querySelector('#editEmailBtn').addEventListener('click', () => {
    const modal = openModal(`
      <div class="modal-header"><h3>设置邮箱</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="form-group">
        <label>邮箱地址</label>
        <input type="email" class="form-input" id="emailInput" value="${esc(user.email || '')}" placeholder="your@email.com">
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-sm btn-primary" id="saveEmailBtn">保存</button>
      </div>
    `);
    modal.querySelector('#saveEmailBtn').addEventListener('click', async () => {
      const e = modal.querySelector('#emailInput').value.trim();
      try {
        const r = await API.updateEmail(e);
        user.email = r.email;
        API.setUser(user);
        closeModal(modal);
        loadProfile();
        showToast('邮箱已更新 ✅', 'success');
      } catch(e) { showToast(e.message, 'error'); }
    });
  });

  // Change password
  container.querySelector('#changePwdBtn').addEventListener('click', () => {
    const modal = openModal(`
      <div class="modal-header"><h3>修改密码</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="form-group"><label>当前密码</label><input type="password" class="form-input" id="oldPwdInput" placeholder="输入当前密码"></div>
      <div class="form-group"><label>新密码</label><input type="password" class="form-input" id="newPwdInput" placeholder="至少4位"></div>
      <div class="form-group"><label>确认新密码</label><input type="password" class="form-input" id="confirmPwdInput" placeholder="再次输入"></div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-sm btn-primary" id="savePwdBtn">保存</button>
      </div>
    `);
    modal.querySelector('#savePwdBtn').addEventListener('click', async () => {
      const old = modal.querySelector('#oldPwdInput').value;
      const np = modal.querySelector('#newPwdInput').value;
      const cp = modal.querySelector('#confirmPwdInput').value;
      if (!old || !np || !cp) { showToast('请填写所有字段', 'error'); return; }
      if (np !== cp) { showToast('两次密码不一致', 'error'); return; }
      if (np.length < 4) { showToast('密码至少4位', 'error'); return; }
      try {
        await API.updatePassword(old, np);
        closeModal(modal);
        showToast('密码已修改 ✅', 'success');
      } catch(e) { showToast(e.message, 'error'); }
    });
  });

  // Theme toggle
  container.querySelector('#themeToggle').addEventListener('click', function() {
    App.toggleTheme();
    this.classList.toggle('on');
  });

  // Checkin
  container.querySelector('#checkinBtn').addEventListener('click', async function() {
    try {
      const r = await API.checkin();
      user.points = r.points;
      user.streak_days = r.streak_days;
      user.last_checkin = todayStr();
      API.setUser(user);
      this.disabled = true;
      this.textContent = '✅ 今日已签到';
      container.querySelector('#statPoints').textContent = r.points;
      container.querySelector('#statStreak').textContent = r.streak_days + ' 天';
      showToast(`🎉 签到成功 +${r.earned}积分！连续${r.streak_days}天`, 'success');
      loadProfile();
    } catch(e) {
      if (e.message.includes('今日已签到')) {
        showToast('今日已签到', 'info');
        this.disabled = true;
        this.textContent = '✅ 今日已签到';
      } else {
        showToast('签到失败', 'error');
      }
    }
  });

  // Delete account
  container.querySelector('#deleteAccountBtn').addEventListener('click', () => {
    const modal = openModal(`
      <div class="modal-header"><h3>⚠️ 注销账号</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <p style="color:var(--danger);margin-bottom:16px">此操作不可恢复！所有数据（待办、简历、备忘录）将被永久删除。</p>
      <div class="form-group">
        <label>请输入密码确认</label>
        <input type="password" class="form-input" id="deleteConfirmPwd" placeholder="输入密码">
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-sm btn-danger" id="confirmDeleteBtn">确认注销</button>
      </div>
    `);
    modal.querySelector('#confirmDeleteBtn').addEventListener('click', async () => {
      const pwd = modal.querySelector('#deleteConfirmPwd').value;
      try {
        await API.updatePassword(pwd, 'deleting_temp');
        await API.deleteAccount();
        API.setToken(null); API.setUser(null);
        showToast('账号已注销', 'info');
        closeModal(modal);
        App.navigate('/login');
      } catch(e) { showToast('密码错误', 'error'); }
    });
  });
}
